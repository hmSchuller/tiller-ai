import { intro, outro, spinner, select, multiselect, isCancel, cancel } from '@clack/prompts';
import type { ToolTarget } from '../scaffold/types.js';
import {
  readConfig,
  getEffectiveConfig,
  isProjectNoOp,
  isLocalNoOp,
  saveProjectConfig,
  saveLocalConfig,
  type ReadConfigResult,
  type SaveConfigResult,
} from './config-shared.js';

function getReadFailureMessage(result: Extract<ReadConfigResult, { ok: false }>): string {
  if (result.reason === 'missing') {
    return 'No .tiller/tiller.json found. Is this a Tiller project?';
  }

  return 'Failed to read .tiller/tiller.json.';
}

function toSaveError(result: Extract<SaveConfigResult, { ok: false }>): Error {
  const message =
    result.reason === 'write-failed'
      ? `Failed to save ${result.scope} settings.`
      : `Failed to update ${result.scope} managed files.`;

  return new Error(message, { cause: result.cause });
}

export async function configCommand(): Promise<void> {
  intro('tiller-ai config — update mode and workflow');

  const cwd = process.cwd();
  const readResult = await readConfig(cwd);

  if (!readResult.ok) {
    cancel(getReadFailureMessage(readResult));
    process.exit(1);
  }

  const { manifest, local } = readResult;
  const { mode: currentMode, workflow: currentWorkflow, tools: currentTools } = getEffectiveConfig(manifest, local);

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

  if (isProjectScope) {
    if (isProjectNoOp(manifest, newMode, newWorkflow, newTools)) {
      outro('No changes — project settings already match.');
      return;
    }
  } else {
    if (isLocalNoOp(local, newMode, newWorkflow, newTools)) {
      outro('No changes — local settings already match.');
      return;
    }
  }

  const s = spinner();

  if (isProjectScope) {
    s.start('Updating project settings...');
    const result = await saveProjectConfig(manifest, newMode, newWorkflow, newTools, cwd);
    if (!result.ok) {
      s.stop('Failed.');
      throw toSaveError(result);
    }
    s.stop('Done!');
    outro('Project settings updated. Commit .tiller/tiller.json to share with the team.');
  } else {
    s.start('Saving personal settings...');
    const result = await saveLocalConfig(manifest, local, newMode, newWorkflow, newTools, cwd);
    if (!result.ok) {
      s.stop('Failed.');
      throw toSaveError(result);
    }
    s.stop('Done!');
    outro('Personal settings saved to .tiller/local.json (gitignored).');
  }
}
