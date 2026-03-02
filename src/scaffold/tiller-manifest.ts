import { createRequire } from 'node:module';
import type { ProjectConfig } from './types.js';

declare const __PKG_VERSION__: string;
// __PKG_VERSION__ is injected by tsup/vitest define at build/test time.
// When running via tsx (scripts), fall back to reading package.json directly.
export const TILLER_VERSION: string =
  typeof __PKG_VERSION__ !== 'undefined'
    ? __PKG_VERSION__
    : createRequire(import.meta.url)('../../package.json').version;

export type TillerManifest = {
  version: string;
  mode: 'simple' | 'detailed';
  workflow?: 'solo' | 'team';
  runCommand: string;
  projectName?: string;
  description?: string;
  managedFiles?: string[];
};

export const MANAGED_FILES = [
  '.claude/TILLER.md',
  '.claude/settings.json',
  '.claude/hooks/post-write.sh',
  '.claude/hooks/secret-scan.sh',
  '.claude/skills/setup/SKILL.md',
  '.claude/skills/sail/SKILL.md',
  '.claude/skills/anchor/SKILL.md',
  '.claude/skills/recap/SKILL.md',
  '.claude/skills/dock/SKILL.md',
  '.claude/skills/tech-debt/SKILL.md',
  '.claude/skills/scout/SKILL.md',
  '.claude/agents/quartermaster.md',
  '.claude/agents/bosun.md',
  '.claude/agents/captain.md',
  '.claude/agents/cartographer.md',
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
