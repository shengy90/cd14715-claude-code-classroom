import { query } from '@anthropic-ai/claude-agent-sdk';
import { fileURLToPath } from 'node:url';
import { codeQualityAnalyzer, testCoverageAnalyzer, refactoringSuggester } from './agents';
import { ORCHESTRATOR_PROMPT } from './prompts';
import { mcpServersConfig } from './config/mcp.config';
import { ReviewReportSchema, ReviewReportJSONSchema } from './types';
import type { ReviewReport } from './types';
import { RateLimiter, globalRateLimiter, withRateLimit } from './utils';
import type { RateLimiterConfig } from './utils';

export interface OrchestratorOptions {
  model?: string;
  projectRoot?: string;
  maxTurns?: number;
  rateLimits?: Partial<RateLimiterConfig>;
  /** Estimated total tokens for one SDK review, including its subagents. */
  estimatedTokensPerReview?: number;
}

export class Orchestrator {
  private readonly rateLimiter: RateLimiter;

  constructor(private readonly options: OrchestratorOptions = {}) {
    this.rateLimiter = options.rateLimits
      ? new RateLimiter(options.rateLimits)
      : globalRateLimiter;
  }

  async reviewPullRequest(owner: string, repo: string, prNumber: number): Promise<ReviewReport> {
    const model = this.options.model ?? process.env.ANTHROPIC_MODEL;
    // Both src/orchestrator.ts and dist/orchestrator.js sit one level below starter.
    const cwd = this.options.projectRoot ?? fileURLToPath(new URL('../', import.meta.url));
    if (!model?.trim() || !cwd?.trim()) {
      throw new Error('Set ANTHROPIC_MODEL or provide a model option; projectRoot must not be empty.');
    }
    if (!owner.trim() || !repo.trim() || !Number.isSafeInteger(prNumber) || prNumber < 1) {
      throw new Error('Provide owner, repo, and a positive integer PR number.');
    }

    return withRateLimit(
      this.rateLimiter,
      () => this.runReview(owner, repo, prNumber, model, cwd),
      this.options.estimatedTokensPerReview ?? 1000,
    );
  }

  private async runReview(
    owner: string, repo: string, prNumber: number, model: string, cwd: string,
  ): Promise<ReviewReport> {
    const builtInTools = ['Task', 'Read', 'Glob', 'Grep', 'Skill'];
    const stream = query({
      prompt: `Review pull request ${JSON.stringify({ owner, repo, number: prNumber })}.
Use all three named subagents explicitly for each reviewable changed source file.
Return the aggregated ReviewReport. The caller will supply measured timing metadata.`,
      options: {
        model,
        cwd,
        maxTurns: this.options.maxTurns ?? 100,
        systemPrompt: ORCHESTRATOR_PROMPT,
        settingSources: ['project'],
        agents: {
          'code-quality-analyzer': codeQualityAnalyzer,
          'test-coverage-analyzer': testCoverageAnalyzer,
          'refactoring-suggester': refactoringSuggester,
        },
        allowedTools: [
          ...builtInTools,
          'mcp__github__pull_request_read',
          'mcp__github__get_file_contents',
          'mcp__github__search_code',
          'mcp__eslint__lint-files',
        ],
        permissionMode: 'dontAsk',
        mcpServers: mcpServersConfig,
        outputFormat: { type: 'json_schema', schema: ReviewReportJSONSchema },
      },
    });

    const subagents = new Map<string, string>();

    for await (const message of stream) {
      if (message.type === 'assistant') {
        for (const block of message.message.content) {
          if (block.type !== 'tool_use') continue;

          const input = block.input as Record<string, unknown>;
          if (block.name === 'Task' || block.name === 'Agent') {
            subagents.set(block.id, String(input.subagent_type ?? 'unknown'));
          }

          console.log('[tool]', {
            name: block.name,
            id: block.id,
            parent: message.parent_tool_use_id,
            agent: message.parent_tool_use_id
              ? subagents.get(message.parent_tool_use_id) ?? 'unknown subagent'
              : 'orchestrator',
            invokedSubagent: subagents.get(block.id),
          });
        }
      }

      if (message.type !== 'result') continue;
      if (message.subtype !== 'success') {
        throw new Error(`Review failed (${message.subtype}): ${message.errors.join('; ')}`);
      }
      if (message.is_error || message.structured_output === undefined) {
        throw new Error('Review did not return successful structured output.');
      }
      const parsed = ReviewReportSchema.safeParse(message.structured_output);
      if (!parsed.success) {
        throw new Error(`Invalid review report: ${parsed.error.message}`);
      }
      const report = parsed.data;
      report.metadata.analyzedAt = new Date().toISOString();
      report.metadata.duration = message.duration_ms;
      return report;
    }

    throw new Error('Review ended without a final result.');
  }
}
