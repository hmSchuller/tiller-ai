import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { ConfigMode, DashboardState, DashboardStateResponse, ToolTarget, WorkflowMode } from '../contracts.js';
import { CONFIG_MODE_OPTIONS, TOOL_OPTIONS, WORKFLOW_MODE_OPTIONS } from '../contracts.js';
import {
  DEFAULT_FORM_VALUES,
  cloneFormValues,
  getFormValuesFromState,
  getLocalRows,
  getSnapshotRows,
  getStatusFromStateResponse,
  type FormValues,
  type PanelRow,
  type Tone,
} from './view-model.js';

type AppState = {
  dashState: DashboardState | null;
  status: { message: string; tone: Tone } | null;
  formDisabled: boolean;
  form: FormValues;
};

async function readDashboardState(): Promise<DashboardStateResponse> {
  const response = await fetch('/api/config', { cache: 'no-store' });
  return (await response.json()) as DashboardStateResponse;
}

function StatusBanner(props: { status: AppState['status'] }) {
  if (!props.status) {
    return <div id="status" className="status hidden" role="status" aria-live="polite" />;
  }

  return (
    <div id="status" className={`status ${props.status.tone}`} role="status" aria-live="polite">
      {props.status.message}
    </div>
  );
}

function SnapshotPanel(props: { title: string; items: PanelRow[] }) {
  return (
    <article className="card">
      <h3>{props.title}</h3>
      <dl className="panel">
        {props.items.map((row) => (
          <div key={`${props.title}-${row.label}`} className="panel-row">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function FormSection(props: {
  form: FormValues;
  formDisabled: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onScopeChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onModeChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onWorkflowChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onToolChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const { form, formDisabled, onModeChange, onScopeChange, onSubmit, onToolChange, onWorkflowChange } = props;
  const toolLabels: Record<ToolTarget, string> = {
    claude: 'Claude Code',
    copilot: 'GitHub Copilot',
    opencode: 'OpenCode',
  };

  return (
    <section className="card">
      <h2>Update settings</h2>
      <p className="help">
        Local saves write <code>.tiller/local.json</code>. Project saves update{' '}
        <code>.tiller/tiller.json</code> and will regenerate managed files when tool selection changes.
      </p>
      <form id="config-form" className="form-grid" onSubmit={onSubmit}>
        <fieldset>
          <legend>Apply changes to</legend>
          <div className="choice-row">
            <label className="inline-choice">
              <input
                type="radio"
                name="scope"
                value="local"
                checked={form.scope === 'local'}
                disabled={formDisabled}
                onChange={onScopeChange}
              />{' '}
              Just me
            </label>
            <label className="inline-choice">
              <input
                type="radio"
                name="scope"
                value="project"
                checked={form.scope === 'project'}
                disabled={formDisabled}
                onChange={onScopeChange}
              />{' '}
              Whole project
            </label>
          </div>
        </fieldset>
        <div>
          <label htmlFor="mode">Mode</label>
          <select id="mode" name="mode" value={form.mode} disabled={formDisabled} onChange={onModeChange}>
            {CONFIG_MODE_OPTIONS.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="workflow">Workflow</label>
          <select id="workflow" name="workflow" value={form.workflow} disabled={formDisabled} onChange={onWorkflowChange}>
            {WORKFLOW_MODE_OPTIONS.map((workflow) => (
              <option key={workflow} value={workflow}>
                {workflow}
              </option>
            ))}
          </select>
        </div>
        <fieldset>
          <legend>CLI tools</legend>
          <div className="choice-row">
            {TOOL_OPTIONS.map((tool) => (
              <label key={tool} className="inline-choice">
                <input
                  type="checkbox"
                  name="tools"
                  value={tool}
                  checked={form.tools.includes(tool)}
                  disabled={formDisabled}
                  onChange={onToolChange}
                />{' '}
                {toolLabels[tool]}
              </label>
            ))}
          </div>
        </fieldset>
        <button type="submit" disabled={formDisabled}>
          Save settings
        </button>
      </form>
    </section>
  );
}

export function DashboardApp() {
  const [appState, setAppState] = useState<AppState>(() => ({
    dashState: null,
    status: { message: 'Loading dashboard…', tone: 'info' },
    formDisabled: true,
    form: cloneFormValues(DEFAULT_FORM_VALUES),
  }));

  useEffect(() => {
    let cancelled = false;

    const loadState = async (): Promise<void> => {
      try {
        const payload = await readDashboardState();

        if (cancelled) {
          return;
        }

        if (!payload.ok) {
          setAppState((currentState) => ({
            ...currentState,
            dashState: null,
            status: getStatusFromStateResponse(payload),
            formDisabled: true,
          }));
          return;
        }

        setAppState((currentState) => ({
          ...currentState,
          dashState: payload.state,
          status: getStatusFromStateResponse(payload),
          formDisabled: false,
          form: getFormValuesFromState(payload.state, currentState.form.scope),
        }));
      } catch (error) {
        if (cancelled) {
          return;
        }

        setAppState((currentState) => ({
          ...currentState,
          status: {
            message: error instanceof Error ? error.message : 'Failed to load the dashboard.',
            tone: 'error',
          },
          formDisabled: true,
        }));
      }
    };

    void loadState();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (appState.form.tools.length === 0) {
      setAppState((currentState) => ({
        ...currentState,
        status: { message: 'Choose at least one CLI tool.', tone: 'error' },
      }));
      return;
    }

    setAppState((currentState) => ({
      ...currentState,
      status: { message: 'Saving settings…', tone: 'info' },
      formDisabled: true,
    }));

    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scope: appState.form.scope,
          mode: appState.form.mode,
          workflow: appState.form.workflow,
          tools: appState.form.tools,
        }),
      });
      const payload = (await response.json()) as DashboardStateResponse;

      if (!payload.ok) {
        setAppState((currentState) => ({
          ...currentState,
          status: getStatusFromStateResponse(payload),
          formDisabled: currentState.dashState === null,
        }));
        return;
      }

      setAppState((currentState) => ({
        ...currentState,
        dashState: payload.state,
        status: payload.localIssue
          ? getStatusFromStateResponse(payload)
          : { message: 'Settings saved.', tone: 'success' },
        formDisabled: false,
        form: getFormValuesFromState(payload.state, currentState.form.scope),
      }));
    } catch (error) {
      setAppState((currentState) => ({
        ...currentState,
        status: {
          message:
            error instanceof Error
              ? error.message
              : 'Failed to save settings. Try again while the local server is still running.',
          tone: 'error',
        },
        formDisabled: currentState.dashState === null,
      }));
    }
  };

  const onScopeChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setAppState((currentState) => ({
      ...currentState,
      form: { ...currentState.form, scope: event.target.value as FormValues['scope'] },
    }));
  };

  const onModeChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    setAppState((currentState) => ({
      ...currentState,
      form: { ...currentState.form, mode: event.target.value as ConfigMode },
    }));
  };

  const onWorkflowChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    setAppState((currentState) => ({
      ...currentState,
      form: { ...currentState.form, workflow: event.target.value as WorkflowMode },
    }));
  };

  const onToolChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const tool = event.target.value as ToolTarget;

    setAppState((currentState) => {
      const tools = event.target.checked
        ? currentState.form.tools.includes(tool)
          ? currentState.form.tools
          : [...currentState.form.tools, tool]
        : currentState.form.tools.filter((currentTool) => currentTool !== tool);

      return {
        ...currentState,
        form: { ...currentState.form, tools },
      };
    });
  };

  const projectRows = appState.dashState ? getSnapshotRows(appState.dashState.project) : [];
  const localRows = appState.dashState ? getLocalRows(appState.dashState.local) : [];
  const effectiveRows = appState.dashState ? getSnapshotRows(appState.dashState.effective) : [];

  return (
    <main className="shell">
      <section className="hero">
        <h1>Tiller config dashboard</h1>
        <p>
          Review project defaults, local overrides, and the effective configuration side by side.
          Changes reuse the same save logic as <code>tiller-ai config</code>.
        </p>
      </section>
      <StatusBanner status={appState.status} />
      <div className="layout">
        <FormSection
          form={appState.form}
          formDisabled={appState.formDisabled}
          onSubmit={handleSubmit}
          onScopeChange={onScopeChange}
          onModeChange={onModeChange}
          onWorkflowChange={onWorkflowChange}
          onToolChange={onToolChange}
        />
        <section className="panel-grid">
          <SnapshotPanel title="Project values" items={projectRows} />
          <SnapshotPanel title="Local overrides" items={localRows} />
          <SnapshotPanel title="Effective config" items={effectiveRows} />
        </section>
      </div>
    </main>
  );
}
