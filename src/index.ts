import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { upgradeCommand } from './commands/upgrade.js';
import { configCommand } from './commands/config.js';

const program = new Command();

program
  .name('tiller')
  .description('Scaffold Claude Code projects with a structured vibe loop')
  .version('0.2.0');

program
  .command('init')
  .description('Scaffold Tiller files in the current directory')
  .option('-y, --yes', 'Skip interactive prompts using defaults')
  .option('--mode <mode>', 'Mode to use: simple or detailed (default: simple)')
  .option('--workflow <workflow>', 'Workflow to use: solo or team (default: solo)')
  .action(initCommand);

program
  .command('upgrade')
  .description('Update hooks and skills in an existing Tiller project')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(upgradeCommand);

program
  .command('config')
  .description('Interactively update mode and workflow settings')
  .action(configCommand);

program.parse();
