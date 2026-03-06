import type { ProjectConfig } from '../types.js';

export function generateSessionLogHook(_config: ProjectConfig): string {
  return `#!/usr/bin/env bash
# session-log.sh — unified session logger for all hook events
# Managed by Tiller. Registered on: sessionStart, sessionEnd, userPromptSubmitted,
# preToolUse, postToolUse, errorOccurred.

set -euo pipefail

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

# Read agent name from file
AGENT_NAME_FILE="\${ACTIVE_SESSION_DIR}current-agent"
AGENT_NAME="unknown"
if [ -f "$AGENT_NAME_FILE" ]; then
  AGENT_NAME=$(cat "$AGENT_NAME_FILE")
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
LOG_FILE="\${ACTIVE_SESSION_DIR}\${AGENT_NAME}.log.md"

# Detect event type and format log entry
ENTRY=$(python3 -c "
import sys, json

raw = sys.stdin.read()
try:
    data = json.loads(raw)
except Exception:
    data = {}

ts = '$TIMESTAMP'
agent = '$AGENT_NAME'

# Detect event type from the fields present
if 'toolName' in data and 'toolResult' in data:
    # postToolUse
    tool = data['toolName']
    args = str(data.get('toolArgs', {}))[:200]
    result = data.get('toolResult', {})
    if isinstance(result, dict):
        rtype = result.get('resultType', 'unknown')
        text = result.get('textResultForLlm', '')
        summary = text[:200].replace('\\n', ' ') if text else rtype
    else:
        summary = str(result)[:200]
    print(f'[{ts}] [{agent}] TOOL_DONE  {tool}')
    print(f'  args: {args}')
    print(f'  result: {summary}')

elif 'toolName' in data:
    # preToolUse
    tool = data['toolName']
    args = str(data.get('toolArgs', {}))[:200]
    print(f'[{ts}] [{agent}] TOOL_START {tool}')
    print(f'  args: {args}')

elif 'prompt' in data:
    # userPromptSubmitted
    prompt = data['prompt'][:300].replace('\\n', ' ')
    print(f'[{ts}] [{agent}] USER_PROMPT')
    print(f'  {prompt}')

elif 'error' in data:
    # errorOccurred
    err = data.get('error', {})
    msg = err.get('message', str(err))[:300]
    name = err.get('name', 'Error')
    print(f'[{ts}] [{agent}] ERROR {name}')
    print(f'  {msg}')

elif 'reason' in data:
    # sessionEnd
    reason = data.get('reason', 'unknown')
    print(f'[{ts}] [{agent}] SESSION_END reason={reason}')

elif 'initialPrompt' in data or 'source' in data:
    # sessionStart
    source = data.get('source', 'unknown')
    prompt = data.get('initialPrompt', '')[:200].replace('\\n', ' ')
    print(f'[{ts}] [{agent}] SESSION_START source={source}')
    if prompt:
        print(f'  {prompt}')

else:
    # Unknown event — log raw keys for debugging
    keys = list(data.keys())[:10]
    print(f'[{ts}] [{agent}] UNKNOWN keys={keys}')
" <<< "$INPUT" 2>/dev/null || echo "[\${TIMESTAMP}] [\${AGENT_NAME}] LOG_ERROR failed to parse event")

echo "$ENTRY" >> "$LOG_FILE"

exit 0
`;
}
