import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DashboardStateResponse, SessionSummary, SessionDetailResponse } from '../../src/commands/dashboard/contracts.js';
import {
  DEFAULT_FORM_VALUES,
  getFormValuesFromState,
  getLocalRows,
  getSnapshotRows,
  getStatusFromStateResponse,
} from '../../src/commands/dashboard/client/view-model.js';
import { SettingsForm } from '../../src/commands/dashboard/client/components/SettingsForm.js';
import { StatusBanner } from '../../src/commands/dashboard/client/components/StatusBanner.js';
import { SnapshotCard } from '../../src/commands/dashboard/client/components/SnapshotCard.js';
import { Hero } from '../../src/commands/dashboard/client/components/Hero.js';
import { buildCssVarBlock } from '../../src/commands/dashboard/client/theme.js';
import type { DashboardViewProps } from '../../src/commands/dashboard/client/app.js';
import { DashboardView } from '../../src/commands/dashboard/client/app.js';
import { TabBar } from '../../src/commands/dashboard/client/components/TabBar.js';
import { SessionList } from '../../src/commands/dashboard/client/components/SessionList.js';
import { SessionDetail } from '../../src/commands/dashboard/client/components/SessionDetail.js';
import {
  applyLoadError,
  applyLoadResponse,
  applyNoToolsValidation,
  applySaveError,
  applySaveResponse,
  applySaveStart,
  clearSelectedSession,
  createInitialAppState,
  selectSession,
  setSessions,
  switchTab,
  updateScope,
  updateToolSelection,
} from '../../src/commands/dashboard/client/state.js';

// ── view-model pure logic ─────────────────────────────────────────────────────

describe('dashboard client view model', () => {
  it('maps successful dashboard responses into form values from the effective state', () => {
    const response: DashboardStateResponse = {
      ok: true,
      state: {
        project: { mode: 'detailed', workflow: 'solo', tools: ['claude'] },
        local: { mode: 'simple', workflow: null, tools: ['claude', 'copilot'] },
        effective: { mode: 'simple', workflow: 'solo', tools: ['claude', 'copilot'] },
      },
    };

    expect(getFormValuesFromState(response.state, DEFAULT_FORM_VALUES.scope)).toEqual({
      scope: 'local',
      mode: 'simple',
      workflow: 'solo',
      tools: ['claude', 'copilot'],
    });
    expect(getStatusFromStateResponse(response)).toBeNull();
  });

  it('uses project values when the form is switched to project scope', () => {
    const response: DashboardStateResponse = {
      ok: true,
      state: {
        project: { mode: 'detailed', workflow: 'solo', tools: ['claude'] },
        local: { mode: 'simple', workflow: 'team', tools: ['claude', 'copilot'] },
        effective: { mode: 'simple', workflow: 'team', tools: ['claude', 'copilot'] },
      },
    };

    expect(getFormValuesFromState(response.state, 'project')).toEqual({
      scope: 'project',
      mode: 'detailed',
      workflow: 'solo',
      tools: ['claude'],
    });
  });

  it('surfaces local parse issues as a warning and formats panel rows from shared snapshots', () => {
    const response: DashboardStateResponse = {
      ok: true,
      state: {
        project: { mode: 'detailed', workflow: 'solo', tools: ['claude'] },
        local: { mode: null, workflow: 'team', tools: null },
        effective: { mode: 'detailed', workflow: 'team', tools: ['claude'] },
      },
      localIssue: {
        scope: 'local',
        reason: 'parse-error',
        message: 'Failed to parse .tiller/local.json. Falling back to project settings.',
      },
    };

    expect(getStatusFromStateResponse(response)).toEqual({
      message: 'Failed to parse .tiller/local.json. Falling back to project settings.',
      tone: 'warn',
    });
    expect(getSnapshotRows(response.state.project)).toEqual([
      { label: 'Mode', value: 'detailed' },
      { label: 'Workflow', value: 'solo' },
      { label: 'Tools', value: 'claude' },
    ]);
    expect(getLocalRows(response.state.local)).toEqual([
      { label: 'Mode', value: 'Not set' },
      { label: 'Workflow', value: 'team' },
      { label: 'Tools', value: 'Not set' },
    ]);
  });

  it('surfaces fatal API failures as an error status', () => {
    const response: DashboardStateResponse = {
      ok: false,
      error: {
        scope: 'project',
        reason: 'missing',
        message: 'No .tiller/tiller.json found. Is this a Tiller project?',
      },
    };

    expect(getStatusFromStateResponse(response)).toEqual({
      message: 'No .tiller/tiller.json found. Is this a Tiller project?',
      tone: 'error',
    });
  });
});

