export type ToolTarget = 'claude' | 'copilot' | 'opencode';

export interface ProjectConfig {
  projectName: string;
  description: string;
  runCommand: string;
  mode: 'simple' | 'detailed';
  workflow: 'solo' | 'team';
  tools: ToolTarget[];
}
