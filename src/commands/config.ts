import { intro, outro, spinner, select, multiselect, isCancel, cancel } from '@clack/prompts';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { writeFile } from '../utils/fs.js';
import { generateTillerManifest, TILLER_VERSION, type TillerManifest } from '../scaffold/tiller-manifest.js';
import type { ProjectConfig, ToolTarget } from '../scaffold/types.js';
import { regenerateFiles, deleteStaleFiles } from '../scaffold/regenerate.js';

export async function configCommand(): Promise<void> {
  intro('tiller-ai config — update mode and workflow');

  const manifestPath = resolve(process.cwd(), '.tiller/tiller.json');

  if (!existsSync(manifestPath)) {
    cancel('No .tiller/tiller.json found. Is this a Tiller project?');
    process.exit(1);
  }

  let manifest: TillerManifest;
  try {
    const raw = await readFile(manifestPath, 'utf-8');
    manifest = JSON.parse(raw);
  } catch {
    cancel('Failed to read .tiller/tiller.json.');
    process.exit(1);
  }

  const localPath = resolve(process.cwd(), '.tiller/local.json');
  let local: Record<string, unknown> = {};
  if (existsSync(localPath)) {
    try {
      const raw = await readFile(localPath, 'utf-8');
      local = JSON.parse(raw);
    } catch {
      // ignore
    }
  }

  // Effective current values (local overrides project)
  const currentMode = (local.mode as 'simple' | 'detailed' | undefined) ?? manifest.mode ?? 'detailed';
  const currentWorkflow = (local.workflow as 'solo' | 'team' | undefined) ?? manifest.workflow ?? 'solo';

  const modeAnswer = await select({
    message: 'Mode',
    initialValue: currentMode,
    options: [
      { value: 'simple', label: 'simple', hint: 'You describe what you want. Claude builds it. Minimal narration.' },
      { value: 'detailed', label: 'detailed', hint: 'Claude explains its approach, shows trade-offs, and waits for approval.' },
    ],
  });

  if (isCancel(modeAnswer)) {
    process.exit(0);
  }

  const workflowAnswer = await select({
    message: 'Workflow',
    initialValue: currentWorkflow,
    options: [
      { value: 'solo', label: 'solo', hint: 'Merges directly to main. For single developers or local-only work.' },
      { value: 'team', label: 'team', hint: 'Pushes branch and opens a PR. For teams with code review.' },
    ],
  });

  if (isCancel(workflowAnswer)) {
    process.exit(0);
  }

  const currentTools: ToolTarget[] = (local.tools as ToolTarget[] | undefined) ?? manifest.tools ?? ['claude'];

  const toolsAnswer = await multiselect({
    message: 'CLI tools',
    initialValues: currentTools,
    options: [
      { value: 'claude', label: 'Claude Code' },
      { value: 'copilot', label: 'GitHub Copilot' },
      { value: 'opencode', label: 'OpenCode' },
    ],
    required: true,
  });

  if (isCancel(toolsAnswer)) {
    process.exit(0);
  }

  const scopeAnswer = await select({
    message: 'Who should this apply to?',
    options: [
      { value: 'local', label: 'just me', hint: 'Saves to .tiller/local.json (gitignored). Only affects your machine.' },
      { value: 'project', label: 'whole project', hint: 'Updates .tiller/tiller.json (committed). Shared with the team.' },
    ],
  });

  if (isCancel(scopeAnswer)) {
    process.exit(0);
  }

  const newMode = modeAnswer as 'simple' | 'detailed';
  const newWorkflow = workflowAnswer as 'solo' | 'team';
  const newTools = toolsAnswer as ToolTarget[];
  const isProjectScope = scopeAnswer === 'project';

  const arraysEqual = (a: string[], b: string[]) =>
    a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);

  // Check for no-op
  if (isProjectScope) {
    const oldTools: ToolTarget[] = manifest.tools ?? ['claude'];
    if (manifest.mode === newMode && (manifest.workflow ?? 'solo') === newWorkflow && arraysEqual(oldTools, newTools)) {
      outro('No changes — project settings already match.');
      return;
    }
  } else {
    const oldLocalTools = local.tools as ToolTarget[] | undefined;
    if (
      (local.mode as string | undefined) === newMode &&
      (local.workflow as string | undefined) === newWorkflow &&
      oldLocalTools !== undefined && arraysEqual(oldLocalTools, newTools)
    ) {
      outro('No changes — local settings already match.');
      return;
    }
  }

  const oldManagedTools: ToolTarget[] = manifest.tools ?? ['claude'];
  const toolsChanged = !arraysEqual(oldManagedTools, newTools);

  const s = spinner();

  if (isProjectScope) {
    s.start('Updating project settings...');

    const config: ProjectConfig = {
      projectName: '',
      description: '',
      runCommand: manifest.runCommand,
      mode: newMode,
      workflow: newWorkflow,
      tools: newTools,
    };

    try {
      if (toolsChanged) {
        await deleteStaleFiles(manifest.managedFiles ?? [], newTools, process.cwd());
        await regenerateFiles(config, process.cwd());
      } else {
        await writeFile(manifestPath, generateTillerManifest(config, TILLER_VERSION));
      }
      s.stop('Done!');
    } catch (err) {
      s.stop('Failed.');
      throw err;
    }

    outro('Project settings updated. Commit .tiller/tiller.json to share with the team.');
  } else {
    s.start('Saving personal settings...');

    const updated = { ...local, mode: newMode, workflow: newWorkflow, tools: newTools };
    try {
      if (toolsChanged) {
        const config: ProjectConfig = {
          projectName: '',
          description: '',
          runCommand: manifest.runCommand,
          mode: newMode,
          workflow: newWorkflow,
          tools: newTools,
        };
        await deleteStaleFiles(manifest.managedFiles ?? [], newTools, process.cwd());
        await regenerateFiles(config, process.cwd(), { skipManifest: true });
      }
      await writeFile(localPath, JSON.stringify(updated, null, 2));
      s.stop('Done!');
    } catch (err) {
      s.stop('Failed.');
      throw err;
    }

    outro('Personal settings saved to .tiller/local.json (gitignored).');
  }
}
