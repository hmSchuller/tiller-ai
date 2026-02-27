import { intro, outro, spinner } from '@clack/prompts';
import { resolve, basename } from 'node:path';
import { scaffold } from '../scaffold/index.js';
import type { ProjectConfig } from '../scaffold/types.js';

export async function initCommand(): Promise<void> {
  const targetDir = resolve(process.cwd());
  const projectName = basename(targetDir);

  intro('tiller init');

  const config: ProjectConfig = {
    projectName,
    description: '',
    runCommand: '',
    mode: 'simple',
    workflow: 'solo',
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
