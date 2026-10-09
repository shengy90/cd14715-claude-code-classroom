import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { CODE_QUALITY_ANALYZER_PROMPT } from '../prompts/code-quality-analyzer.prompt';

/** The caller must load project skills and connect the github/eslint MCP servers. */
export const codeQualityAnalyzer: AgentDefinition = {
  description:
    'Analyzes code files for security vulnerabilities, performance issues, ' +
    'and maintainability concerns. ' +
    'Use when reviewing source files or pull-request changes for code quality; ' +
    'returns actionable findings with severity, line numbers, and an overall score.',
  model: 'inherit',
  tools: [
    'Read', 'Glob', 'Grep', 'Skill',
    'mcp__github__get_file_contents',
    'mcp__github__search_code',
    'mcp__eslint__lint-files',
  ],
  prompt: CODE_QUALITY_ANALYZER_PROMPT,
};
