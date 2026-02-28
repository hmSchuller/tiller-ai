import type { ProjectConfig } from './types.js';

export function generateChangelog(config: ProjectConfig): string {
  const today = new Date().toISOString().split('T')[0];
  return `# changelog.md — ${config.projectName}

> Shared project history. Updated by /sail, /anchor, and /dock. Committed and shared.

## Done

- [${today}] v0 — initial scaffold
`;
}
