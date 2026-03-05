import { intro, outro, spinner, select, multiselect, isCancel, cancel } from '@clack/prompts';
import { resolve, basename } from 'node:path';
import { scaffold } from '../scaffold/index.js';
import type { ProjectConfig, ToolTarget } from '../scaffold/types.js';

const VALID_TOOLS: ToolTarget[] = ['claude', 'copilot', 'opencode'];

export async function initCommand(opts: { yes?: boolean; mode?: string; workflow?: string; tools?: string } = {}): Promise<void> {
  const targetDir = resolve(process.cwd());
  const projectName = basename(targetDir);

  intro('tiller-ai init');

  let mode: 'simple' | 'detailed';
  let workflow: 'solo' | 'team';
  let tools: ToolTarget[];

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

    if (opts.tools) {
      const parsed = opts.tools.split(',').map((t) => t.trim()) as ToolTarget[];
      const invalid = parsed.filter((t) => !VALID_TOOLS.includes(t));
      if (invalid.length > 0) {
        cancel(`Invalid tool(s): ${invalid.join(', ')}. Must be one or more of: ${VALID_TOOLS.join(', ')}`);
        process.exit(1);
      }
      tools = parsed;
    } else {
      tools = ['claude'];
    }
  } else {
    const toolsAnswer = await multiselect({
      message: 'Which AI coding tools do you use?',
      options: [
        { value: 'claude', label: 'Claude Code', hint: 'Anthropic\'s CLI — skills, agents, hooks' },
        { value: 'copilot', label: 'GitHub Copilot', hint: 'Copilot coding agent — custom instructions' },
        { value: 'opencode', label: 'OpenCode', hint: 'Open-source CLI — skills, agents, commands' },
      ],
      required: true,
    });

    if (isCancel(toolsAnswer)) {
      process.exit(0);
    }

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

    tools = toolsAnswer as ToolTarget[];
    mode = modeAnswer as 'simple' | 'detailed';
    workflow = workflowAnswer as 'solo' | 'team';
  }

  const config: ProjectConfig = {
    projectName,
    description: '',
    runCommand: '',
    mode,
    workflow,
    tools,
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

  const toolNames = tools.map((t) => {
    if (t === 'claude') return 'Claude Code';
    if (t === 'copilot') return 'GitHub Copilot';
    return 'OpenCode';
  });

  outro(
    `Scaffolded in ./${projectName}\n\n` +
    `  Tools: ${toolNames.join(', ')}\n\n` +
    `Then run /setup to configure the project with AI assistance.`
  );
}
