import type { ProjectConfig } from '../types.js';

export function generatePostWriteHook(_config: ProjectConfig): string {
  return `#!/usr/bin/env bash
# post-write.sh — auto-format after file edits
# Managed by Tiller. Silent fail if formatter not available.

set -euo pipefail

FILES="$1"

if [ -z "$FILES" ]; then
  exit 0
fi

# Try prettier
if command -v prettier &>/dev/null; then
  echo "$FILES" | tr ' ' '\\n' | xargs prettier --write --ignore-unknown 2>/dev/null || true
  exit 0
fi

# Try biome
if command -v biome &>/dev/null; then
  echo "$FILES" | tr ' ' '\\n' | xargs biome format --write 2>/dev/null || true
  exit 0
fi

# No formatter found — that's fine
exit 0
`;
}
