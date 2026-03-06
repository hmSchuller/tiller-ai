import type { ChangeEvent, FormEvent } from 'react';
import {
  CONFIG_MODE_LABELS,
  CONFIG_MODE_OPTIONS,
  TOOL_LABELS,
  TOOL_OPTIONS,
  WORKFLOW_MODE_LABELS,
  WORKFLOW_MODE_OPTIONS,
} from '../../contracts.js';
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

const SCOPE_OPTIONS = [
  { value: 'local', label: 'Just me', hint: 'writes .tiller/local.json' },
  { value: 'project', label: 'Whole project', hint: 'updates .tiller/tiller.json' },
] as const;

const FORM_HINT_ID = 'settings-form-hint';
const SCOPE_HINT_ID = 'settings-scope-hint';
const TOOL_HINT_ID = 'settings-tool-hint';

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
      <p id={FORM_HINT_ID} className="settings-form-hint">
        Local saves write <code>.tiller/local.json</code>. Project saves update{' '}
        <code>.tiller/tiller.json</code> and regenerate managed files when tool selection changes.
      </p>

      <form id="config-form" className="settings-form" aria-describedby={FORM_HINT_ID} onSubmit={onSubmit}>
        <fieldset aria-describedby={SCOPE_HINT_ID}>
          <legend>Apply changes to</legend>
          <p id={SCOPE_HINT_ID} className="field-hint">
            Choose whether this save updates your personal override or the shared project defaults.
          </p>
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
                <span className="choice-item-copy">
                  <span className="choice-item-label">{label}</span>
                  <span className="choice-item-hint">{hint}</span>
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
                {CONFIG_MODE_LABELS[mode] ?? mode}
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
                {WORKFLOW_MODE_LABELS[workflow] ?? workflow}
              </option>
            ))}
          </select>
        </div>

        <fieldset aria-describedby={TOOL_HINT_ID}>
          <legend>CLI tools</legend>
          <p id={TOOL_HINT_ID} className="field-hint">
            Select one or more supported CLI targets to keep their generated files in sync.
          </p>
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
                <span className="choice-item-label">{TOOL_LABELS[tool]}</span>
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
