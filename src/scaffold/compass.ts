import type { ProjectConfig } from './types.js';

export function generateCompass(_config: ProjectConfig): string {
  return `# compass.md — local session waypoint (gitignored)
> Tracks sail progress across context clears. Each dev has their own copy.

## Branch
(none — on main)

## Stages
- [ ] Orientation
- [ ] Planning
- [ ] Execution
- [ ] Testing
- [ ] Quartermaster review

## Milestones
(filled in during planning)

## Notes
`;
}
