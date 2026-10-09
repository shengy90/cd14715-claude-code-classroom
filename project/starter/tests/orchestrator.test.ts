import { afterEach, describe, expect, it, vi } from 'vitest';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { Orchestrator } from '../src/orchestrator';
import { mcpServersConfig } from '../src/config/mcp.config';
import { globalRateLimiter } from '../src/utils/rate-limiter';
import type { ReviewReport } from '../src/types';

vi.mock('@anthropic-ai/claude-agent-sdk', () => ({ query: vi.fn() }));
vi.mock('../src/config/mcp.config', () => ({
  mcpServersConfig: { github: { type: 'http', url: 'https://github-mcp.test' } },
}));
vi.mock('../src/utils/rate-limiter', async importOriginal => ({
  ...await importOriginal<typeof import('../src/utils/rate-limiter')>(),
  globalRateLimiter: { acquire: vi.fn().mockResolvedValue(undefined), release: vi.fn() },
}));

const report: ReviewReport = {
  pullRequest: { owner: 'octocat', repo: 'Hello-World', number: 1 },
  fileReviews: [],
  summary: {
    totalFiles: 0, overallScore: 0, criticalIssues: 0,
    highPriorityTests: 0, refactoringOpportunities: 0,
  },
  recommendations: [],
  metadata: { analyzedAt: 'unknown', duration: 0, agentVersions: {} },
};

function mockResult(result: Record<string, unknown>) {
  vi.mocked(query).mockReturnValue((async function* () {
    yield { type: 'result', ...result };
  })() as ReturnType<typeof query>);
}

describe('Orchestrator', () => {
  afterEach(() => vi.clearAllMocks());

  it('returns a successful review using mocked MCP configuration', async () => {
    mockResult({ subtype: 'success', is_error: false, duration_ms: 123, structured_output: report });
    const result = await new Orchestrator({ model: 'test-model' })
      .reviewPullRequest('octocat', 'Hello-World', 1);

    expect(query).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({ mcpServers: mcpServersConfig }),
    }));
    expect(result).toEqual({ ...report, metadata: {
      ...report.metadata, analyzedAt: expect.any(String), duration: 123,
    } });
    expect(globalRateLimiter.acquire).toHaveBeenCalledWith(1000);
    expect(globalRateLimiter.release).toHaveBeenCalledOnce();
  });

  it('propagates review failures and releases the rate limiter', async () => {
    mockResult({ subtype: 'error_max_turns', errors: ['Turn limit reached'] });
    await expect(new Orchestrator({ model: 'test-model' })
      .reviewPullRequest('octocat', 'Hello-World', 1))
      .rejects.toThrow('Review failed (error_max_turns): Turn limit reached');
    expect(globalRateLimiter.release).toHaveBeenCalledOnce();
  });
});
