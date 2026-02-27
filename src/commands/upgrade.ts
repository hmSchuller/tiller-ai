import { intro, outro, confirm, spinner, isCancel, cancel } from '@clack/prompts';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { writeFile } from '../utils/fs.js';
import { generatePostWriteHook } from '../scaffold/hooks/post-write.js';
import { generateSecretScanHook } from '../scaffold/hooks/secret-scan.js';
import { generateSetupSkill } from '../scaffold/skills/setup.js';
import { generateVibeSkill } from '../scaffold/skills/vibe.js';
import { generateSnapshotSkill } from '../scaffold/skills/snapshot.js';
import { generateRecapSkill } from '../scaffold/skills/recap.js';
import { generateLandSkill } from '../scaffold/skills/land.js';
import { generateTechDebtSkill } from '../scaffold/skills/tech-debt.js';
import { generateDotClaudeMd } from '../scaffold/claude-md.js';
import { generateTillerManifest, MANAGED_FILES } from '../scaffold/tiller-manifest.js';
import type { ProjectConfig } from '../scaffold/types.js';

const TILLER_VERSION = '0.1.0';

export async function upgradeCommand(): Promise<void> {
  intro('tiller upgrade — update hooks and skills');

  const manifestPath = resolve(process.cwd(), '.claude/.tiller.json');

  if (!existsSync(manifestPath)) {
    cancel('No .claude/.tiller.json found. Is this a Tiller project? Run tiller init to start a new project.');
    process.exit(1);
  }

  let manifest: { version: string; mode: 'simple' | 'detailed'; runCommand: string; workflow?: 'solo' | 'team' };
  try {
    const raw = await readFile(manifestPath, 'utf-8');
    manifest = JSON.parse(raw);
  } catch {
    cancel('Failed to read .claude/.tiller.json. The file may be corrupted.');
    process.exit(1);
  }

  const go = await confirm({
    message: `Upgrade Tiller files from v${manifest.version} to v${TILLER_VERSION}? (managed files will be overwritten)`,
  });

  if (isCancel(go) || !go) {
    cancel('Upgrade cancelled.');
    process.exit(0);
  }

  const config: ProjectConfig = {
    projectName: '',
    description: '',
    runCommand: manifest.runCommand,
    mode: manifest.mode,
    workflow: manifest.workflow ?? 'solo',
  };

  const s = spinner();
  s.start('Upgrading...');

  try {
    await writeFile('.claude/CLAUDE.md', generateDotClaudeMd(config));
    await writeFile('.claude/hooks/post-write.sh', generatePostWriteHook(config));
    await writeFile('.claude/hooks/secret-scan.sh', generateSecretScanHook(config));
    await writeFile('.claude/skills/setup/SKILL.md', generateSetupSkill(config));
    await writeFile('.claude/skills/vibe/SKILL.md', generateVibeSkill(config));
    await writeFile('.claude/skills/snapshot/SKILL.md', generateSnapshotSkill(config));
    await writeFile('.claude/skills/recap/SKILL.md', generateRecapSkill(config));
    await writeFile('.claude/skills/land/SKILL.md', generateLandSkill(config));
    await writeFile('.claude/skills/tech-debt/SKILL.md', generateTechDebtSkill(config));
    await writeFile('.claude/.tiller.json', generateTillerManifest(config, TILLER_VERSION));
    s.stop('Done!');
  } catch (err) {
    s.stop('Failed.');
    throw err;
  }

  outro(`Upgraded to v${TILLER_VERSION}. Managed files: ${MANAGED_FILES.length}`);
}
