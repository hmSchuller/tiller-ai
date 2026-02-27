import { intro, outro, spinner, cancel } from '@clack/prompts';
import { readFile, writeFile as fsWriteFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { writeFile } from '../utils/fs.js';
import { generateRootClaudeMd } from '../scaffold/claude-md.js';
import { generateTillerManifest, TILLER_VERSION } from '../scaffold/tiller-manifest.js';
import type { ProjectConfig } from '../scaffold/types.js';

export async function modeCommand(newMode: string, options: { project?: boolean }): Promise<void> {
  intro('tiller-ai mode — switch between simple and detailed');

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

  const localPath = resolve(process.cwd(), '.tiller.local.json');
  const isProjectScope = options.project === true;

  // For local scope: check current local mode first
  if (!isProjectScope) {
    let localMode: string | undefined;
    if (existsSync(localPath)) {
      try {
        const raw = await readFile(localPath, 'utf-8');
        const local = JSON.parse(raw);
        localMode = local.mode;
      } catch {
        // ignore
      }
    }
    if (localMode === newMode) {
      outro(`Already in ${newMode} mode (local override).`);
      return;
    }
  } else {
    // For project scope: check shared manifest
    if (manifest.mode === newMode) {
      outro(`Already in ${newMode} mode (project default).`);
      return;
    }
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

  const s = spinner();

  if (isProjectScope) {
    // Project scope: update shared CLAUDE.md and .tiller.json
    s.start(`Switching project default to ${newMode} mode...`);
    const config: ProjectConfig = {
      projectName,
      description,
      runCommand: manifest.runCommand,
      mode: newMode as 'simple' | 'detailed',
      workflow: manifest.workflow ?? 'solo',
    };
    try {
      await writeFile('CLAUDE.md', generateRootClaudeMd(config));
      await writeFile('.claude/.tiller.json', generateTillerManifest(config, TILLER_VERSION));
      s.stop('Done!');
    } catch (err) {
      s.stop('Failed.');
      throw err;
    }
    outro(`Project default mode set to ${newMode}. Commit CLAUDE.md and .tiller.json to share with the team.`);
  } else {
    // Local scope: write .tiller.local.json only (gitignored)
    s.start(`Setting personal mode to ${newMode}...`);
    let existing: Record<string, unknown> = {};
    if (existsSync(localPath)) {
      try {
        const raw = await readFile(localPath, 'utf-8');
        existing = JSON.parse(raw);
      } catch {
        // ignore
      }
    }
    const local = { ...existing, mode: newMode };
    try {
      await fsWriteFile(localPath, JSON.stringify(local, null, 2), 'utf-8');
      s.stop('Done!');
    } catch (err) {
      s.stop('Failed.');
      throw err;
    }
    outro(`Personal mode set to ${newMode} in .tiller.local.json (gitignored). Use --project to change the shared default.`);
  }
}
