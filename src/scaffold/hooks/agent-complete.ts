import type { ProjectConfig } from '../types.js';

export function generateAgentCompleteHook(_config: ProjectConfig): string {
  return `#!/usr/bin/env bash
# agent-complete.sh — mark agent as completed when sub-agent stops
# Managed by Tiller. Called as SubagentStop hook.

set -euo pipefail

# Read the tool input from stdin
INPUT=$(cat)

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

# Read agent name from file (set by skill via: echo <name> > .tiller/sessions/<slug>/current-agent)
AGENT_NAME_FILE="\${ACTIVE_SESSION_DIR}current-agent"
if [ ! -f "$AGENT_NAME_FILE" ]; then
  exit 0
fi
AGENT_NAME=$(cat "$AGENT_NAME_FILE")
if [ -z "$AGENT_NAME" ]; then
  exit 0
fi

SESSION_FILE="\${ACTIVE_SESSION_DIR}session.json"

# Update agent status to completed using python3 (reliable JSON manipulation)
python3 -c "
import sys, json
path = sys.argv[1]
name = sys.argv[2]
with open(path) as f:
    data = json.load(f)
for agent in data.get('agents', []):
    if agent.get('name') == name:
        agent['status'] = 'completed'
with open(path, 'w') as f:
    json.dump(data, f, indent=2)
" "$SESSION_FILE" "$AGENT_NAME" 2>/dev/null || true

exit 0
`;
}
