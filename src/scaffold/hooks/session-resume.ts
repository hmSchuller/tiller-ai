import type { ProjectConfig } from '../types.js';

export function generateSessionResumeHook(_config: ProjectConfig): string {
  return `#!/usr/bin/env bash
# Injected into context on SessionStart(clear)
BRANCH=$(git branch --show-current 2>/dev/null)
if [[ "$BRANCH" == feature/* ]]; then
  echo "You were working on branch: $BRANCH"
  echo "Use /sail to continue where you left off."
fi
`;
}
