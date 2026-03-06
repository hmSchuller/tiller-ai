import type { ToolTarget } from '../../scaffold/types.js';

export type { ToolTarget } from '../../scaffold/types.js';

export const CLIENT_ASSET_PATH = '/dashboard-client.js' as const;
export const CLIENT_CSS_ASSET_PATH = '/dashboard-client.css' as const;

export const CONFIG_MODE_OPTIONS = ['simple', 'detailed'] as const;
export const WORKFLOW_MODE_OPTIONS = ['solo', 'team'] as const;
export const CONFIG_SCOPE_OPTIONS = ['local', 'project'] as const;
export const TOOL_OPTIONS = ['claude', 'copilot', 'opencode'] as const satisfies readonly ToolTarget[];

export type ConfigMode = (typeof CONFIG_MODE_OPTIONS)[number];
export type WorkflowMode = (typeof WORKFLOW_MODE_OPTIONS)[number];
export type ConfigScope = (typeof CONFIG_SCOPE_OPTIONS)[number];

export const CONFIG_MODE_LABELS: Record<ConfigMode, string> = {
  simple: 'Simple — concise, outcome-focused responses',
  detailed: 'Detailed — explains decisions and trade-offs',
};

export const WORKFLOW_MODE_LABELS: Record<WorkflowMode, string> = {
  solo: 'Solo — merge directly to main',
  team: 'Team — open a PR for review',
};

export const TOOL_LABELS: Record<ToolTarget, string> = {
  claude: 'Claude Code',
  copilot: 'GitHub Copilot',
  opencode: 'OpenCode',
};

function isOption<Value extends string>(options: readonly Value[], value: unknown): value is Value {
  return typeof value === 'string' && options.includes(value as Value);
}

export function isConfigMode(value: unknown): value is ConfigMode {
  return isOption(CONFIG_MODE_OPTIONS, value);
}

export function isWorkflowMode(value: unknown): value is WorkflowMode {
  return isOption(WORKFLOW_MODE_OPTIONS, value);
}

export function isConfigScope(value: unknown): value is ConfigScope {
  return isOption(CONFIG_SCOPE_OPTIONS, value);
}

export function isToolTarget(value: unknown): value is ToolTarget {
  return isOption(TOOL_OPTIONS, value);
}

export function uniqueToolTargets(tools: readonly ToolTarget[]): ToolTarget[] {
  return [...new Set(tools)];
}

export function normalizeToolTargets(value: unknown): ToolTarget[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniqueToolTargets(value.filter(isToolTarget));
}

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
