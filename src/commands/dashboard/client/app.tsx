import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { DashboardStateResponse } from '../contracts.js';
import { isConfigMode, isConfigScope, isToolTarget, isWorkflowMode } from '../contracts.js';
import {
  type DashboardStatus,
  getLocalRows,
  getSnapshotRows,
  type FormValues,
  type PanelRow,
} from './view-model.js';
import {
  applyLoadError,
  applyLoadResponse,
  applyNoToolsValidation,
  applySaveError,
  applySaveResponse,
  applySaveStart,
  createInitialAppState,
  type DashboardAppState,
  updateMode,
  updateScope,
  updateToolSelection,
  updateWorkflow,
} from './state.js';
import { Hero } from './components/Hero.js';
import { StatusBanner } from './components/StatusBanner.js';
import { SnapshotCard } from './components/SnapshotCard.js';
import { SettingsForm } from './components/SettingsForm.js';

async function readDashboardState(): Promise<DashboardStateResponse> {
  const response = await fetch('/api/config', { cache: 'no-store' });
  return (await response.json()) as DashboardStateResponse;
}

/** Pure presentational view — no hooks, safe to use with renderToStaticMarkup. */
export type DashboardViewProps = {
  status: DashboardStatus | null;
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
  const [appState, setAppState] = useState<DashboardAppState>(createInitialAppState);

  useEffect(() => {
    let cancelled = false;

    const loadState = async (): Promise<void> => {
      try {
        const payload = await readDashboardState();

        if (cancelled) {
          return;
        }

        setAppState((currentState) => applyLoadResponse(currentState, payload));
      } catch (error) {
        if (cancelled) {
          return;
        }

        setAppState((currentState) => applyLoadError(currentState, error));
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
      setAppState(applyNoToolsValidation);
      return;
    }

    setAppState(applySaveStart);

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

      setAppState((currentState) => applySaveResponse(currentState, payload));
    } catch (error) {
      setAppState((currentState) => applySaveError(currentState, error));
    }
  };

  const onScopeChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const scope = event.target.value;
    if (!isConfigScope(scope)) {
      return;
    }

    setAppState((currentState) => updateScope(currentState, scope));
  };

  const onModeChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const mode = event.target.value;
    if (!isConfigMode(mode)) {
      return;
    }

    setAppState((currentState) => updateMode(currentState, mode));
  };

  const onWorkflowChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const workflow = event.target.value;
    if (!isWorkflowMode(workflow)) {
      return;
    }

    setAppState((currentState) => updateWorkflow(currentState, workflow));
  };

  const onToolChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const tool = event.target.value;
    if (!isToolTarget(tool)) {
      return;
    }

    setAppState((currentState) => updateToolSelection(currentState, tool, event.target.checked));
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
