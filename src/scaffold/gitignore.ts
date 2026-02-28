import type { ProjectConfig } from './types.js';

export const TILLER_GITIGNORE_ENTRIES = ['compass.md', '.tiller.local.json'];

export function generateGitignore(_config: ProjectConfig): string {
  return `# Dependencies
node_modules/

# Build output
dist/
build/
.next/
out/

# Environment
.env
.env.local
.env.*.local

# Editor
.DS_Store
*.swp
*.swo
.idea/
.vscode/

# Logs
*.log
npm-debug.log*

# TypeScript
*.tsbuildinfo

# Tiller — local-only files (per-dev, not shared)
compass.md
.tiller.local.json
`;
}
