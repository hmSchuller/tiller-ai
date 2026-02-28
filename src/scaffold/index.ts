import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { writeFile } from '../utils/fs.js';
import { isGitRepo, gitInit, gitAdd, gitCommit } from '../utils/git.js';
import type { ProjectConfig } from './types.js';
import { generateRootClaudeMd, generateDotClaudeMd } from './claude-md.js';
import { generateCompass } from './compass.js';
import { generateChangelog } from './changelog.js';
import { generateSettingsJson } from './settings-json.js';
import { generateGitignore, TILLER_GITIGNORE_ENTRIES } from './gitignore.js';
import { generateTillerManifest, TILLER_VERSION } from './tiller-manifest.js';
import { generatePostWriteHook } from './hooks/post-write.js';
import { generateSecretScanHook } from './hooks/secret-scan.js';
import { generateSessionResumeHook } from './hooks/session-resume.js';
import { generateSailSkill } from './skills/sail.js';
import { generateAnchorSkill } from './skills/anchor.js';
import { generateRecapSkill } from './skills/recap.js';
import { generateDockSkill } from './skills/dock.js';
import { generateSetupSkill } from './skills/setup.js';
import { generateTechDebtSkill } from './skills/tech-debt.js';
import { generateTechDebtState } from './tech-debt-state.js';
import { generateQuartermasterAgent } from './agents/quartermaster.js';
import { generateBosunAgent } from './agents/bosun.js';
import { generateCaptainAgent } from './agents/captain.js';
import { generateTechBacklog } from './tech-backlog.js';

export async function scaffold(config: ProjectConfig, targetDir: string): Promise<void> {
  const p = (rel: string) => join(targetDir, rel);

  // Root files
  await writeFile(p('CLAUDE.md'), generateRootClaudeMd(config));

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
  await writeFile(p('compass.md'), generateCompass(config));

  // .claude/ files
  await writeFile(p('.claude/CLAUDE.md'), generateDotClaudeMd(config));
  await writeFile(p('.claude/settings.json'), generateSettingsJson(config));
  await writeFile(p('.claude/.tiller.json'), generateTillerManifest(config, TILLER_VERSION));
  await writeFile(p('.claude/.tiller-tech-debt.json'), generateTechDebtState());

  // Hooks
  await writeFile(p('.claude/hooks/post-write.sh'), generatePostWriteHook(config));
  await writeFile(p('.claude/hooks/secret-scan.sh'), generateSecretScanHook(config));
  await writeFile(p('.claude/hooks/session-resume.sh'), generateSessionResumeHook(config));

  // Skills
  await writeFile(p('.claude/skills/setup/SKILL.md'), generateSetupSkill(config));
  await writeFile(p('.claude/skills/sail/SKILL.md'), generateSailSkill(config));
  await writeFile(p('.claude/skills/anchor/SKILL.md'), generateAnchorSkill(config));
  await writeFile(p('.claude/skills/recap/SKILL.md'), generateRecapSkill(config));
  await writeFile(p('.claude/skills/dock/SKILL.md'), generateDockSkill(config));
  await writeFile(p('.claude/skills/tech-debt/SKILL.md'), generateTechDebtSkill(config));

  // Agents
  await writeFile(p('.claude/agents/quartermaster.md'), generateQuartermasterAgent(config));
  await writeFile(p('.claude/agents/bosun.md'), generateBosunAgent(config));
  await writeFile(p('.claude/agents/captain.md'), generateCaptainAgent(config));

  // Shared tracking files
  await writeFile(p('tech-backlog.md'), generateTechBacklog(config));

  // Git
  if (!isGitRepo(targetDir)) {
    gitInit(targetDir);
  }
  gitAdd(targetDir);
  gitCommit(targetDir, 'chore: initial tiller scaffold');
}
