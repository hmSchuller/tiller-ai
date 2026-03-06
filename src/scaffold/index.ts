import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { writeFile } from '../utils/fs.js';
import { isGitRepo, gitInit, gitAdd, gitCommit } from '../utils/git.js';
import type { ProjectConfig } from './types.js';
import { generateTillerMd, generateUserClaudeMd } from './claude-md.js';
import { generateChangelog } from './changelog.js';
import { generateSettingsJson } from './settings-json.js';
import { generateGitignore, TILLER_GITIGNORE_ENTRIES } from './gitignore.js';
import { generateTillerManifest, TILLER_VERSION } from './tiller-manifest.js';
import { generatePostWriteHook } from './hooks/post-write.js';
import { generateSecretScanHook } from './hooks/secret-scan.js';
import { generateSessionResumeHook } from './hooks/session-resume.js';
import { generatePlanContextHook } from './hooks/plan-context.js';
import { generateSailSkill } from './skills/sail.js';
import { generateAnchorSkill } from './skills/anchor.js';
import { generateRecapSkill } from './skills/recap.js';
import { generateDockSkill } from './skills/dock.js';
import { generateSetupSkill } from './skills/setup.js';
import { generateTechDebtSkill } from './skills/tech-debt.js';
import { generateScoutSkill } from './skills/scout.js';
import { generateRepairHullSkill } from './skills/repair-hull.js';
import { generateTechDebtState } from './tech-debt-state.js';
import { generateQuartermasterAgent } from './agents/quartermaster.js';
import { generateBosunAgent } from './agents/bosun.js';
import { generateCaptainAgent } from './agents/captain.js';
import { generateCartographerAgent } from './agents/cartographer.js';
import { generateTechBacklog } from './tech-backlog.js';
import { generateCompass } from './compass.js';
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