describe('dashboard client state', () => {
  it('hydrates the app state from a successful load response', () => {
    const nextState = applyLoadResponse(createInitialAppState(), {
      ok: true,
      state: {
        project: { mode: 'detailed', workflow: 'solo', tools: ['claude'] },
        local: { mode: 'simple', workflow: null, tools: ['copilot'] },
        effective: { mode: 'simple', workflow: 'solo', tools: ['copilot'] },
      },
    });

    expect(nextState.formDisabled).toBe(false);
    expect(nextState.dashState?.effective.tools).toEqual(['copilot']);
    expect(nextState.form).toEqual({
      scope: 'local',
      mode: 'simple',
      workflow: 'solo',
      tools: ['copilot'],
    });
  });

  it('disables the form on fatal load failures', () => {
    const nextState = applyLoadResponse(createInitialAppState(), {
      ok: false,
      error: {
        scope: 'project',
        reason: 'missing',
        message: 'No .tiller/tiller.json found. Is this a Tiller project?',
      },
    });

    expect(nextState.dashState).toBeNull();
    expect(nextState.formDisabled).toBe(true);
    expect(nextState.status).toEqual({
      message: 'No .tiller/tiller.json found. Is this a Tiller project?',
      tone: 'error',
    });
  });

  it('reports client-side empty-tool validation before save', () => {
    const nextState = applyNoToolsValidation(createInitialAppState());
    expect(nextState.status).toEqual({ message: 'Choose at least one CLI tool.', tone: 'error' });
  });

  it('tracks save success, warning, and fatal project failures', () => {
    const loadedState = applyLoadResponse(createInitialAppState(), {
      ok: true,
      state: {
        project: { mode: 'detailed', workflow: 'solo', tools: ['claude'] },
        local: { mode: 'simple', workflow: null, tools: ['copilot'] },
        effective: { mode: 'simple', workflow: 'solo', tools: ['copilot'] },
      },
    });
    const savingState = applySaveStart(loadedState);

    expect(savingState.status).toEqual({ message: 'Saving settings…', tone: 'info' });
    expect(savingState.formDisabled).toBe(true);

    const warnedState = applySaveResponse(loadedState, {
      ok: true,
      state: loadedState.dashState!,
      localIssue: {
        scope: 'local',
        reason: 'parse-error',
        message: 'Failed to parse .tiller/local.json. Falling back to project settings.',
      },
    });
    expect(warnedState.status).toEqual({
      message: 'Failed to parse .tiller/local.json. Falling back to project settings.',
      tone: 'warn',
    });
    expect(warnedState.formDisabled).toBe(false);

    const failedState = applySaveResponse(loadedState, {
      ok: false,
      error: {
        scope: 'project',
        reason: 'missing',
        message: 'No .tiller/tiller.json found. Is this a Tiller project?',
      },
    });
    expect(failedState.dashState).toBeNull();
    expect(failedState.formDisabled).toBe(true);
  });

  it('supports scope switching and resilient save/load errors', () => {
    const loadedState = applyLoadResponse(createInitialAppState(), {
      ok: true,
      state: {
        project: { mode: 'detailed', workflow: 'solo', tools: ['claude'] },
        local: { mode: 'simple', workflow: null, tools: ['copilot'] },
        effective: { mode: 'simple', workflow: 'solo', tools: ['copilot'] },
      },
    });

    const projectScopedState = updateScope(loadedState, 'project');
    expect(projectScopedState.form).toEqual({
      scope: 'project',
      mode: 'detailed',
      workflow: 'solo',
      tools: ['claude'],
    });

    const updatedToolsState = updateToolSelection(projectScopedState, 'copilot', true);
    expect(updatedToolsState.form.tools).toEqual(['claude', 'copilot']);

    const loadErrorState = applyLoadError(loadedState, new Error('load failed'));
    expect(loadErrorState.status).toEqual({ message: 'load failed', tone: 'error' });
    expect(loadErrorState.formDisabled).toBe(true);

    const saveErrorState = applySaveError(loadedState, new Error('save failed'));
    expect(saveErrorState.status).toEqual({ message: 'save failed', tone: 'error' });
    expect(saveErrorState.formDisabled).toBe(false);
  });

  it('defaults activeTab to config and switches via switchTab', () => {
    const initial = createInitialAppState();
    expect(initial.activeTab).toBe('config');

    const switched = switchTab(initial, 'sessions');
    expect(switched.activeTab).toBe('sessions');

    const switchedBack = switchTab(switched, 'config');
    expect(switchedBack.activeTab).toBe('config');
  });
});

