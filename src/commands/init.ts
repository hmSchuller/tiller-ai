import { intro, outro, spinner, select, isCancel, cancel } from '@clack/prompts';
import { resolve, basename } from 'node:path';
import { scaffold } from '../scaffold/index.js';
import type { ProjectConfig } from '../scaffold/types.js';

export async function initCommand(opts: { yes?: boolean; mode?: string; workflow?: string } = {}): Promise<void> {
  const targetDir = resolve(process.cwd());
  const projectName = basename(targetDir);

  intro('tiller-ai init');

  let mode: 'simple' | 'detailed';
  let workflow: 'solo' | 'team';

  if (opts.yes) {
    if (opts.mode && opts.mode !== 'simple' && opts.mode !== 'detailed') {
      cancel(`Invalid mode: ${opts.mode}. Must be 'simple' or 'detailed'.`);
      process.exit(1);
    }
    if (opts.workflow && opts.workflow !== 'solo' && opts.workflow !== 'team') {
      cancel(`Invalid workflow: ${opts.workflow}. Must be 'solo' or 'team'.`);
      process.exit(1);
    }
    mode = (opts.mode as 'simple' | 'detailed') ?? 'simple';
    workflow = (opts.workflow as 'solo' | 'team') ?? 'solo';
  } else {
    const modeAnswer = await select({
      message: 'Mode',
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
      options: [
        { value: 'solo', label: 'solo', hint: 'Merges directly to main. For single developers or local-only work.' },
        { value: 'team', label: 'team', hint: 'Pushes branch and opens a PR. For teams with code review.' },
      ],
    });

    if (isCancel(workflowAnswer)) {
      process.exit(0);
    }

    mode = modeAnswer as 'simple' | 'detailed';
    workflow = workflowAnswer as 'solo' | 'team';
  }

  const config: ProjectConfig = {
    projectName,
    description: '',
    runCommand: '',
    mode,
    workflow,
  };

  const s = spinner();
  s.start('Scaffolding...');

  try {
    await scaffold(config, targetDir);
    s.stop('Done.');
  } catch (err) {
    s.stop('Failed.');
    throw err;
  }

  outro(
    `Scaffolded in ./${projectName}\n\n` +
    `  claude\n\n` +
    `Then run /setup to configure the project with AI assistance.`
  );
}