export async function scaffold(config: ProjectConfig, targetDir: string): Promise<void> {
  const p = (rel: string) => join(targetDir, rel);
  const tools = config.tools ?? ['claude'];

  // .gitignore: preserve existing content, only append missing tiller entries
  let existingGitignore: string | null = null;
  try {
    existingGitignore = await readFile(p('.gitignore'), 'utf-8');
  } catch {
    // file doesn't exist — write the full template below
  }
  if (existingGitignore !== null) {
    const missing = TILLER_GITIGNORE_ENTRIES.filter(
      (entry) => !existingGitignore!.split('\n').some((line) => line.trim() === entry)
    );
    if (missing.length > 0) {
      const appendBlock = '\n# Tiller\n' + missing.join('\n') + '\n';
      await writeFile(p('.gitignore'), existingGitignore + appendBlock);
    }
  } else {
    await writeFile(p('.gitignore'), generateGitignore(config));
  }
  await writeFile(p('changelog.md'), generateChangelog(config));

  // .tiller/ files
  await writeFile(p('.tiller/TILLER.md'), generateTillerMd(config));
  await writeFile(p('.tiller/tiller.json'), generateTillerManifest(config, TILLER_VERSION));
  await writeFile(p('.tiller/tech-debt.json'), generateTechDebtState());

  // Claude Code files
  if (tools.includes('claude')) {
    // .claude/CLAUDE.md: create on first init only; if it exists, add import line if missing
    const claudeMdPath = p('.claude/CLAUDE.md');
    let existingClaudeMd: string | null = null;
    try {
      existingClaudeMd = await readFile(claudeMdPath, 'utf-8');
    } catch {
      // file doesn't exist — write fresh
    }
    if (existingClaudeMd === null) {
      await writeFile(claudeMdPath, generateUserClaudeMd());
    } else if (!existingClaudeMd.includes('@../.tiller/TILLER.md')) {
      await writeFile(claudeMdPath, '@../.tiller/TILLER.md\n\n' + existingClaudeMd);
    }
    await writeFile(p('.claude/settings.json'), generateSettingsJson(config));

    // Hooks
    await writeFile(p('.claude/hooks/post-write.sh'), generatePostWriteHook(config));
    await writeFile(p('.claude/hooks/secret-scan.sh'), generateSecretScanHook(config));
    await writeFile(p('.claude/hooks/session-resume.sh'), generateSessionResumeHook(config));
    await writeFile(p('.claude/hooks/plan-context.sh'), generatePlanContextHook(config));

    // Skills
    await writeFile(p('.claude/skills/setup/SKILL.md'), generateSetupSkill(config));
    await writeFile(p('.claude/skills/sail/SKILL.md'), generateSailSkill(config));
    await writeFile(p('.claude/skills/anchor/SKILL.md'), generateAnchorSkill(config));
    await writeFile(p('.claude/skills/recap/SKILL.md'), generateRecapSkill(config));
    await writeFile(p('.claude/skills/dock/SKILL.md'), generateDockSkill(config));
    await writeFile(p('.claude/skills/tech-debt/SKILL.md'), generateTechDebtSkill(config));
    await writeFile(p('.claude/skills/scout/SKILL.md'), generateScoutSkill(config));
    await writeFile(p('.claude/skills/repair-hull/SKILL.md'), generateRepairHullSkill(config));

    // Agents
    await writeFile(p('.claude/agents/quartermaster.md'), generateQuartermasterAgent(config));
    await writeFile(p('.claude/agents/bosun.md'), generateBosunAgent(config));
    await writeFile(p('.claude/agents/captain.md'), generateCaptainAgent(config));
    await writeFile(p('.claude/agents/cartographer.md'), generateCartographerAgent(config));
  }

  // OpenCode files
  if (tools.includes('opencode')) {
    await writeFile(p('AGENTS.md'), generateAgentsMd(config));
    await writeFile(p('opencode.json'), generateOpenCodeJson(config));
    await writeFile(p('.opencode/agents/quartermaster.md'), generateOCQuartermasterAgent(config));
    await writeFile(p('.opencode/agents/bosun.md'), generateOCBosunAgent(config));
    await writeFile(p('.opencode/agents/captain.md'), generateOCCaptainAgent(config));
    await writeFile(p('.opencode/agents/cartographer.md'), generateOCCartographerAgent(config));

    // If Claude is NOT selected, skills go to .opencode/skills/
    if (!tools.includes('claude')) {
      await writeFile(p('.opencode/skills/setup/SKILL.md'), generateSetupSkill(config));
      await writeFile(p('.opencode/skills/sail/SKILL.md'), generateSailSkill(config));
      await writeFile(p('.opencode/skills/anchor/SKILL.md'), generateAnchorSkill(config));
      await writeFile(p('.opencode/skills/recap/SKILL.md'), generateRecapSkill(config));
      await writeFile(p('.opencode/skills/dock/SKILL.md'), generateDockSkill(config));
      await writeFile(p('.opencode/skills/tech-debt/SKILL.md'), generateTechDebtSkill(config));
      await writeFile(p('.opencode/skills/scout/SKILL.md'), generateScoutSkill(config));
      await writeFile(p('.opencode/skills/repair-hull/SKILL.md'), generateRepairHullSkill(config));
    }
  }

  // Copilot files
  if (tools.includes('copilot')) {
    await writeFile(p('.github/copilot-instructions.md'), generateCopilotInstructions(config));

    // Skills (same SKILL.md format as Claude)
    await writeFile(p('.github/skills/setup/SKILL.md'), generateSetupSkill(config));
    await writeFile(p('.github/skills/sail/SKILL.md'), generateCopilotSailSkill(config));
    await writeFile(p('.github/skills/anchor/SKILL.md'), generateAnchorSkill(config));
    await writeFile(p('.github/skills/recap/SKILL.md'), generateRecapSkill(config));
    await writeFile(p('.github/skills/dock/SKILL.md'), generateDockSkill(config));
    await writeFile(p('.github/skills/tech-debt/SKILL.md'), generateTechDebtSkill(config));
    await writeFile(p('.github/skills/scout/SKILL.md'), generateScoutSkill(config));
    await writeFile(p('.github/skills/repair-hull/SKILL.md'), generateRepairHullSkill(config));

    // Agents (.agent.md format)
    await writeFile(p('.github/agents/quartermaster.agent.md'), generateCopilotQuartermasterAgent(config));
    await writeFile(p('.github/agents/bosun.agent.md'), generateCopilotBosunAgent(config));
    await writeFile(p('.github/agents/captain.agent.md'), generateCopilotCaptainAgent(config));
    await writeFile(p('.github/agents/cartographer.agent.md'), generateCopilotCartographerAgent(config));

    // Hooks
    await writeFile(p('.github/hooks/hooks.json'), generateCopilotHooksJson(config));
    await writeFile(p('.github/hooks/post-write.sh'), generatePostWriteHook(config));
    await writeFile(p('.github/hooks/secret-scan.sh'), generateSecretScanHook(config));
    await writeFile(p('.github/hooks/session-resume.sh'), generateSessionResumeHook(config));
  }

  // Shared tracking files (compass and local.json are gitignored inside .tiller/)
  await writeFile(p('tech-backlog.md'), generateTechBacklog(config));
  await writeFile(p('.tiller/compass.md'), generateCompass(config));

  // Git
  if (!isGitRepo(targetDir)) {
    gitInit(targetDir);
  }
  gitAdd(targetDir);
  gitCommit(targetDir, 'chore: initial tiller scaffold');
}
