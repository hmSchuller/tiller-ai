import type { ProjectConfig } from '../../src/scaffold/types.js';

export const simpleConfig: ProjectConfig = {
  projectName: 'test-project',
  description: 'A test project for unit tests',
  runCommand: 'npm test',
  mode: 'simple',
};

export const detailedConfig: ProjectConfig = {
  projectName: 'detailed-project',
  description: 'A project with detailed mode',
  runCommand: 'npm run verify',
  mode: 'detailed',
};
