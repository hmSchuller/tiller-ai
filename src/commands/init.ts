import { intro, outro, spinner, select, isCancel } from '@clack/prompts';
import { resolve, basename } from 'node:path';
import { scaffold } from '../scaffold/index.js';
import type { ProjectConfig } from '../scaffold/types.js';

export async function initCommand(): Promise<void> {
  const targetDir = resolve(process.cwd());
  const projectName = basename(targetDir);

  intro('tiller-ai init');

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

  const config: ProjectConfig = {
    projectName,
    description: '',
    runCommand: '',
    mode: modeAnswer as 'simple' | 'detailed',
    workflow: workflowAnswer as 'solo' | 'team',
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
