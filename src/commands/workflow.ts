import { intro, outro, spinner, cancel } from '@clack/prompts';
import { readFile, writeFile as fsWriteFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateRootClaudeMd } from '../scaffold/claude-md.js';
import { generateTillerManifest } from '../scaffold/tiller-manifest.js';
import type { ProjectConfig } from '../scaffold/types.js';

const TILLER_VERSION = '0.1.0';

export async function workflowCommand(newWorkflow: string, options: { project?: boolean }): Promise<void> {
  intro('tiller workflow — switch between solo and team');

  if (newWorkflow !== 'solo' && newWorkflow !== 'team') {
    cancel('Workflow must be "solo" or "team".');
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

  // For local scope: check current local workflow first
  if (!isProjectScope) {
    let localWorkflow: string | undefined;
    if (existsSync(localPath)) {
      try {
        const raw = await readFile(localPath, 'utf-8');
        const local = JSON.parse(raw);
        localWorkflow = local.workflow;
      } catch {
        // ignore
      }
    }
    if (localWorkflow === newWorkflow) {
      outro(`Already on ${newWorkflow} workflow (local override).`);
      return;
    }
  } else {
    // For project scope: check shared manifest
    if ((manifest.workflow ?? 'solo') === newWorkflow) {
      outro(`Already on ${newWorkflow} workflow (project default).`);
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
    s.start(`Switching project default to ${newWorkflow} workflow...`);
    const config: ProjectConfig = {
      projectName,
      description,
      runCommand: manifest.runCommand,
      mode: manifest.mode ?? 'detailed',
      workflow: newWorkflow as 'solo' | 'team',
    };
    try {
      await fsWriteFile(rootClaudePath, generateRootClaudeMd(config), 'utf-8');
      await fsWriteFile(manifestPath, generateTillerManifest(config, TILLER_VERSION), 'utf-8');
      s.stop('Done!');
    } catch (err) {
      s.stop('Failed.');
      throw err;
    }
    outro(`Project default workflow set to ${newWorkflow}. Commit CLAUDE.md and .tiller.json to share with the team.`);
  } else {
    // Local scope: write .tiller.local.json only (gitignored)
    s.start(`Setting personal workflow to ${newWorkflow}...`);
    let existing: Record<string, unknown> = {};
    if (existsSync(localPath)) {
      try {
        const raw = await readFile(localPath, 'utf-8');
        existing = JSON.parse(raw);
      } catch {
        // ignore
      }
    }
    const local = { ...existing, workflow: newWorkflow };
    try {
      await fsWriteFile(localPath, JSON.stringify(local, null, 2), 'utf-8');
      s.stop('Done!');
    } catch (err) {
      s.stop('Failed.');
      throw err;
    }
    outro(`Personal workflow set to ${newWorkflow} in .tiller.local.json (gitignored). Use --project to change the shared default.`);
  }
}
