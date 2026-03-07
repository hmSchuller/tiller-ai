import { readFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { writeFile } from '../utils/fs.js';
import { generatePostWriteHook } from './hooks/post-write.js';
import { generateSecretScanHook } from './hooks/secret-scan.js';
import { generateSessionResumeHook } from './hooks/session-resume.js';
import { generatePlanContextHook } from './hooks/plan-context.js';
import { generateSessionLogHook } from './hooks/session-log.js';
import { generateInboxCheckHook } from './hooks/inbox-check.js';

import { generateSetupSkill } from './skills/setup.js';
import { generateSailSkill } from './skills/sail.js';
import { generateAnchorSkill } from './skills/anchor.js';
import { generateRecapSkill } from './skills/recap.js';
import { generateDockSkill } from './skills/dock.js';
import { generateTechDebtSkill } from './skills/tech-debt.js';
import { generateScoutSkill } from './skills/scout.js';
import { generateRepairHullSkill } from './skills/repair-hull.js';
import { generateTillerMd } from './claude-md.js';
import { generateSettingsJson } from './settings-json.js';
import { generateQuartermasterAgent } from './agents/quartermaster.js';
import { generateBosunAgent } from './agents/bosun.js';
import { generateCaptainAgent } from './agents/captain.js';
import { generateCartographerAgent } from './agents/cartographer.js';
import { generateAgentsMd } from './opencode/agents-md.js';
import { generateOpenCodeJson } from './opencode/opencode-json.js';
import { generateOCQuartermasterAgent } from './opencode/agents/quartermaster.js';
import { generateOCBosunAgent } from './opencode/agents/bosun.js';
import { generateOCCaptainAgent } from './opencode/agents/captain.js';
import { generateOCCartographerAgent } from './opencode/agents/cartographer.js';
import { generateCopilotInstructions } from './copilot/copilot-instructions.js';
import { generateCopilotQuartermasterAgent } from './copilot/agents/quartermaster.js';
import { generateCopilotBosunAgent } from './copilot/agents/bosun.js';
import { generateCopilotCaptainAgent } from './copilot/agents/captain.js';
import { generateCopilotCartographerAgent } from './copilot/agents/cartographer.js';
import { generateCopilotHooksJson } from './copilot/hooks-json.js';
import { generateCopilotSailSkill } from './copilot/skills/sail.js';
import { generateTillerManifest, getManagedFiles, TILLER_VERSION } from './tiller-manifest.js';
import { TILLER_GITIGNORE_ENTRIES } from './gitignore.js';
import { generateRegisterAgentScript, generateCompleteAgentScript } from './bin/register-agent.js';
import type { ProjectConfig } from './types.js';

/**
 * Write all tool-specific managed files, update the manifest, and clean up gitignore.
 * Shared by upgrade and config commands.
 */
export async function regenerateFiles(config: ProjectConfig, cwd: string, opts?: { skipManifest?: boolean }): Promise<void> {
  const tools = config.tools ?? ['claude'];

  await writeFile(resolve(cwd, '.tiller/TILLER.md'), generateTillerMd(config));
  await writeFile(resolve(cwd, '.tiller/bin/register-agent.py'), generateRegisterAgentScript());
  await writeFile(resolve(cwd, '.tiller/bin/complete-agent.py'), generateCompleteAgentScript());

  // Claude Code files
  if (tools.includes('claude')) {
    // Ensure .claude/CLAUDE.md has the import line; never overwrite user content
    const claudeMdPath = resolve(cwd, '.claude/CLAUDE.md');
    let existingClaudeMd: string | null = null;
    try {
      existingClaudeMd = await readFile(claudeMdPath, 'utf-8');
    } catch {
      // file doesn't exist
    }
    if (existingClaudeMd !== null) {
      if (existingClaudeMd.includes('@.claude/TILLER.md')) {
        existingClaudeMd = existingClaudeMd.replace('@.claude/TILLER.md', '@../.tiller/TILLER.md');
        await writeFile(claudeMdPath, existingClaudeMd);
      }
      if (existingClaudeMd.includes('@.tiller/TILLER.md') && !existingClaudeMd.includes('@../.tiller/TILLER.md')) {
        existingClaudeMd = existingClaudeMd.replace('@.tiller/TILLER.md', '@../.tiller/TILLER.md');
        await writeFile(claudeMdPath, existingClaudeMd);
      }
      if (!existingClaudeMd.includes('@../.tiller/TILLER.md')) {
        await writeFile(claudeMdPath, '@../.tiller/TILLER.md\n\n' + existingClaudeMd);
      }
    }
    await writeFile(resolve(cwd, '.claude/settings.json'), generateSettingsJson(config));
    await writeFile(resolve(cwd, '.claude/hooks/post-write.sh'), generatePostWriteHook(config));
    await writeFile(resolve(cwd, '.claude/hooks/secret-scan.sh'), generateSecretScanHook(config));
    await writeFile(resolve(cwd, '.claude/hooks/session-resume.sh'), generateSessionResumeHook(config));
    await writeFile(resolve(cwd, '.claude/hooks/plan-context.sh'), generatePlanContextHook(config));
    await writeFile(resolve(cwd, '.claude/skills/setup/SKILL.md'), generateSetupSkill(config));
    await writeFile(resolve(cwd, '.claude/skills/sail/SKILL.md'), generateSailSkill(config));
    await writeFile(resolve(cwd, '.claude/skills/anchor/SKILL.md'), generateAnchorSkill(config));
    await writeFile(resolve(cwd, '.claude/skills/recap/SKILL.md'), generateRecapSkill(config));
    await writeFile(resolve(cwd, '.claude/skills/dock/SKILL.md'), generateDockSkill(config));
    await writeFile(resolve(cwd, '.claude/skills/tech-debt/SKILL.md'), generateTechDebtSkill(config));
    await writeFile(resolve(cwd, '.claude/skills/scout/SKILL.md'), generateScoutSkill(config));
    await writeFile(resolve(cwd, '.claude/skills/repair-hull/SKILL.md'), generateRepairHullSkill(config));
    await writeFile(resolve(cwd, '.claude/agents/quartermaster.md'), generateQuartermasterAgent(config));
    await writeFile(resolve(cwd, '.claude/agents/bosun.md'), generateBosunAgent(config));
    await writeFile(resolve(cwd, '.claude/agents/captain.md'), generateCaptainAgent(config));
    await writeFile(resolve(cwd, '.claude/agents/cartographer.md'), generateCartographerAgent(config));
  }

  // OpenCode files
  if (tools.includes('opencode')) {
    await writeFile(resolve(cwd, 'AGENTS.md'), generateAgentsMd(config));
    await writeFile(resolve(cwd, 'opencode.json'), generateOpenCodeJson(config));
    await writeFile(resolve(cwd, '.opencode/agents/quartermaster.md'), generateOCQuartermasterAgent(config));
    await writeFile(resolve(cwd, '.opencode/agents/bosun.md'), generateOCBosunAgent(config));
    await writeFile(resolve(cwd, '.opencode/agents/captain.md'), generateOCCaptainAgent(config));
    await writeFile(resolve(cwd, '.opencode/agents/cartographer.md'), generateOCCartographerAgent(config));

    if (!tools.includes('claude')) {
      await writeFile(resolve(cwd, '.opencode/skills/setup/SKILL.md'), generateSetupSkill(config));
      await writeFile(resolve(cwd, '.opencode/skills/sail/SKILL.md'), generateSailSkill(config));
      await writeFile(resolve(cwd, '.opencode/skills/anchor/SKILL.md'), generateAnchorSkill(config));
      await writeFile(resolve(cwd, '.opencode/skills/recap/SKILL.md'), generateRecapSkill(config));
      await writeFile(resolve(cwd, '.opencode/skills/dock/SKILL.md'), generateDockSkill(config));
      await writeFile(resolve(cwd, '.opencode/skills/tech-debt/SKILL.md'), generateTechDebtSkill(config));
      await writeFile(resolve(cwd, '.opencode/skills/scout/SKILL.md'), generateScoutSkill(config));
      await writeFile(resolve(cwd, '.opencode/skills/repair-hull/SKILL.md'), generateRepairHullSkill(config));
    }
  }

  // Copilot files
  if (tools.includes('copilot')) {
    await writeFile(resolve(cwd, '.github/copilot-instructions.md'), generateCopilotInstructions(config));
    await writeFile(resolve(cwd, '.github/skills/setup/SKILL.md'), generateSetupSkill(config));
    await writeFile(resolve(cwd, '.github/skills/sail/SKILL.md'), generateCopilotSailSkill(config));
    await writeFile(resolve(cwd, '.github/skills/anchor/SKILL.md'), generateAnchorSkill(config));
    await writeFile(resolve(cwd, '.github/skills/recap/SKILL.md'), generateRecapSkill(config));
    await writeFile(resolve(cwd, '.github/skills/dock/SKILL.md'), generateDockSkill(config));
    await writeFile(resolve(cwd, '.github/skills/tech-debt/SKILL.md'), generateTechDebtSkill(config));
    await writeFile(resolve(cwd, '.github/skills/scout/SKILL.md'), generateScoutSkill(config));
    await writeFile(resolve(cwd, '.github/skills/repair-hull/SKILL.md'), generateRepairHullSkill(config));
    await writeFile(resolve(cwd, '.github/agents/quartermaster.agent.md'), generateCopilotQuartermasterAgent(config));
    await writeFile(resolve(cwd, '.github/agents/bosun.agent.md'), generateCopilotBosunAgent(config));
    await writeFile(resolve(cwd, '.github/agents/captain.agent.md'), generateCopilotCaptainAgent(config));
    await writeFile(resolve(cwd, '.github/agents/cartographer.agent.md'), generateCopilotCartographerAgent(config));
    await writeFile(resolve(cwd, '.github/hooks/hooks.json'), generateCopilotHooksJson(config));
    await writeFile(resolve(cwd, '.github/hooks/post-write.sh'), generatePostWriteHook(config));
    await writeFile(resolve(cwd, '.github/hooks/secret-scan.sh'), generateSecretScanHook(config));
    await writeFile(resolve(cwd, '.github/hooks/session-resume.sh'), generateSessionResumeHook(config));
    await writeFile(resolve(cwd, '.github/hooks/session-log.sh'), generateSessionLogHook(config));
    await writeFile(resolve(cwd, '.github/hooks/inbox-check.sh'), generateInboxCheckHook(config));
  }

  if (!opts?.skipManifest) {
    await writeFile(resolve(cwd, '.tiller/tiller.json'), generateTillerManifest(config, TILLER_VERSION));
  }

  // Ensure all tiller gitignore entries are present
  const gitignorePath = resolve(cwd, '.gitignore');
  let existingGitignore: string | null = null;
  try {
    existingGitignore = await readFile(gitignorePath, 'utf-8');
  } catch {
    // no .gitignore — skip
  }
  if (existingGitignore !== null) {
    const missing = TILLER_GITIGNORE_ENTRIES.filter(
      (entry) => !existingGitignore!.split('\n').some((line) => line.trim() === entry)
    );
    if (missing.length > 0) {
      const appendBlock = '\n# Tiller\n' + missing.join('\n') + '\n';
      await writeFile(gitignorePath, existingGitignore + appendBlock);
    }
  }
}

/**
 * Delete files that were managed by the old config but are no longer managed.
 */
export async function deleteStaleManagedFiles(
  oldManagedFiles: string[],
  newManagedFiles: string[],
  cwd: string,
): Promise<string[]> {
  const staleFiles = oldManagedFiles.filter(
    (f) => !newManagedFiles.includes(f) && f !== '.claude/CLAUDE.md'
  );
  for (const f of staleFiles) {
    try {
      await unlink(resolve(cwd, f));
    } catch {
      // file already gone
    }
  }
  return staleFiles;
}

/**
 * Delete files that were managed by the old tool set but are no longer managed by the new tool set.
 */
export async function deleteStaleFiles(oldManagedFiles: string[], newTools: import('./types.js').ToolTarget[], cwd: string): Promise<string[]> {
  return deleteStaleManagedFiles(oldManagedFiles, getManagedFiles(newTools), cwd);
}
