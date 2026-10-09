---
name: security-analysis
description: Review source code for security vulnerabilities, tracing untrusted input, authorization boundaries, and sensitive data during code quality analysis.
---

# Security analysis

Trace untrusted input from entry points to sensitive operations. Inspect callers
and sanitization before concluding that a dangerous operation is exploitable.

- Injection: check SQL parameterization, shell argument handling, dynamic code
  execution, and context-appropriate escaping for HTML output.
- Access control: verify authentication and resource ownership checks at the
  operation, including cross-tenant access and privilege changes.
- File and network boundaries: check path traversal, upload validation, SSRF,
  redirects, and whether destinations are constrained after normalization.
- Sensitive data: inspect logging, error responses, credentials in source,
  password storage, and cryptographic randomness. Do not reproduce secret values.
- Integrity and availability: inspect unsafe deserialization, prototype pollution,
  unbounded input, expensive regular expressions, and missing resource limits.

For each supported finding, identify the source line, attack prerequisite,
impact, and a specific mitigation. Distinguish observed vulnerability from a
conditional risk; state missing context instead of inventing exploitability.
Do not execute payloads, modify source, or claim that linting proves security.
Return findings using the invoking agent's output schema and severity vocabulary.
