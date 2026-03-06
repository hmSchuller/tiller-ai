import type {
  ConfigScope,
  ConfigSnapshot,
  DashboardState,
  DashboardStateResponse,
  LocalOverrideSnapshot,
  ToolTarget,
} from '../contracts.js';

export type Tone = 'info' | 'success' | 'warn' | 'error';

export type FormValues = {
  scope: ConfigScope;
  mode: DashboardState['effective']['mode'];
  workflow: DashboardState['effective']['workflow'];
  tools: ToolTarget[];
};

export type PanelRow = {
  label: string;
  value: string;
};

export const DEFAULT_FORM_VALUES: FormValues = {
  scope: 'local',
  mode: 'detailed',
  workflow: 'solo',
  tools: [],
};

export function cloneFormValues(form: FormValues): FormValues {
  return {
    scope: form.scope,
    mode: form.mode,
    workflow: form.workflow,
    tools: [...form.tools],
  };
}

export function getFormValuesFromState(state: DashboardState, scope: ConfigScope): FormValues {
  return {
    scope,
    mode: state.effective.mode,
    workflow: state.effective.workflow,
    tools: [...state.effective.tools],
  };
}

export function getStatusFromStateResponse(
  response: DashboardStateResponse,
): { message: string; tone: Extract<Tone, 'warn' | 'error'> } | null {
  if (!response.ok) {
    return { message: response.error.message, tone: 'error' };
  }

  return response.localIssue ? { message: response.localIssue.message, tone: 'warn' } : null;
}

export function getSnapshotRows(snapshot: ConfigSnapshot): PanelRow[] {
  return [
    { label: 'Mode', value: snapshot.mode },
    { label: 'Workflow', value: snapshot.workflow },
    { label: 'Tools', value: snapshot.tools.join(', ') || 'None' },
  ];
}

export function getLocalRows(snapshot: LocalOverrideSnapshot): PanelRow[] {
  return [
    { label: 'Mode', value: snapshot.mode ?? 'Not set' },
    { label: 'Workflow', value: snapshot.workflow ?? 'Not set' },
    {
      label: 'Tools',
      value: snapshot.tools === null ? 'Not set' : snapshot.tools.join(', ') || 'None',
    },
  ];
}
