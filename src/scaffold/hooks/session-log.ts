import type { ProjectConfig } from '../types.js';

export function generateSessionLogHook(_config: ProjectConfig): string {
  return `#!/usr/bin/env bash
# session-log.sh — log tool usage to the active session
# Managed by Tiller. Called as PostToolUse hook.

set -euo pipefail

# Read the tool input from stdin
INPUT=$(cat)

# Only log when inside a session (agent name must be set)
AGENT_NAME="\${TILLER_AGENT_NAME:-}"
if [ -z "$AGENT_NAME" ]; then
  exit 0
fi

# Find the active session directory
ACTIVE_SESSION_DIR=""
for SESSION_DIR in .tiller/sessions/*/; do
  [ -d "$SESSION_DIR" ] || continue
  SESSION_FILE="\${SESSION_DIR}session.json"
  [ -f "$SESSION_FILE" ] || continue
  STATUS=$(python3 -c "import sys, json; print(json.load(open(sys.argv[1])).get('status',''))" "$SESSION_FILE" 2>/dev/null || echo "")
  if [ "$STATUS" = "active" ]; then
    ACTIVE_SESSION_DIR="$SESSION_DIR"
    break
  fi
done

if [ -z "$ACTIVE_SESSION_DIR" ]; then
  exit 0
fi

# Extract tool info from JSON input
TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('toolName', 'unknown'))" 2>/dev/null || echo "unknown")
TOOL_ARGS=$(echo "$INPUT" | python3 -c "import sys, json; args = json.load(sys.stdin).get('toolArgs', {}); print(str(args)[:120])" 2>/dev/null || echo "{}")
TOOL_RESULT=$(echo "$INPUT" | python3 -c "import sys, json; r = json.load(sys.stdin).get('toolResult', ''); print(type(r).__name__ if not isinstance(r, str) else 'string')" 2>/dev/null || echo "unknown")

# Append log entry
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
LOG_FILE="\${ACTIVE_SESSION_DIR}\${AGENT_NAME}.log.md"
echo "[\${TIMESTAMP}] TOOL: \${TOOL_NAME} | ARGS: \${TOOL_ARGS} | RESULT: \${TOOL_RESULT}" >> "$LOG_FILE"

exit 0
`;
}
