import { intro, outro, confirm, spinner, isCancel, cancel } from '@clack/prompts';
import { readFile, unlink, rename, mkdir, writeFile as fsWriteFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { writeFile } from '../utils/fs.js';
import { TILLER_GITIGNORE_ENTRIES } from '../scaffold/gitignore.js';
import { generatePostWriteHook } from '../scaffold/hooks/post-write.js';
import { generateSecretScanHook } from '../scaffold/hooks/secret-scan.js';
import { generateSessionResumeHook } from '../scaffold/hooks/session-resume.js';
import { generateSetupSkill } from '../scaffold/skills/setup.js';
import { generateSailSkill } from '../scaffold/skills/sail.js';
import { generateAnchorSkill } from '../scaffold/skills/anchor.js';
import { generateRecapSkill } from '../scaffold/skills/recap.js';
import { generateDockSkill } from '../scaffold/skills/dock.js';
import { generateTechDebtSkill } from '../scaffold/skills/tech-debt.js';
import { generateTillerMd } from '../scaffold/claude-md.js';
import { generateSettingsJson } from '../scaffold/settings-json.js';
import { generateQuartermasterAgent } from '../scaffold/agents/quartermaster.js';
import { generateBosunAgent } from '../scaffold/agents/bosun.js';
import { generateCaptainAgent } from '../scaffold/agents/captain.js';
import { generateCartographerAgent } from '../scaffold/agents/cartographer.js';
import { generateScoutSkill } from '../scaffold/skills/scout.js';
import { generateRepairHullSkill } from '../scaffold/skills/repair-hull.js';
import { generateTillerManifest, MANAGED_FILES, TILLER_VERSION, type TillerManifest } from '../scaffold/tiller-manifest.js';
import type { ProjectConfig } from '../scaffold/types.js';

async function migrateLegacyFiles(cwd: string): Promise<void> {
  // Ensure .tiller/ directory exists
  await mkdir(resolve(cwd, '.tiller'), { recursive: true });

  const moves: Array<[string, string]> = [
    ['.claude/.tiller.json', '.tiller/tiller.json'],
    ['.claude/TILLER.md', '.tiller/TILLER.md'],
    ['.claude/.tiller-tech-debt.json', '.tiller/tech-debt.json'],
    ['compass.md', '.tiller/compass.md'],
    ['.tiller.local.json', '.tiller/local.json'],
  ];

  for (const [oldRel, newRel] of moves) {
    const oldPath = resolve(cwd, oldRel);
    const newPath = resolve(cwd, newRel);
    if (existsSync(oldPath) && !existsSync(newPath)) {
      await mkdir(dirname(newPath), { recursive: true });
      await rename(oldPath, newPath);
    }
  }

  // Update .gitignore entries: replace old entries with new ones
  const gitignorePath = resolve(cwd, '.gitignore');
  if (existsSync(gitignorePath)) {
    let content = await readFile(gitignorePath, 'utf-8');
    content = content.replace(/^\.tiller\.local\.json$/m, '.tiller/local.json');
    content = content.replace(/^compass\.md$/m, '.tiller/compass.md');
    await fsWriteFile(gitignorePath, content, 'utf-8');
  }
}

export async function upgradeCommand(opts: { yes?: boolean } = {}): Promise<void> {
  intro('tiller-ai upgrade — update hooks and skills');

  const manifestPath = resolve(process.cwd(), '.tiller/tiller.json');
  const legacyManifestPath = resolve(process.cwd(), '.claude/.tiller.json');

  // Migration: if old path exists but new path doesn't, migrate files first
  if (!existsSync(manifestPath) && existsSync(legacyManifestPath)) {
    await migrateLegacyFiles(process.cwd());
  }

  if (!existsSync(manifestPath)) {
    cancel('No .tiller/tiller.json found. Is this a Tiller project? Run tiller-ai init to start a new project.');
    process.exit(1);
  }

  let manifest: TillerManifest;
  try {
    const raw = await readFile(manifestPath, 'utf-8');
    manifest = JSON.parse(raw);
  } catch {
    cancel('Failed to read .tiller/tiller.json. The file may be corrupted.');
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

  // Remove files that were managed by the old version but are no longer managed.
  // Never delete .claude/CLAUDE.md — it is user-owned content.
  const staleFiles = (manifest.managedFiles ?? []).filter(
    (f) => !MANAGED_FILES.includes(f) && f !== '.claude/CLAUDE.md'
  );
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
    await writeFile(resolve(cwd, '.tiller/TILLER.md'), generateTillerMd(config));
    // Ensure .claude/CLAUDE.md has the import line; never overwrite user content
    const claudeMdPath = resolve(cwd, '.claude/CLAUDE.md');
    let existingClaudeMd: string | null = null;
    try {
      existingClaudeMd = await readFile(claudeMdPath, 'utf-8');
    } catch {
      // file doesn't exist
    }
    if (existingClaudeMd !== null) {
      // Migrate old import to new path
      if (existingClaudeMd.includes('@.claude/TILLER.md')) {
        await writeFile(claudeMdPath, existingClaudeMd.replace('@.claude/TILLER.md', '@.tiller/TILLER.md'));
        existingClaudeMd = existingClaudeMd.replace('@.claude/TILLER.md', '@.tiller/TILLER.md');
      }
      if (!existingClaudeMd.includes('@.tiller/TILLER.md')) {
        await writeFile(claudeMdPath, '@.tiller/TILLER.md\n\n' + existingClaudeMd);
      }
    }
    await writeFile(resolve(cwd, '.claude/settings.json'), generateSettingsJson(config));
    await writeFile(resolve(cwd, '.claude/hooks/post-write.sh'), generatePostWriteHook(config));
    await writeFile(resolve(cwd, '.claude/hooks/secret-scan.sh'), generateSecretScanHook(config));
    await writeFile(resolve(cwd, '.claude/hooks/session-resume.sh'), generateSessionResumeHook(config));
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
    await writeFile(resolve(cwd, '.tiller/tiller.json'), generateTillerManifest(config, TILLER_VERSION));

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

    s.stop('Done!');
  } catch (err) {
    s.stop('Failed.');
    throw err;
  }

  const removedNote = staleFiles.length > 0 ? ` Removed ${staleFiles.length} stale file(s).` : '';
  outro(`Upgraded to v${TILLER_VERSION}. Managed files: ${MANAGED_FILES.length}.${removedNote}`);
}