// ── theme ─────────────────────────────────────────────────────────────────────

describe('dashboard theme', () => {
  it('buildCssVarBlock produces a :root block containing custom properties', () => {
    const block = buildCssVarBlock();
    expect(block).toMatch(/^:root \{/);
    expect(block).toContain('--color-bg:');
    expect(block).toContain('--color-accent:');
    expect(block).toContain('--font-family:');
    expect(block).toMatch(/\}$/);
  });
});

// ── presentational components (renderToStaticMarkup) ─────────────────────────

describe('Hero component', () => {
  it('renders with default title and badge', () => {
    const html = renderToStaticMarkup(createElement(Hero));
    expect(html).toContain('Tiller Config Dashboard');
    expect(html).toContain('hero-badge');
    expect(html).toContain('hero-title');
  });

  it('renders with a custom title', () => {
    const html = renderToStaticMarkup(createElement(Hero, { title: 'Custom Title' }));
    expect(html).toContain('Custom Title');
  });
});

describe('StatusBanner component', () => {
  it('renders a hidden placeholder when status is null', () => {
    const html = renderToStaticMarkup(createElement(StatusBanner, { status: null }));
    expect(html).toContain('status-banner hidden');
    expect(html).toContain('aria-hidden="true"');
  });

  it('renders info tone with correct class', () => {
    const html = renderToStaticMarkup(
      createElement(StatusBanner, { status: { message: 'Loading dashboard…', tone: 'info' } }),
    );
    expect(html).toContain('status-banner info');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-atomic="true"');
    expect(html).toContain('Loading dashboard');
  });

  it('renders success tone', () => {
    const html = renderToStaticMarkup(
      createElement(StatusBanner, { status: { message: 'Settings saved.', tone: 'success' } }),
    );
    expect(html).toContain('status-banner success');
    expect(html).toContain('Settings saved.');
  });

  it('renders warn tone', () => {
    const html = renderToStaticMarkup(
      createElement(StatusBanner, {
        status: { message: 'Failed to parse local.json.', tone: 'warn' },
      }),
    );
    expect(html).toContain('status-banner warn');
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
  });

  it('renders error tone', () => {
    const html = renderToStaticMarkup(
      createElement(StatusBanner, {
        status: { message: 'No tiller.json found.', tone: 'error' },
      }),
    );
    expect(html).toContain('status-banner error');
    expect(html).toContain('role="alert"');
    expect(html).toContain('No tiller.json found.');
  });
});

describe('SettingsForm component', () => {
  it('describes the scope and tools groups for assistive technology', () => {
    const html = renderToStaticMarkup(
      createElement(SettingsForm, {
        form: { ...DEFAULT_FORM_VALUES, tools: ['claude'] },
        formDisabled: false,
        onSubmit: () => {},
        onScopeChange: () => {},
        onModeChange: () => {},
        onWorkflowChange: () => {},
        onToolChange: () => {},
      }),
    );

    expect(html).toContain('aria-describedby="settings-form-hint"');
    expect(html).toContain('id="settings-scope-hint"');
    expect(html).toContain('Choose whether this save updates your personal override');
    expect(html).toContain('id="settings-tool-hint"');
    expect(html).toContain('keep their generated files in sync');
  });
});

describe('SnapshotCard component', () => {
  it('renders panel rows', () => {
    const html = renderToStaticMarkup(
      createElement(SnapshotCard, {
        title: 'Project values',
        items: [
          { label: 'Mode', value: 'detailed' },
          { label: 'Workflow', value: 'solo' },
          { label: 'Tools', value: 'claude' },
        ],
      }),
    );
    expect(html).toContain('Project values');
    expect(html).toContain('Mode');
    expect(html).toContain('detailed');
    expect(html).toContain('claude');
  });

  it('renders empty state when items list is empty', () => {
    const html = renderToStaticMarkup(
      createElement(SnapshotCard, { title: 'Local overrides', items: [] }),
    );
    expect(html).toContain('No data available');
  });
});

