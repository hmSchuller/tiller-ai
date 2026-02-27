import type { ProjectConfig } from './types.js';

export const MANAGED_FILES = [
  '.claude/CLAUDE.md',
  '.claude/settings.json',
  '.claude/hooks/post-write.sh',
  '.claude/hooks/secret-scan.sh',
  '.claude/skills/setup/SKILL.md',
  '.claude/skills/vibe/SKILL.md',
  '.claude/skills/snapshot/SKILL.md',
  '.claude/skills/recap/SKILL.md',
  '.claude/skills/land/SKILL.md',
];

export function generateTillerManifest(config: ProjectConfig, version: string): string {
  const manifest = {
    version,
    mode: config.mode,
    workflow: config.workflow,
    runCommand: config.runCommand,
    managedFiles: MANAGED_FILES,
  };

  return JSON.stringify(manifest, null, 2);
}
