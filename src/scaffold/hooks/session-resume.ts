import type { ProjectConfig } from '../types.js';

export function generateSessionResumeHook(_config: ProjectConfig): string {
  return `#!/usr/bin/env bash
# Injected into context on SessionStart(clear)
BRANCH=$(git branch --show-current 2>/dev/null)
if [[ "$BRANCH" == feature/* || "$BRANCH" == fix/* ]]; then
  echo "You were working on branch: $BRANCH"
  if [[ -f compass.md ]]; then
    COMPASS_BRANCH=$(grep -m1 '^## Branch' -A1 compass.md | tail -1 | tr -d '[:space:]')
    if [[ "$COMPASS_BRANCH" != "(none—onmain)" && -n "$COMPASS_BRANCH" ]]; then
      echo "compass.md has active sail progress — read it for full context before continuing."
    fi
  fi
  echo "Use /sail to continue where you left off."
fi
`;
}
