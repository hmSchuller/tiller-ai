import { intro, outro, confirm, spinner, isCancel, cancel } from '@clack/prompts';
import { readFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { writeFile } from '../utils/fs.js';
import { generatePostWriteHook } from '../scaffold/hooks/post-write.js';
import { generateSecretScanHook } from '../scaffold/hooks/secret-scan.js';
import { generateSetupSkill } from '../scaffold/skills/setup.js';
import { generateSailSkill } from '../scaffold/skills/sail.js';
import { generateAnchorSkill } from '../scaffold/skills/anchor.js';
import { generateRecapSkill } from '../scaffold/skills/recap.js';
import { generateDockSkill } from '../scaffold/skills/dock.js';
import { generateTechDebtSkill } from '../scaffold/skills/tech-debt.js';
import { generateDotClaudeMd } from '../scaffold/claude-md.js';
import { generateSettingsJson } from '../scaffold/settings-json.js';
import { generateQuartermasterAgent } from '../scaffold/agents/quartermaster.js';
import { generateBosunAgent } from '../scaffold/agents/bosun.js';
import { generateCaptainAgent } from '../scaffold/agents/captain.js';
import { generateCartographerAgent } from '../scaffold/agents/cartographer.js';
import { generateScoutSkill } from '../scaffold/skills/scout.js';
import { generateTillerManifest, MANAGED_FILES, TILLER_VERSION, type TillerManifest } from '../scaffold/tiller-manifest.js';
import type { ProjectConfig } from '../scaffold/types.js';

export async function upgradeCommand(opts: { yes?: boolean } = {}): Promise<void> {
  intro('tiller-ai upgrade — update hooks and skills');

  const manifestPath = resolve(process.cwd(), '.claude/.tiller.json');

  if (!existsSync(manifestPath)) {
    cancel('No .claude/.tiller.json found. Is this a Tiller project? Run tiller-ai init to start a new project.');
    process.exit(1);
  }

  let manifest: TillerManifest;
  try {
    const raw = await readFile(manifestPath, 'utf-8');
    manifest = JSON.parse(raw);
  } catch {
    cancel('Failed to read .claude/.tiller.json. The file may be corrupted.');
    process.exit(1);
  }

  if (!opts.yes) {
    const go = await confirm({
      message: `Upgrade Tiller files from v${manifest.version} to v${TILLER_VERSION}? (managed files will be overwritten)`,
    });

    if (isCancel(go) || !go) {
      cancel('Upgrade cancelled.');
      process.exit(0);
    }
  }

  const config: ProjectConfig = {
    projectName: '',
    description: '',
    runCommand: manifest.runCommand,
    mode: manifest.mode,
    workflow: manifest.workflow ?? 'solo',
  };

  // Remove files that were managed by the old version but are no longer managed
  const staleFiles = (manifest.managedFiles ?? []).filter((f) => !MANAGED_FILES.includes(f));
  for (const f of staleFiles) {
    try {
      await unlink(resolve(process.cwd(), f));
    } catch {
      // file already gone — skip
    }
  }

  const s = spinner();
  s.start('Upgrading...');

  const cwd = process.cwd();
  try {
    await writeFile(resolve(cwd, '.claude/CLAUDE.md'), generateDotClaudeMd(config));
    await writeFile(resolve(cwd, '.claude/settings.json'), generateSettingsJson(config));
    await writeFile(resolve(cwd, '.claude/hooks/post-write.sh'), generatePostWriteHook(config));
    await writeFile(resolve(cwd, '.claude/hooks/secret-scan.sh'), generateSecretScanHook(config));
    await writeFile(resolve(cwd, '.claude/skills/setup/SKILL.md'), generateSetupSkill(config));
    await writeFile(resolve(cwd, '.claude/skills/sail/SKILL.md'), generateSailSkill(config));
    await writeFile(resolve(cwd, '.claude/skills/anchor/SKILL.md'), generateAnchorSkill(config));
    await writeFile(resolve(cwd, '.claude/skills/recap/SKILL.md'), generateRecapSkill(config));
    await writeFile(resolve(cwd, '.claude/skills/dock/SKILL.md'), generateDockSkill(config));
    await writeFile(resolve(cwd, '.claude/skills/tech-debt/SKILL.md'), generateTechDebtSkill(config));
    await writeFile(resolve(cwd, '.claude/skills/scout/SKILL.md'), generateScoutSkill(config));
    await writeFile(resolve(cwd, '.claude/agents/quartermaster.md'), generateQuartermasterAgent(config));
    await writeFile(resolve(cwd, '.claude/agents/bosun.md'), generateBosunAgent(config));
    await writeFile(resolve(cwd, '.claude/agents/captain.md'), generateCaptainAgent(config));
    await writeFile(resolve(cwd, '.claude/agents/cartographer.md'), generateCartographerAgent(config));
    await writeFile(resolve(cwd, '.claude/.tiller.json'), generateTillerManifest(config, TILLER_VERSION));
    s.stop('Done!');
  } catch (err) {
    s.stop('Failed.');
    throw err;
  }

  const removedNote = staleFiles.length > 0 ? ` Removed ${staleFiles.length} stale file(s).` : '';
  outro(`Upgraded to v${TILLER_VERSION}. Managed files: ${MANAGED_FILES.length}.${removedNote}`);
}
