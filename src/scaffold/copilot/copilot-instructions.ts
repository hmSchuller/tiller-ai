import type { ProjectConfig } from '../types.js';

export function generateCopilotInstructions(_config: ProjectConfig): string {
  return `# Tiller — Project Standards

## Configuration

Read \`.tiller/tiller.json\` (or \`.tiller/local.json\` if present) at the start of every session for mode and workflow settings.

## Modes

- **simple** — short, outcome-focused communication. Do not narrate steps or explain decisions unless asked.
- **detailed** — narrate what you're doing and why. Surface trade-offs before making them.

## Workflows

- **solo** — merge feature branches directly to main.
- **team** — push the feature branch and open a PR. Merging happens on GitHub after review and CI.

## File discipline

- Never commit directly to main
- Always work on a feature branch (\`feature/<name>\` or \`fix/<name>\`)
- Run the verify command before every commit
- \`changelog.md\` is committed and shared — it tracks the project's done log
- \`.tiller/compass.md\` tracks per-session progress — read it at session start to resume without losing state

## Code quality

Every change must be production-ready:

- No dead code, commented-out blocks, or obvious duplication
- No unhandled promise rejections, missing \`await\`, or unsafe type assertions
- No hardcoded secrets, unvalidated inputs, or injection vectors
- New patterns must match how the rest of the codebase works
- Keep commits atomic and descriptive

## Testing

Tests are not optional — every feature or fix must ship with tests that verify it works.

**Prefer end-to-end tests over unit tests.** E2e tests exercise real user flows and catch integration failures that unit tests miss. Unit tests are still appropriate for pure logic, edge cases, and utilities — but do not substitute them for e2e coverage.

A good test suite answers: "Does this feature actually work from the user's perspective?"

- Write e2e tests that cover the primary success path and key failure paths
- Do not ship a feature without at least one e2e test that would catch a regression
- Unit tests complement e2e — use them for tricky logic, not as a substitute for real coverage
`;
}
