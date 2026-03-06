import type { ChangeEvent, FormEvent } from 'react';
import type { ConfigMode, ToolTarget, WorkflowMode } from '../../contracts.js';
import { CONFIG_MODE_OPTIONS, TOOL_OPTIONS, WORKFLOW_MODE_OPTIONS } from '../../contracts.js';
import type { FormValues } from '../view-model.js';

export type SettingsFormProps = {
  form: FormValues;
  formDisabled: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onScopeChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onModeChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onWorkflowChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onToolChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

const MODE_LABELS: Record<string, string> = {
  simple: 'Simple — concise, outcome-focused responses',
  detailed: 'Detailed — explains decisions and trade-offs',
};

const WORKFLOW_LABELS: Record<string, string> = {
  solo: 'Solo — merge directly to main',
  team: 'Team — open a PR for review',
};

const TOOL_LABELS: Record<ToolTarget, string> = {
  claude: 'Claude Code',
  copilot: 'GitHub Copilot',
  opencode: 'OpenCode',
};

const SCOPE_OPTIONS = [
  { value: 'local', label: 'Just me', hint: 'writes .tiller/local.json' },
  { value: 'project', label: 'Whole project', hint: 'updates .tiller/tiller.json' },
] as const;

export function SettingsForm({
  form,
  formDisabled,
  onSubmit,
  onScopeChange,
  onModeChange,
  onWorkflowChange,
  onToolChange,
}: SettingsFormProps) {
  return (
    <section className="card">
      <h2 className="settings-form-title">Update settings</h2>
      <p className="settings-form-hint">
        Local saves write <code>.tiller/local.json</code>. Project saves update{' '}
        <code>.tiller/tiller.json</code> and regenerate managed files when tool selection changes.
      </p>

      <form id="config-form" className="settings-form" onSubmit={onSubmit}>
        <fieldset>
          <legend>Apply changes to</legend>
          <div className="choice-row">
            {SCOPE_OPTIONS.map(({ value, label, hint }) => (
              <label key={value} className="choice-item">
                <input
                  type="radio"
                  name="scope"
                  value={value}
                  checked={form.scope === value}
                  disabled={formDisabled}
                  onChange={onScopeChange}
                />
                <span>
                  {label}
                  <small style={{ display: 'block', fontSize: '0.78rem', opacity: 0.65 }}>
                    {hint}
                  </small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="form-field">
          <label className="form-label" htmlFor="mode">
            Mode
          </label>
          <select id="mode" name="mode" value={form.mode} disabled={formDisabled} onChange={onModeChange}>
            {CONFIG_MODE_OPTIONS.map((mode) => (
              <option key={mode} value={mode}>
                {MODE_LABELS[mode] ?? mode}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="workflow">
            Workflow
          </label>
          <select
            id="workflow"
            name="workflow"
            value={form.workflow}
            disabled={formDisabled}
            onChange={onWorkflowChange}
          >
            {WORKFLOW_MODE_OPTIONS.map((workflow) => (
              <option key={workflow} value={workflow}>
                {WORKFLOW_LABELS[workflow] ?? workflow}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend>CLI tools</legend>
          <div className="choice-row">
            {TOOL_OPTIONS.map((tool) => (
              <label key={tool} className="choice-item">
                <input
                  type="checkbox"
                  name="tools"
                  value={tool}
                  checked={form.tools.includes(tool)}
                  disabled={formDisabled}
                  onChange={onToolChange}
                />
                {TOOL_LABELS[tool]}
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" className="save-btn" disabled={formDisabled}>
          Save settings
        </button>
      </form>
    </section>
  );
}
