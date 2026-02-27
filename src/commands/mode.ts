import { intro, outro, spinner, cancel } from '@clack/prompts';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { writeFile } from '../utils/fs.js';
import { generateRootClaudeMd } from '../scaffold/claude-md.js';
import { generateTillerManifest } from '../scaffold/tiller-manifest.js';
import type { ProjectConfig } from '../scaffold/types.js';

const TILLER_VERSION = '0.1.0';

export async function modeCommand(newMode: string): Promise<void> {
  intro('tiller mode — switch between simple and detailed');

  if (newMode !== 'simple' && newMode !== 'detailed') {
    cancel('Mode must be "simple" or "detailed".');
    process.exit(1);
  }

  const manifestPath = resolve(process.cwd(), '.claude/.tiller.json');

  if (!existsSync(manifestPath)) {
    cancel('No .claude/.tiller.json found. Is this a Tiller project?');
    process.exit(1);
  }

  let manifest: { version: string; mode: 'simple' | 'detailed'; workflow?: 'solo' | 'team'; runCommand: string; projectName?: string; description?: string };
  try {
    const raw = await readFile(manifestPath, 'utf-8');
    manifest = JSON.parse(raw);
  } catch {
    cancel('Failed to read .claude/.tiller.json.');
    process.exit(1);
  }

  if (manifest.mode === newMode) {
    outro(`Already in ${newMode} mode.`);
    return;
  }

  // Read root CLAUDE.md to get project name and description
  const rootClaudePath = resolve(process.cwd(), 'CLAUDE.md');
  let projectName = manifest.projectName ?? '';
  let description = manifest.description ?? '';

  if (existsSync(rootClaudePath)) {
    try {
      const raw = await readFile(rootClaudePath, 'utf-8');
      const nameMatch = raw.match(/^# (.+)$/m);
      const descMatch = raw.match(/^# .+\n\n(.+)/m);
      if (nameMatch) projectName = nameMatch[1];
      if (descMatch) description = descMatch[1];
    } catch {
      // ignore
    }
  }

  const config: ProjectConfig = {
    projectName,
    description,
    runCommand: manifest.runCommand,
    mode: newMode as 'simple' | 'detailed',
    workflow: manifest.workflow ?? 'solo',
  };

  const s = spinner();
  s.start(`Switching to ${newMode} mode...`);

  try {
    await writeFile('CLAUDE.md', generateRootClaudeMd(config));
    await writeFile('.claude/.tiller.json', generateTillerManifest(config, TILLER_VERSION));
    s.stop('Done!');
  } catch (err) {
    s.stop('Failed.');
    throw err;
  }

  outro(`Mode switched to ${newMode}.`);
}
