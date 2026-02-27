import type { ProjectConfig } from '../../src/scaffold/types.js';

export const simpleConfig: ProjectConfig = {
  projectName: 'test-project',
  description: 'A test project for unit tests',
  runCommand: 'npm test',
  mode: 'simple',
  workflow: 'solo',
};

export const detailedConfig: ProjectConfig = {
  projectName: 'detailed-project',
  description: 'A project with detailed mode',
  runCommand: 'npm run verify',
  mode: 'detailed',
  workflow: 'solo',
};

export const teamSimpleConfig: ProjectConfig = {
  projectName: 'team-project',
  description: 'A team project with simple mode',
  runCommand: 'npm test',
  mode: 'simple',
  workflow: 'team',
};
