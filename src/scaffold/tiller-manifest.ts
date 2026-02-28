import type { ProjectConfig } from './types.js';

export const TILLER_VERSION = '0.2.0';

export type TillerManifest = {
  version: string;
  mode: 'simple' | 'detailed';
  workflow?: 'solo' | 'team';
  runCommand: string;
  projectName?: string;
  description?: string;
};

export const MANAGED_FILES = [
  '.claude/CLAUDE.md',
  '.claude/settings.json',
  '.claude/hooks/post-write.sh',
  '.claude/hooks/secret-scan.sh',
  '.claude/skills/setup/SKILL.md',
  '.claude/skills/sail/SKILL.md',
  '.claude/skills/anchor/SKILL.md',
  '.claude/skills/recap/SKILL.md',
  '.claude/skills/dock/SKILL.md',
  '.claude/skills/tech-debt/SKILL.md',
  '.claude/agents/quartermaster.md',
  '.claude/agents/bosun.md',
  '.claude/agents/captain.md',
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
