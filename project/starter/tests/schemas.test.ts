import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  CodeQualityResultSchema, CodeQualityResultJSONSchema,
  TestCoverageResultSchema,
  RefactoringSuggestionSchema,
  ReviewReportSchema,
} from '../src/types';

// Match the production adapter for the separately resolved Zod type definitions.
const toJsonSchema = zodToJsonSchema as (
  schema: unknown,
  options?: { $refStrategy: 'root' },
) => Record<string, unknown>;

// Shared fixtures reused by the individual tests below.
const issue = {
  line: 1,
  severity: 'high',
  category: 'security',
  description: 'Unsafe input',
  suggestion: 'Validate input',
};
const untestedPath = {
  type: 'branch',
  location: 'line 1',
  priority: 'high',
  reasoning: 'Uncovered branch',
  suggestedTest: 'Test false branch',
};
const suggestion = {
  type: 'rename',
  location: 'line 1',
  impact: 'low',
  description: 'Clarify name',
  before: 'x',
  after: 'count',
  benefits: 'Readability',
};
const codeQuality = {
  file: 'src/example.ts',
  issues: [issue],
  overallScore: 80,
  summary: 'One issue',
};
const testCoverage = {
  file: 'src/example.ts',
  hasTests: true,
  testFiles: ['tests/example.test.ts'],
  untestedPaths: [untestedPath],
  coverageEstimate: 80,
  summary: 'Partial coverage',
};
const refactorings = {
  file: 'src/example.ts',
  suggestions: [suggestion],
  summary: 'One suggestion',
};
const recommendation = {
  priority: 'high',
  category: 'security',
  description: 'Validate input',
  files: ['src/example.ts'],
};
const fileReview = { file: 'src/example.ts', codeQuality, testCoverage, refactorings };
const report = {
  pullRequest: { owner: 'owner', repo: 'repo', number: 1 },
  fileReviews: [fileReview],
  summary: {
    totalFiles: 1,
    overallScore: 80,
    criticalIssues: 0,
    highPriorityTests: 1,
    refactoringOpportunities: 1,
  },
  recommendations: [recommendation],
  metadata: {
    analyzedAt: '2026-10-09T12:00:00Z',
    duration: 100,
    agentVersions: { quality: '1.0' },
  },
};

// No production fields are optional; derive a schema for optional-field coverage.
const optionalSummarySchema = CodeQualityResultSchema.partial({ summary: true });
const { summary, ...withoutSummary } = codeQuality;

// Requirement 1: Valid data
describe('Requirement 1: Valid data', () => {
  it('accepts valid code quality', () => {
    expect(() => CodeQualityResultSchema.parse(codeQuality)).not.toThrow();
  });

  it('accepts valid test coverage', () => {
    expect(() => TestCoverageResultSchema.parse(testCoverage)).not.toThrow();
  });

  it('accepts valid refactoring suggestions', () => {
    expect(() => RefactoringSuggestionSchema.parse(refactorings)).not.toThrow();
  });

  it('accepts valid review reports', () => {
    expect(() => ReviewReportSchema.parse(report)).not.toThrow();
  });
});

// Requirement 2: Invalid data
describe('Requirement 2: Invalid data', () => {
  it('rejects a wrong type in code quality', () => {
    expect(() => CodeQualityResultSchema.parse(
      { ...codeQuality, overallScore: '80' },
    )).toThrow(ZodError);
  });

  it('rejects a missing required field in test coverage', () => {
    const { file, ...incomplete } = testCoverage;
    expect(() => TestCoverageResultSchema.parse(incomplete)).toThrow(ZodError);
  });

  it('rejects an invalid refactoring type', () => {
    const invalid = { ...refactorings, suggestions: [{ ...suggestion, type: 'unknown' }] };
    expect(() => RefactoringSuggestionSchema.parse(invalid)).toThrow(ZodError);
  });

  it('rejects an invalid recommendation priority', () => {
    const invalid = { ...report, recommendations: [{ ...recommendation, priority: 'urgent' }] };
    expect(() => ReviewReportSchema.parse(invalid)).toThrow(ZodError);
  });
});

// Requirement 3: Edge cases
describe('Requirement 3: Edge cases', () => {
  it('accepts an empty issues array', () => {
    expect(() => CodeQualityResultSchema.parse({ ...codeQuality, issues: [] })).not.toThrow();
  });

  it('accepts overallScore of 0', () => {
    expect(() => CodeQualityResultSchema.parse({ ...codeQuality, overallScore: 0 })).not.toThrow();
  });

  it('accepts overallScore of 100', () => {
    expect(() => CodeQualityResultSchema.parse(
      { ...codeQuality, overallScore: 100 },
    )).not.toThrow();
  });

  it('accepts an optional summary when present', () => {
    expect(() => optionalSummarySchema.parse(codeQuality)).not.toThrow();
  });

  it('accepts an optional summary when absent', () => {
    expect(() => optionalSummarySchema.parse(withoutSummary)).not.toThrow();
  });
});

// Requirement 4: JSON Schema export
describe('Requirement 4: JSON Schema export', () => {
  it('exports a serializable JSON Schema for code quality', () => {
    const json = toJsonSchema(CodeQualityResultSchema, { $refStrategy: 'root' });
    expect(json).toEqual(CodeQualityResultJSONSchema);
    expect(JSON.parse(JSON.stringify(json))).toEqual(json);
    expect(json).toMatchObject({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
    });
  });

  it('marks required properties for code quality', () => {
    expect(CodeQualityResultJSONSchema.required).toEqual([
      'file',
      'issues',
      'overallScore',
      'summary',
    ]);
  });

  it('omits optional summary from required properties', () => {
    const json = toJsonSchema(optionalSummarySchema);
    expect(json).toMatchObject({
      required: ['file', 'issues', 'overallScore'],
      properties: { summary: { type: 'string' } },
    });
  });
});
