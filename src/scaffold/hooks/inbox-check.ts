import type { ProjectConfig } from '../types.js';

export function generateInboxCheckHook(_config: ProjectConfig): string {
  return `#!/usr/bin/env bash
# inbox-check.sh — check agent inbox for undelivered messages
# Managed by Tiller. Called as PreToolUse hook (deny-with-message pattern).

set -euo pipefail

# Read the tool input from stdin
INPUT=$(cat)

# Only check when inside a session (agent name must be set)
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

INBOX_FILE="\${ACTIVE_SESSION_DIR}\${AGENT_NAME}.inbox.md"
if [ ! -f "$INBOX_FILE" ]; then
  exit 0
fi

# Check for undelivered messages (delivered: false)
if ! grep -q "delivered: false" "$INBOX_FILE" 2>/dev/null; then
  exit 0
fi

# Collect undelivered message content using TILLER-MSG delimiters
MESSAGES=$(python3 -c "
import sys, re
raw = open(sys.argv[1]).read()
pattern = r'<!-- TILLER-MSG -->\\\\n(.*?)<!-- /TILLER-MSG-HEAD -->\\\\n(.*?)<!-- /TILLER-MSG -->'
matches = re.findall(pattern, raw, re.DOTALL)
parts = []
for header, content in matches:
    if 'delivered: false' in header:
        parts.append(content.strip())
print(' | '.join(parts))
" "$INBOX_FILE" 2>/dev/null || echo "You have unread inbox messages.")

# Mark messages as delivered
sed -i.bak 's/delivered: false/delivered: true/g' "$INBOX_FILE" && rm -f "\${INBOX_FILE}.bak"

# Escape message for JSON
ESCAPED_MSG=$(printf '%s' "$MESSAGES" | sed 's/\\\\\\\\/\\\\\\\\\\\\\\\\/g; s/"/\\\\"/g' | tr '\\n' ' ')

echo "{\\"permissionDecision\\":\\"deny\\",\\"permissionDecisionReason\\":\\"📬 INBOX MESSAGE: \${ESCAPED_MSG}. After processing this message, retry your action.\\"}"
exit 0
`;
}
