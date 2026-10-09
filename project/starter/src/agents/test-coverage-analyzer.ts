import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { TEST_COVERAGE_ANALYZER_PROMPT } from '../prompts/test-coverage-analyzer.prompt';

export const testCoverageAnalyzer: AgentDefinition = {
  description:
    'Evaluates test completeness by comparing source files with existing tests. ' +
    'Use when reviewing source files or pull-request changes for missing tests; ' +
    'returns prioritized test cases and a static coverage estimate.',
  model: 'inherit',
  tools: [
    'Read',
    'Glob',
    'Grep',
    'mcp__github__get_file_contents',
    'mcp__github__search_code',
  ],
  prompt: TEST_COVERAGE_ANALYZER_PROMPT,
};
