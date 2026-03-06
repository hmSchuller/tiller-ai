import { intro, outro, confirm, spinner, isCancel, cancel } from '@clack/prompts';
import { readFile, rename, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { writeFile } from '../utils/fs.js';
import { getManagedFiles, TILLER_VERSION, type TillerManifest } from '../scaffold/tiller-manifest.js';
import type { ProjectConfig, ToolTarget } from '../scaffold/types.js';
import { regenerateFiles, deleteStaleFiles } from '../scaffold/regenerate.js';

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
    await writeFile(gitignorePath, content);
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

  const tools: ToolTarget[] = manifest.tools ?? ['claude'];

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
    tools,
  };

  const newManagedFiles = getManagedFiles(tools);

  // Remove files that were managed by the old version but are no longer managed.
  const staleFiles = await deleteStaleFiles(manifest.managedFiles ?? [], tools, process.cwd());

  const s = spinner();
  s.start('Upgrading...');

  const cwd = process.cwd();
  try {
    await regenerateFiles(config, cwd);
    s.stop('Done!');
  } catch (err) {
    s.stop('Failed.');
    throw err;
  }

  const removedNote = staleFiles.length > 0 ? ` Removed ${staleFiles.length} stale file(s).` : '';
  outro(`Upgraded to v${TILLER_VERSION}. Managed files: ${newManagedFiles.length}.${removedNote}`);
}
