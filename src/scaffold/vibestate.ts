import type { ProjectConfig } from './types.js';

export function generateVibestate(config: ProjectConfig): string {
  const today = new Date().toISOString().split('T')[0];
  return `# vibestate.md — ${config.projectName}

> This file tracks project state. Updated by /snapshot and /land.

## Active feature

None — on main, ready to start something.

## Done

- [${today}] v0 — initial scaffold

## Notes

<!-- Add context, gotchas, decisions here -->
`;
}
