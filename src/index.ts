import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { upgradeCommand } from './commands/upgrade.js';
import { modeCommand } from './commands/mode.js';

const program = new Command();

program
  .name('tiller')
  .description('Scaffold Claude Code projects with a structured vibe loop')
  .version('0.1.0');

program
  .command('init')
  .description('Scaffold Tiller files in the current directory')
  .action(initCommand);

program
  .command('upgrade')
  .description('Update hooks and skills in an existing Tiller project')
  .action(upgradeCommand);

program
  .command('mode')
  .description('Switch between simple and detailed mode')
  .argument('<mode>', 'Mode: simple or detailed')
  .option('--project', 'Set the shared project default instead of your personal override')
  .action(modeCommand);

program.parse();
