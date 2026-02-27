export interface ProjectConfig {
  projectName: string;
  description: string;
  runCommand: string;
  mode: 'simple' | 'detailed';
  workflow: 'solo' | 'team';
}
