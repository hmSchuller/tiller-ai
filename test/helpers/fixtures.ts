import type { ProjectConfig } from '../../src/scaffold/types.js';

export const simpleConfig: ProjectConfig = {
  projectName: 'test-project',
  description: 'A test project for unit tests',
  runCommand: 'npm test',
  mode: 'simple',
  workflow: 'solo',
  tools: ['claude'],
};

export const detailedConfig: ProjectConfig = {
  projectName: 'detailed-project',
  description: 'A project with detailed mode',
  runCommand: 'npm run verify',
  mode: 'detailed',
  workflow: 'solo',
  tools: ['claude'],
};

export const teamSimpleConfig: ProjectConfig = {
  projectName: 'team-project',
  description: 'A team project with simple mode',
  runCommand: 'npm test',
  mode: 'simple',
  workflow: 'team',
  tools: ['claude'],
};

export const multiToolConfig: ProjectConfig = {
  projectName: 'multi-tool-project',
  description: 'A project using multiple AI tools',
  runCommand: 'npm test',
  mode: 'simple',
  workflow: 'solo',
  tools: ['claude', 'opencode', 'copilot'],
};

export const openCodeOnlyConfig: ProjectConfig = {
  projectName: 'opencode-project',
  description: 'A project using only OpenCode',
  runCommand: 'npm test',
  mode: 'simple',
  workflow: 'solo',
  tools: ['opencode'],
};

export const copilotOnlyConfig: ProjectConfig = {
  projectName: 'copilot-project',
  description: 'A project using only Copilot',
  runCommand: 'npm test',
  mode: 'simple',
  workflow: 'solo',
  tools: ['copilot'],
};
