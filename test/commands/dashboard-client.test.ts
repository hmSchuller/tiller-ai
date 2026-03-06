import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DashboardStateResponse } from '../../src/commands/dashboard/contracts.js';
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
import {
  applyLoadError,
  applyLoadResponse,
  applyNoToolsValidation,
  applySaveError,
  applySaveResponse,
  applySaveStart,
  createInitialAppState,
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
    onSubmit: noop,
    onScopeChange: noop,
    onModeChange: noop,
    onWorkflowChange: noop,
    onToolChange: noop,
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
});
