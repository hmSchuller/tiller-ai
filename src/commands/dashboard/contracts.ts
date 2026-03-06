import type { ToolTarget } from '../../scaffold/types.js';

export type { ToolTarget } from '../../scaffold/types.js';

export const CLIENT_ASSET_PATH = '/dashboard-client.js' as const;
export const CLIENT_CSS_ASSET_PATH = '/dashboard-client.css' as const;

export const CONFIG_MODE_OPTIONS = ['simple', 'detailed'] as const;
export const WORKFLOW_MODE_OPTIONS = ['solo', 'team'] as const;
export const CONFIG_SCOPE_OPTIONS = ['local', 'project'] as const;
export const TOOL_OPTIONS = ['claude', 'copilot', 'opencode'] as const satisfies readonly ToolTarget[];

export type ConfigMode = 'simple' | 'detailed';
export type WorkflowMode = 'solo' | 'team';
export type ConfigScope = 'local' | 'project';

export type ConfigSnapshot = {
  mode: ConfigMode;
  workflow: WorkflowMode;
  tools: ToolTarget[];
};

export type LocalOverrideSnapshot = {
  mode: ConfigMode | null;
  workflow: WorkflowMode | null;
  tools: ToolTarget[] | null;
};

export type DashboardState = {
  project: ConfigSnapshot;
  local: LocalOverrideSnapshot;
  effective: ConfigSnapshot;
};

export type DashboardIssue = {
  scope: 'project' | 'local' | 'request';
  reason: string;
  message: string;
};

export type DashboardStateResponse =
  | { ok: true; state: DashboardState; localIssue?: DashboardIssue }
  | { ok: false; error: DashboardIssue };

export type SaveRequest = {
  scope: ConfigScope;
  mode: ConfigMode;
  workflow: WorkflowMode;
  tools: ToolTarget[];
};

export type DashboardServerHandle = {
  url: string;
  close: () => Promise<void>;
};

export type DashboardServerOptions = {
  host?: string;
  port?: number;
};
