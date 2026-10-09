# Code quality analyzer

Import `codeQualityAnalyzer` from `src/agents/index.ts` and register it under
`agents: { 'code-quality-analyzer': codeQualityAnalyzer }` in the calling query.
Set `cwd` to the absolute `starter` directory and `settingSources: ['project']`
so the SDK discovers `.claude/skills/`. Allow `Skill` and the subagent invocation
tool in the main session, and pass `mcpServersConfig` as `mcpServers`.
The invocation tool is named `Task` in older SDK releases and `Agent` in current
releases. Keep the configured MCP server names `github` and `eslint`, since they
are part of the analyzer's tool names.

The prompt invokes `security-analysis` on every review and
`javascript-best-practices` for JavaScript and TypeScript. It uses prompt-based
invocation for compatibility with this project's SDK dependency rather than
depending on newer skill-preloading options. `model: 'inherit'` follows the main
session's model selection.

Pass the requested file path, source (or repository owner/name and PR head SHA),
and relevant review context in the delegated task. ESLint needs a matching local
file, absolute paths, an installed ESLint, and applicable project configuration;
it cannot lint GitHub content directly. Unavailable skills or lint results are
disclosed in the result summary.

Parse the final JSON and validate it with `CodeQualityResultSchema` before
aggregation. Embedding `CodeQualityResultJSONSchema` in the prompt guides output
but does not itself provide runtime validation. The score is a review heuristic,
not a measured performance or security metric. The orchestrator remains a stub;
this change supplies the agent definition, not the full review pipeline.

References:
- https://code.claude.com/docs/en/agent-sdk/subagents
- https://code.claude.com/docs/en/agent-sdk/skills
- https://github.com/github/github-mcp-server
- https://eslint.org/docs/latest/use/mcp
