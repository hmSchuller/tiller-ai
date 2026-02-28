import type { ProjectConfig } from '../types.js';

export function generateSessionResumeHook(_config: ProjectConfig): string {
  return `#!/usr/bin/env bash
# Injected into context on SessionStart(clear)
if grep -q "Status: executing" compass.md 2>/dev/null; then
  PLAN_FILE=$(grep "Plan:" compass.md | head -1 | sed 's/Plan: //')
  echo "You are in the middle of a /sail milestone build."
  echo "Read compass.md for milestone progress and \${PLAN_FILE:-the plan file} for full context."
  echo "Resume the milestone loop from where you left off. Auto-commit after each milestone."
fi
`;
}
