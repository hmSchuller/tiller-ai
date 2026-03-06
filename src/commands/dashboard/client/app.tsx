import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { ConfigMode, DashboardState, DashboardStateResponse, ToolTarget, WorkflowMode } from '../contracts.js';
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
import { Hero } from './components/Hero.js';
import { StatusBanner } from './components/StatusBanner.js';
import { SnapshotCard } from './components/SnapshotCard.js';
import { SettingsForm } from './components/SettingsForm.js';

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

/** Pure presentational view — no hooks, safe to use with renderToStaticMarkup. */
export type DashboardViewProps = {
  status: { message: string; tone: Tone } | null;
  formDisabled: boolean;
  form: FormValues;
  projectRows: PanelRow[];
  localRows: PanelRow[];
  effectiveRows: PanelRow[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onScopeChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onModeChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onWorkflowChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onToolChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function DashboardView({
  status,
  formDisabled,
  form,
  projectRows,
  localRows,
  effectiveRows,
  onSubmit,
  onScopeChange,
  onModeChange,
  onWorkflowChange,
  onToolChange,
}: DashboardViewProps) {
  return (
    <main className="shell">
      <Hero />
      <StatusBanner status={status} />
      <div className="layout">
        <SettingsForm
          form={form}
          formDisabled={formDisabled}
          onSubmit={onSubmit}
          onScopeChange={onScopeChange}
          onModeChange={onModeChange}
          onWorkflowChange={onWorkflowChange}
          onToolChange={onToolChange}
        />
        <section className="panel-grid">
          <SnapshotCard title="Project values" items={projectRows} />
          <SnapshotCard title="Local overrides" items={localRows} />
          <SnapshotCard title="Effective config" items={effectiveRows} />
        </section>
      </div>
    </main>
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
    <DashboardView
      status={appState.status}
      formDisabled={appState.formDisabled}
      form={appState.form}
      projectRows={projectRows}
      localRows={localRows}
      effectiveRows={effectiveRows}
      onSubmit={handleSubmit}
      onScopeChange={onScopeChange}
      onModeChange={onModeChange}
      onWorkflowChange={onWorkflowChange}
      onToolChange={onToolChange}
    />
  );
}
