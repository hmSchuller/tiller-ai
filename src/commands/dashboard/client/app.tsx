import { useEffect, useState, useRef, useCallback, type ChangeEvent, type FormEvent } from 'react';
import type { DashboardStateResponse, SessionSummary, SessionDetailResponse } from '../contracts.js';
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
  clearSelectedSession,
  createInitialAppState,
  type DashboardAppState,
  type DashboardTab,
  selectSession,
  setSessions,
  switchTab,
  updateMode,
  updateScope,
  updateToolSelection,
  updateWorkflow,
} from './state.js';
import { Hero } from './components/Hero.js';
import { StatusBanner } from './components/StatusBanner.js';
import { SnapshotCard } from './components/SnapshotCard.js';
import { SettingsForm } from './components/SettingsForm.js';
import { TabBar } from './components/TabBar.js';
import { SessionList } from './components/SessionList.js';
import { SessionDetail } from './components/SessionDetail.js';

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
  activeTab: DashboardTab;
  sessions: SessionSummary[];
  selectedSession: SessionDetailResponse | null;
  sessionsLoading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onScopeChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onModeChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onWorkflowChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onToolChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onTabChange: (id: string) => void;
  onSelectSession: (slug: string) => void;
  onBackToSessions: () => void;
  onSendMessage: (agentName: string, content: string) => void;
  onDeleteMessage: (agentName: string, messageIndex: number) => void;
};

const DASHBOARD_TABS = [
  { id: 'config', label: 'Config' },
  { id: 'sessions', label: 'Sessions' },
];

export function DashboardView({
  status,
  formDisabled,
  form,
  projectRows,
  localRows,
  effectiveRows,
  activeTab,
  sessions,
  selectedSession,
  sessionsLoading,
  onSubmit,
  onScopeChange,
  onModeChange,
  onWorkflowChange,
  onToolChange,
  onTabChange,
  onSelectSession,
  onBackToSessions,
  onSendMessage,
  onDeleteMessage,
}: DashboardViewProps) {
  return (
    <main className="shell">
      <Hero />
      <TabBar tabs={DASHBOARD_TABS} activeTab={activeTab} onTabChange={onTabChange} />
      <StatusBanner status={status} />
      {activeTab === 'config' ? (
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
      ) : sessionsLoading && sessions.length === 0 && !selectedSession ? (
        <div className="empty-state">Loading sessions…</div>
      ) : selectedSession ? (
        <SessionDetail session={selectedSession} onBack={onBackToSessions} onSendMessage={onSendMessage} onDeleteMessage={onDeleteMessage} />
      ) : (
        <SessionList sessions={sessions} onSelectSession={onSelectSession} />
      )}
    </main>
  );
}

export function DashboardApp() {
  const [appState, setAppState] = useState<DashboardAppState>(createInitialAppState);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeTabRef = useRef<DashboardTab>(appState.activeTab);
  const selectedSessionRef = useRef<string | null>(null);

  // Keep refs in sync with state
  activeTabRef.current = appState.activeTab;
  selectedSessionRef.current = appState.selectedSession?.id ?? null;

  const fetchSessions = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/sessions', { cache: 'no-store' });
      const data = (await response.json()) as unknown;
      if (!Array.isArray(data)) return;
      setAppState((current) => setSessions(current, data as SessionSummary[]));
    } catch {
      // Silently ignore polling errors
    }
  }, []);

  const fetchSessionDetail = useCallback(async (slug: string): Promise<void> => {
    try {
      const response = await fetch(`/api/sessions/${encodeURIComponent(slug)}`, { cache: 'no-store' });
      if (!response.ok) return;
      const detail = (await response.json()) as SessionDetailResponse;
      setAppState((current) => selectSession(current, detail));
    } catch {
      // Silently ignore polling errors
    }
  }, []);

  const pollCurrentView = useCallback(async (): Promise<void> => {
    if (activeTabRef.current !== 'sessions') return;

    const selectedSlug = selectedSessionRef.current;
    if (selectedSlug) {
      await fetchSessionDetail(selectedSlug);
    } else {
      await fetchSessions();
    }
  }, [fetchSessions, fetchSessionDetail]);

  // Polling lifecycle for sessions tab
  useEffect(() => {
    if (appState.activeTab !== 'sessions') {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    // Fetch immediately when switching to sessions tab
    void pollCurrentView();

    pollIntervalRef.current = setInterval(() => {
      void pollCurrentView();
    }, 3000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [appState.activeTab, appState.selectedSession?.id, pollCurrentView]);

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

  const onTabChange = (id: string): void => {
    setAppState((currentState) => switchTab(currentState, id as DashboardTab));
  };

  const onSelectSession = (slug: string): void => {
    setAppState((current) => ({ ...current, sessionsLoading: true }));
    void fetchSessionDetail(slug);
  };

  const onBackToSessions = (): void => {
    setAppState((current) => clearSelectedSession(current));
  };

  const onSendMessage = async (agentName: string, content: string): Promise<void> => {
    const sessionId = appState.selectedSession?.id;
    if (!sessionId) return;

    try {
      await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/inbox/${encodeURIComponent(agentName)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      // Re-fetch session detail to see the message
      await fetchSessionDetail(sessionId);
    } catch {
      // Silently ignore send errors
    }
  };

  const onDeleteMessage = async (agentName: string, messageIndex: number): Promise<void> => {
    const sessionId = appState.selectedSession?.id;
    if (!sessionId) return;

    try {
      await fetch(
        `/api/sessions/${encodeURIComponent(sessionId)}/inbox/${encodeURIComponent(agentName)}/${messageIndex}`,
        { method: 'DELETE' },
      );
      await fetchSessionDetail(sessionId);
    } catch {
      // Silently ignore delete errors
    }
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
      activeTab={appState.activeTab}
      sessions={appState.sessions}
      selectedSession={appState.selectedSession}
      sessionsLoading={appState.sessionsLoading}
      onSubmit={handleSubmit}
      onScopeChange={onScopeChange}
      onModeChange={onModeChange}
      onWorkflowChange={onWorkflowChange}
      onToolChange={onToolChange}
      onTabChange={onTabChange}
      onSelectSession={onSelectSession}
      onBackToSessions={onBackToSessions}
      onSendMessage={onSendMessage}
      onDeleteMessage={onDeleteMessage}
    />
  );
}
