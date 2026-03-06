import type { ToolTarget } from '../../scaffold/types.js';

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