describe('TabBar component', () => {
  const tabs = [
    { id: 'config', label: 'Config' },
    { id: 'sessions', label: 'Sessions' },
  ];

  it('renders all tabs with correct labels', () => {
    const html = renderToStaticMarkup(
      createElement(TabBar, { tabs, activeTab: 'config', onTabChange: () => {} }),
    );
    expect(html).toContain('Config');
    expect(html).toContain('Sessions');
    expect(html).toContain('role="tablist"');
  });

  it('marks the active tab with aria-selected true', () => {
    const html = renderToStaticMarkup(
      createElement(TabBar, { tabs, activeTab: 'config', onTabChange: () => {} }),
    );
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('aria-selected="false"');
  });

  it('applies active class only to the selected tab', () => {
    const html = renderToStaticMarkup(
      createElement(TabBar, { tabs, activeTab: 'sessions', onTabChange: () => {} }),
    );
    // The sessions tab should have the active class
    expect(html).toContain('tab-button active');
  });

  it('renders each tab with role="tab"', () => {
    const html = renderToStaticMarkup(
      createElement(TabBar, { tabs, activeTab: 'config', onTabChange: () => {} }),
    );
    // Two tab roles expected
    const tabRoleCount = (html.match(/role="tab"/g) || []).length;
    expect(tabRoleCount).toBe(2);
  });
});

// ── DashboardView (presentational root) ──────────────────────────────────────

function makeViewProps(
  overrides: Partial<DashboardViewProps> = {},
): DashboardViewProps {
  const noop = () => {};
  return {
    status: null,
    formDisabled: false,
    form: { ...DEFAULT_FORM_VALUES, tools: ['claude'] },
    projectRows: [{ label: 'Mode', value: 'detailed' }],
    localRows: [],
    effectiveRows: [{ label: 'Mode', value: 'detailed' }],
    activeTab: 'config',
    sessions: [],
    selectedSession: null,
    sessionsLoading: false,
    onSubmit: noop,
    onScopeChange: noop,
    onModeChange: noop,
    onWorkflowChange: noop,
    onToolChange: noop,
    onTabChange: noop,
    onSelectSession: noop,
    onBackToSessions: noop,
    onSendMessage: noop,
    ...overrides,
  };
}

