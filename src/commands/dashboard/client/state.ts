import type { ConfigScope, DashboardState, DashboardStateResponse, ToolTarget } from '../contracts.js';
import {
  DEFAULT_FORM_VALUES,
  cloneFormValues,
  getFormValuesFromState,
  getStatusFromStateResponse,
  toggleToolSelection,
  type DashboardStatus,
  type FormValues,
} from './view-model.js';

export type DashboardAppState = {
  dashState: DashboardState | null;
  status: DashboardStatus | null;
  formDisabled: boolean;
  form: FormValues;
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function createInitialAppState(): DashboardAppState {
  return {
    dashState: null,
    status: { message: 'Loading dashboard…', tone: 'info' },
    formDisabled: true,
    form: cloneFormValues(DEFAULT_FORM_VALUES),
  };
}

export function applyLoadResponse(currentState: DashboardAppState, payload: DashboardStateResponse): DashboardAppState {
  if (!payload.ok) {
    return {
      ...currentState,
      dashState: null,
      status: getStatusFromStateResponse(payload),
      formDisabled: true,
    };
  }

  return {
    ...currentState,
    dashState: payload.state,
    status: getStatusFromStateResponse(payload),
    formDisabled: false,
    form: getFormValuesFromState(payload.state, currentState.form.scope),
  };
}

export function applyLoadError(currentState: DashboardAppState, error: unknown): DashboardAppState {
  return {
    ...currentState,
    status: {
      message: getErrorMessage(error, 'Failed to load the dashboard.'),
      tone: 'error',
    },
    formDisabled: true,
  };
}

export function applyNoToolsValidation(currentState: DashboardAppState): DashboardAppState {
  return {
    ...currentState,
    status: { message: 'Choose at least one CLI tool.', tone: 'error' },
  };
}

export function applySaveStart(currentState: DashboardAppState): DashboardAppState {
  return {
    ...currentState,
    status: { message: 'Saving settings…', tone: 'info' },
    formDisabled: true,
  };
}

export function applySaveResponse(currentState: DashboardAppState, payload: DashboardStateResponse): DashboardAppState {
  if (!payload.ok) {
    const hasProjectFailure = payload.error.scope === 'project';

    return {
      ...currentState,
      dashState: hasProjectFailure ? null : currentState.dashState,
      status: getStatusFromStateResponse(payload),
      formDisabled: hasProjectFailure || currentState.dashState === null,
    };
  }

  return {
    ...currentState,
    dashState: payload.state,
    status: payload.localIssue ? getStatusFromStateResponse(payload) : { message: 'Settings saved.', tone: 'success' },
    formDisabled: false,
    form: getFormValuesFromState(payload.state, currentState.form.scope),
  };
}

export function applySaveError(currentState: DashboardAppState, error: unknown): DashboardAppState {
  return {
    ...currentState,
    status: {
      message: getErrorMessage(error, 'Failed to save settings. Try again while the local server is still running.'),
      tone: 'error',
    },
    formDisabled: currentState.dashState === null,
  };
}

export function updateScope(currentState: DashboardAppState, scope: ConfigScope): DashboardAppState {
  return {
    ...currentState,
    form: currentState.dashState
      ? getFormValuesFromState(currentState.dashState, scope)
      : { ...currentState.form, scope },
  };
}

export function updateMode(currentState: DashboardAppState, mode: FormValues['mode']): DashboardAppState {
  return {
    ...currentState,
    form: { ...currentState.form, mode },
  };
}

export function updateWorkflow(currentState: DashboardAppState, workflow: FormValues['workflow']): DashboardAppState {
  return {
    ...currentState,
    form: { ...currentState.form, workflow },
  };
}

export function updateToolSelection(
  currentState: DashboardAppState,
  tool: ToolTarget,
  checked: boolean,
): DashboardAppState {
  return {
    ...currentState,
    form: {
      ...currentState.form,
      tools: toggleToolSelection(currentState.form.tools, tool, checked),
    },
  };
}
