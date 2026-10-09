/**
 * Model Context Protocol (MCP) server configurations
 *
 * Required MCP Servers:
 * 1. GitHub - For PR/repo operations
 * 2. ESLint - For code linting and style analysis
 *
 * Documentation:
 * - MCP Protocol: https://modelcontextprotocol.io
 * - GitHub MCP: https://github.com/github/github-mcp-server
 * - ESLint MCP: https://eslint.org/docs/latest/use/mcp
 */

import 'dotenv/config';

export const mcpServersConfig = {
  /**
   * GitHub MCP Server
   * Provides tools for GitHub API operations
   *
   * Connects to GitHub's official hosted server over HTTP.
   * Set GITHUB_TOKEN in .env to a GitHub personal access token.
   * The remote server authenticates through an Authorization header.
   */
  github: {
    type: 'http' as const,
    url: 'https://api.githubcopilot.com/mcp/',
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN || ''}`,
      'X-MCP-Readonly': 'true'
    }
  },

  /**
   * ESLint MCP Server
   * Provides tools for linting and code quality analysis
   *
   * Runs locally over stdio; no authentication is required.
   */
  eslint: {
    type: 'stdio' as const,
    command: 'npx',
    args: ['-y', '@eslint/mcp@latest'],
    env: {}
  }
};
