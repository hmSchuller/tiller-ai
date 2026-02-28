import type { ProjectConfig } from './types.js';

export function generateTechBacklog(config: ProjectConfig): string {
  return `# tech-backlog.md — ${config.projectName}

> Maintained by the Bosun agent. Committed and shared — tracks the project's known tech debt.
> Severities: [critical] correctness/security | [major] quality/consistency | [minor] clutter/readability

## Backlog

<!-- Bosun will populate this as it finds issues -->

## Done

<!-- Items fixed by the Bosun are moved here with a [done YYYY-MM-DD] tag -->
`;
}
