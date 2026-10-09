import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { REFACTORING_SUGGESTER_PROMPT } from '../prompts/refactoring-suggester.prompt';

export const refactoringSuggester: AgentDefinition = {
  description:
    'Identifies behavior-preserving improvements to code structure and patterns. ' +
    'Use when reviewing source files or pull-request changes for clearer naming, ' +
    'simplification, function extraction, modernization, or reduced coupling; ' +
    'returns concrete before/after examples and benefits.',
  model: 'inherit',
  tools: [
    'Read',
    'Glob',
    'Grep',
    'Skill',
    'mcp__github__get_file_contents',
    'mcp__github__search_code',
  ],
  prompt: REFACTORING_SUGGESTER_PROMPT,
};
