import { describe, expect, it } from 'vitest';
import type { DashboardStateResponse } from '../../src/commands/dashboard/contracts.js';
import {
  DEFAULT_FORM_VALUES,
  getFormValuesFromState,
  getLocalRows,
  getSnapshotRows,
  getStatusFromStateResponse,
} from '../../src/commands/dashboard/client/view-model.js';

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
