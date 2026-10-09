import * as dotenv from 'dotenv';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { Orchestrator } from './orchestrator.js';
import { ReportGenerator } from './utils/report-generator.js';

dotenv.config();

/** Usage: npm run dev -- <owner> <repo> <pr-number> */
async function main(): Promise<void> {
  try {
    // 1. Validate command-line arguments.
    const args = process.argv.slice(2);
    const [owner, repo, prStr] = args.map(arg => arg.trim());

    if (args.length !== 3 || !owner || !repo || !prStr) {
      throw new Error(
        'Provide owner, repo, and PR number.\n' +
        'Usage: npm run dev -- <owner> <repo> <pr-number>'
      );
    }

    const prNumber = Number(prStr);
    if (!/^\d+$/.test(prStr) || !Number.isSafeInteger(prNumber) || prNumber < 1) {
      throw new Error('PR number must be a positive safe integer, such as 123.');
    }

    // 2. Validate authentication. Prefer the API key when both are configured.
    if (process.env.ANTHROPIC_API_KEY?.trim()) {
      process.env.CLAUDE_CODE_USE_BEDROCK = '0';
      console.log('🔐 Using Anthropic API authentication');
    } else if (
      process.env.AWS_ACCESS_KEY_ID?.trim() &&
      process.env.AWS_SECRET_ACCESS_KEY?.trim()
    ) {
      if (!process.env.AWS_REGION?.trim()) {
        throw new Error('Set AWS_REGION for AWS Bedrock, such as us-east-1.');
      }
      process.env.CLAUDE_CODE_USE_BEDROCK = '1';
      console.log('🔐 Using AWS Bedrock authentication');
    } else {
      throw new Error(
        'Configure one authentication method:\n' +
        '  Anthropic API: set ANTHROPIC_API_KEY.\n' +
        '  AWS Bedrock: set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, ' +
        'and AWS_REGION.'
      );
    }

    // 3. Validate the model configuration.
    const model = process.env.ANTHROPIC_MODEL?.trim();
    if (!model) {
      throw new Error(
        'Set ANTHROPIC_MODEL for your authentication method:\n' +
        '  Bedrock: us.anthropic.claude-sonnet-4-5-20250929-v1:0\n' +
        '  Anthropic API: claude-sonnet-4-5-20250929'
      );
    }

    // 4. Run the review.
    const orchestrator = new Orchestrator({ model });
    console.log(`Reviewing ${owner}/${repo} PR #${prNumber}...`);
    const report = await orchestrator.reviewPullRequest(owner, repo, prNumber);

    // 5. Generate and save all three reports.
    const generator = new ReportGenerator();
    const reports = [
      ['md', generator.generateMarkdownReport(report)],
      ['html', generator.generateHTMLReport(report)],
      ['json', generator.generateJSONReport(report)],
    ] as const;

    const directory = resolve('reports');
    // Sanitize the filename to keep reports inside the output directory.
    const basename = `${owner}-${repo}-pr-${prNumber}`
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    await mkdir(directory, { recursive: true });

    for (const [extension, content] of reports) {
      const filename = join(directory, `${basename}.${extension}`);
      await writeFile(filename, content, 'utf8');
      console.log(`Saved report: ${filename}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exitCode = 1;
  }
}

void main();