describe('DashboardView component', () => {
  it('renders the hero section', () => {
    const html = renderToStaticMarkup(createElement(DashboardView, makeViewProps()));
    expect(html).toContain('Tiller Config Dashboard');
    expect(html).toContain('hero-badge');
  });

  it('renders a hidden status placeholder when status is null', () => {
    const html = renderToStaticMarkup(
      createElement(DashboardView, makeViewProps({ status: null })),
    );
    expect(html).toContain('status-banner hidden');
  });

  it('renders a loading state with info banner', () => {
    const html = renderToStaticMarkup(
      createElement(
        DashboardView,
        makeViewProps({
          status: { message: 'Loading dashboard…', tone: 'info' },
          formDisabled: true,
        }),
      ),
    );
    expect(html).toContain('status-banner info');
    expect(html).toContain('Loading dashboard');
  });

  it('renders a fatal project error with error banner and disabled form', () => {
    const html = renderToStaticMarkup(
      createElement(
        DashboardView,
        makeViewProps({
          status: {
            message: 'No .tiller/tiller.json found. Is this a Tiller project?',
            tone: 'error',
          },
          formDisabled: true,
          projectRows: [],
          localRows: [],
          effectiveRows: [],
        }),
      ),
    );
    expect(html).toContain('status-banner error');
    expect(html).toContain('tiller.json');
  });

  it('renders a local warning with warn banner', () => {
    const html = renderToStaticMarkup(
      createElement(
        DashboardView,
        makeViewProps({
          status: {
            message: 'Failed to parse .tiller/local.json. Falling back to project settings.',
            tone: 'warn',
          },
        }),
      ),
    );
    expect(html).toContain('status-banner warn');
    expect(html).toContain('local.json');
  });

  it('renders a success state after save', () => {
    const html = renderToStaticMarkup(
      createElement(
        DashboardView,
        makeViewProps({
          status: { message: 'Settings saved.', tone: 'success' },
        }),
      ),
    );
    expect(html).toContain('status-banner success');
    expect(html).toContain('Settings saved.');
  });

  it('renders all three snapshot panels', () => {
    const html = renderToStaticMarkup(
      createElement(
        DashboardView,
        makeViewProps({
          projectRows: [{ label: 'Mode', value: 'detailed' }],
          localRows: [{ label: 'Mode', value: 'simple' }],
          effectiveRows: [{ label: 'Mode', value: 'simple' }],
        }),
      ),
    );
    expect(html).toContain('Project values');
    expect(html).toContain('Local overrides');
    expect(html).toContain('Effective config');
  });

  it('renders the settings form with local scope selected by default', () => {
    const html = renderToStaticMarkup(createElement(DashboardView, makeViewProps()));
    expect(html).toContain('config-form');
    expect(html).toContain('Save settings');
  });

  it('renders the tab bar with Config and Sessions tabs', () => {
    const html = renderToStaticMarkup(createElement(DashboardView, makeViewProps()));
    expect(html).toContain('role="tablist"');
    expect(html).toContain('Config');
    expect(html).toContain('Sessions');
  });

  it('shows config content when activeTab is config', () => {
    const html = renderToStaticMarkup(
      createElement(DashboardView, makeViewProps({ activeTab: 'config' })),
    );
    expect(html).toContain('panel-grid');
    expect(html).not.toContain('session-list');
  });

  it('shows session list empty state when activeTab is sessions with no sessions', () => {
    const html = renderToStaticMarkup(
      createElement(DashboardView, makeViewProps({ activeTab: 'sessions', sessions: [] })),
    );
    expect(html).toContain('empty-state');
    expect(html).toContain('No sessions yet');
    expect(html).not.toContain('panel-grid');
  });

  it('shows session list with cards when activeTab is sessions with data', () => {
    const sessions: SessionSummary[] = [
      { id: 'feature-auth', branch: 'feature/auth', startedAt: '2024-01-15T10:00:00Z', status: 'active', agentCount: 2, activeAgentCount: 1 },
    ];
    const html = renderToStaticMarkup(
      createElement(DashboardView, makeViewProps({ activeTab: 'sessions', sessions })),
    );
    expect(html).toContain('feature/auth');
    expect(html).toContain('session-card');
    expect(html).toContain('status-badge');
    expect(html).not.toContain('panel-grid');
  });

  it('shows session detail when a session is selected', () => {
    const selectedSession: SessionDetailResponse = {
      id: 'feature-auth',
      branch: 'feature/auth',
      startedAt: '2024-01-15T10:00:00Z',
      status: 'active',
      agents: [
        {
          name: 'scout',
          type: 'specialist',
          status: 'active',
          startedAt: '2024-01-15T10:01:00Z',
          log: '',
          inbox: [],
        },
      ],
    };
    const html = renderToStaticMarkup(
      createElement(DashboardView, makeViewProps({ activeTab: 'sessions', selectedSession })),
    );
    expect(html).toContain('feature/auth');
    expect(html).toContain('← Back');
    expect(html).toContain('scout');
    expect(html).not.toContain('panel-grid');
  });
});

// ── SessionList component ────────────────────────────────────────────────────

describe('SessionList component', () => {
  const mockSessions: SessionSummary[] = [
    {
      id: 'feature-auth',
      branch: 'feature/auth',
      startedAt: '2024-01-15T10:00:00Z',
      status: 'active',
      agentCount: 3,
      activeAgentCount: 2,
    },
    {
      id: 'feature-docs',
      branch: 'feature/docs',
      startedAt: '2024-01-14T08:00:00Z',
      status: 'completed',
      agentCount: 1,
      activeAgentCount: 0,
    },
  ];

  it('renders session cards from mock data', () => {
    const html = renderToStaticMarkup(
      createElement(SessionList, { sessions: mockSessions, onSelectSession: () => {} }),
    );
    expect(html).toContain('feature/auth');
    expect(html).toContain('feature/docs');
    expect(html).toContain('session-card');
    expect(html).toContain('3 agents');
    expect(html).toContain('(2 active)');
    expect(html).toContain('1 agent');
  });

  it('renders active and completed status badges', () => {
    const html = renderToStaticMarkup(
      createElement(SessionList, { sessions: mockSessions, onSelectSession: () => {} }),
    );
    expect(html).toContain('status-badge active');
    expect(html).toContain('status-badge completed');
  });

  it('shows empty state when no sessions', () => {
    const html = renderToStaticMarkup(
      createElement(SessionList, { sessions: [], onSelectSession: () => {} }),
    );
    expect(html).toContain('empty-state');
    expect(html).toContain('No sessions yet. Start a /sail to create one.');
    expect(html).not.toContain('session-card');
  });
});

