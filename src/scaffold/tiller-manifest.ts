import { createRequire } from 'node:module';
import type { ProjectConfig, ToolTarget } from './types.js';

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
  tools?: ToolTarget[];
  managedFiles?: string[];
};

const SHARED_MANAGED_FILES = [
  '.tiller/TILLER.md',
  '.tiller/bin/register-agent.py',
  '.tiller/bin/complete-agent.py',
];

const CLAUDE_MANAGED_FILES = [
  '.claude/settings.json',
  '.claude/hooks/post-write.sh',
  '.claude/hooks/secret-scan.sh',
  '.claude/hooks/session-resume.sh',
  '.claude/hooks/plan-context.sh',
  '.claude/skills/setup/SKILL.md',
  '.claude/skills/sail/SKILL.md',
  '.claude/skills/anchor/SKILL.md',
  '.claude/skills/recap/SKILL.md',
  '.claude/skills/dock/SKILL.md',
  '.claude/skills/tech-debt/SKILL.md',
  '.claude/skills/scout/SKILL.md',
  '.claude/skills/repair-hull/SKILL.md',
  '.claude/agents/quartermaster.md',
  '.claude/agents/bosun.md',
  '.claude/agents/captain.md',
  '.claude/agents/cartographer.md',
];

const OPENCODE_MANAGED_FILES = [
  'AGENTS.md',
  'opencode.json',
  '.opencode/agents/quartermaster.md',
  '.opencode/agents/bosun.md',
  '.opencode/agents/captain.md',
  '.opencode/agents/cartographer.md',
];

const COPILOT_MANAGED_FILES = [
  '.github/copilot-instructions.md',
  '.github/skills/setup/SKILL.md',
  '.github/skills/sail/SKILL.md',
  '.github/skills/anchor/SKILL.md',
  '.github/skills/recap/SKILL.md',
  '.github/skills/dock/SKILL.md',
  '.github/skills/tech-debt/SKILL.md',
  '.github/skills/scout/SKILL.md',
  '.github/skills/repair-hull/SKILL.md',
  '.github/agents/quartermaster.agent.md',
  '.github/agents/bosun.agent.md',
  '.github/agents/captain.agent.md',
  '.github/agents/cartographer.agent.md',
  '.github/hooks/hooks.json',
  '.github/hooks/post-write.sh',
  '.github/hooks/secret-scan.sh',
  '.github/hooks/session-resume.sh',
  '.github/hooks/session-log.sh',
  '.github/hooks/inbox-check.sh',
];

/** Skills are placed in .claude/skills/ when Claude is selected (OpenCode reads them too).
 *  When only OpenCode (no Claude), skills go to .opencode/skills/ instead. */
const OPENCODE_ONLY_SKILL_FILES = [
  '.opencode/skills/setup/SKILL.md',
  '.opencode/skills/sail/SKILL.md',
  '.opencode/skills/anchor/SKILL.md',
  '.opencode/skills/recap/SKILL.md',
  '.opencode/skills/dock/SKILL.md',
  '.opencode/skills/tech-debt/SKILL.md',
  '.opencode/skills/scout/SKILL.md',
  '.opencode/skills/repair-hull/SKILL.md',
];

export function getManagedFiles(tools: ToolTarget[]): string[] {
  const files = [...SHARED_MANAGED_FILES];

  if (tools.includes('claude')) {
    files.push(...CLAUDE_MANAGED_FILES);
  }

  if (tools.includes('opencode')) {
    files.push(...OPENCODE_MANAGED_FILES);
    // If Claude is NOT selected, skills go to .opencode/skills/
    if (!tools.includes('claude')) {
      files.push(...OPENCODE_ONLY_SKILL_FILES);
    }
  }

  if (tools.includes('copilot')) {
    files.push(...COPILOT_MANAGED_FILES);
  }

  return files;
}

/**
 * Static MANAGED_FILES for backward compatibility.
 * Used by upgrade command when reading old manifests that don't have tools field.
 * Defaults to Claude-only managed files.
 */
export const MANAGED_FILES = getManagedFiles(['claude']);

export function generateTillerManifest(config: ProjectConfig, version: string): string {
  const tools = config.tools ?? ['claude'];
  const manifest = {
    version,
    mode: config.mode,
    workflow: config.workflow,
    runCommand: config.runCommand,
    tools,
    managedFiles: getManagedFiles(tools),
  };

  return JSON.stringify(manifest, null, 2);
}
