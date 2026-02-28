import type { ProjectConfig } from './types.js';

export function generateCompass(_config: ProjectConfig): string {
  return `# compass.md — local only, do not commit

> Tracks your active feature work. Gitignored — each dev has their own copy.

## Active feature

None — on main, ready to start something.

## Notes

<!-- Add context, gotchas, decisions here -->
`;
}