// ── SessionDetail component ──────────────────────────────────────────────────

describe('SessionDetail component', () => {
  const mockSession: SessionDetailResponse = {
    id: 'feature-auth',
    branch: 'feature/auth',
    startedAt: '2024-01-15T10:00:00Z',
    status: 'active',
    agents: [
      {
        name: 'scout',
        type: 'specialist',
        status: 'active',
        startedAt: '2024-01-15T10:01:00Z',
        log: 'Investigating auth patterns…\nFound 3 files.',
        inbox: [
          { timestamp: '2024-01-15T10:02:00Z', from: 'orchestrator', content: 'Check OAuth flow', delivered: true },
          { timestamp: '2024-01-15T10:03:00Z', from: 'user', content: 'Focus on JWT', delivered: false },
        ],
      },
      {
        name: 'bosun',
        type: 'fleet',
        status: 'completed',
        startedAt: '2024-01-15T10:00:30Z',
        completedAt: '2024-01-15T10:05:00Z',
        log: 'Tech debt scan complete.',
        inbox: [],
      },
    ],
  };

  it('renders agents with status badges', () => {
    const html = renderToStaticMarkup(
      createElement(SessionDetail, { session: mockSession, onBack: () => {}, onSendMessage: () => {} }),
    );
    expect(html).toContain('scout');
    expect(html).toContain('bosun');
    expect(html).toContain('status-badge active');
    expect(html).toContain('status-badge completed');
    expect(html).toContain('agent-type-badge');
    expect(html).toContain('Specialist');
    expect(html).toContain('Fleet');
  });

  it('renders back button and branch name', () => {
    const html = renderToStaticMarkup(
      createElement(SessionDetail, { session: mockSession, onBack: () => {}, onSendMessage: () => {} }),
    );
    expect(html).toContain('← Back');
    expect(html).toContain('back-button');
    expect(html).toContain('feature/auth');
    expect(html).toContain('session-detail-branch');
  });

  it('renders the session status badge', () => {
    const html = renderToStaticMarkup(
      createElement(SessionDetail, { session: mockSession, onBack: () => {}, onSendMessage: () => {} }),
    );
    // The session header should show the active status
    expect(html).toContain('session-detail-meta');
  });
});

// ── Session state functions ──────────────────────────────────────────────────

describe('session state functions', () => {
  const mockSessions: SessionSummary[] = [
    {
      id: 'feature-auth',
      branch: 'feature/auth',
      startedAt: '2024-01-15T10:00:00Z',
      status: 'active',
      agentCount: 2,
      activeAgentCount: 1,
    },
  ];

  const mockSessionDetail: SessionDetailResponse = {
    id: 'feature-auth',
    branch: 'feature/auth',
    startedAt: '2024-01-15T10:00:00Z',
    status: 'active',
    agents: [
      {
        name: 'scout',
        type: 'specialist',
        status: 'active',
        startedAt: '2024-01-15T10:01:00Z',
        log: 'Working…',
        inbox: [],
      },
    ],
  };

  it('setSessions updates the session list and clears loading', () => {
    const initial = createInitialAppState();
    const updated = setSessions(initial, mockSessions);
    expect(updated.sessions).toEqual(mockSessions);
    expect(updated.sessionsLoading).toBe(false);
  });

  it('selectSession sets the selected session detail', () => {
    const initial = createInitialAppState();
    const updated = selectSession(initial, mockSessionDetail);
    expect(updated.selectedSession).toEqual(mockSessionDetail);
    expect(updated.sessionsLoading).toBe(false);
  });

  it('clearSelectedSession returns to the session list', () => {
    const withSession = selectSession(createInitialAppState(), mockSessionDetail);
    expect(withSession.selectedSession).not.toBeNull();
    const cleared = clearSelectedSession(withSession);
    expect(cleared.selectedSession).toBeNull();
  });

  it('initial state has empty sessions and no selected session', () => {
    const initial = createInitialAppState();
    expect(initial.sessions).toEqual([]);
    expect(initial.selectedSession).toBeNull();
    expect(initial.sessionsLoading).toBe(false);
  });
});
