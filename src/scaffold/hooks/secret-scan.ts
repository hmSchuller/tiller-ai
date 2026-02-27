import type { ProjectConfig } from '../types.js';

export function generateSecretScanHook(_config: ProjectConfig): string {
  return `#!/usr/bin/env bash
# secret-scan.sh — block commits that contain secrets
# Managed by Tiller. Called as PreToolUse hook on Bash commands.

set -euo pipefail

# Read the tool input from stdin
INPUT=$(cat)

# Only run on git commit commands
COMMAND=$(echo "$INPUT" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('command', ''))" 2>/dev/null || echo "")

if [[ "$COMMAND" != *"git commit"* ]]; then
  exit 0
fi

# Get staged files
STAGED=$(git diff --cached --name-only 2>/dev/null || true)

if [ -z "$STAGED" ]; then
  exit 0
fi

# Patterns that look like secrets
SECRET_PATTERNS=(
  'sk-[a-zA-Z0-9]{20,}'
  'ghp_[a-zA-Z0-9]{36}'
  'gho_[a-zA-Z0-9]{36}'
  'github_pat_[a-zA-Z0-9_]{82}'
  'xoxb-[0-9]+-[a-zA-Z0-9]+'
  'AKIA[0-9A-Z]{16}'
  'eyJ[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]+'
  'AIza[0-9A-Za-z_-]{35}'
  'password\\s*=\\s*["\\'\\''"][^"\\'']+["\\'\\''"]'
  'secret\\s*=\\s*["\\'\\''"][^"\\'']+["\\'\\''"]'
  'api[_-]?key\\s*=\\s*["\\'\\''"][^"\\'']+["\\'\\''"]'
)

FOUND=""
for PATTERN in "\${SECRET_PATTERNS[@]}"; do
  MATCHES=$(git diff --cached | grep -iE "$PATTERN" 2>/dev/null || true)
  if [ -n "$MATCHES" ]; then
    FOUND="$FOUND\\n$MATCHES"
  fi
done

if [ -n "$FOUND" ]; then
  echo '{"permissionDecision":"deny","denyReason":"Potential secrets detected in staged changes. Remove secrets before committing."}'
  exit 0
fi

exit 0
`;
}
