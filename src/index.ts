import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { upgradeCommand } from './commands/upgrade.js';
import { configCommand } from './commands/config.js';

const program = new Command();

program
  .name('tiller')
  .description('Scaffold Claude Code projects with a structured vibe loop')
  .version('0.1.3');

program
  .command('init')
  .description('Scaffold Tiller files in the current directory')
  .action(initCommand);

program
  .command('upgrade')
  .description('Update hooks and skills in an existing Tiller project')
  .action(upgradeCommand);

program
  .command('config')
  .description('Interactively update mode and workflow settings')
  .action(configCommand);

program.parse();
