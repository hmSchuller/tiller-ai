export function generateRegisterAgentScript(): string {
  return `#!/usr/bin/env python3
"""Register a sub-agent in the session JSON.

Usage: python3 .tiller/bin/register-agent.py <session_file> <timestamp> <name> <type>
"""
import json, sys

f, ts, name, atype = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
d = json.load(open(f))
d['agents'].append({'name': name, 'type': atype, 'status': 'active', 'startedAt': ts})
json.dump(d, open(f, 'w'), indent=2)
`;
}

export function generateCompleteAgentScript(): string {
  return `#!/usr/bin/env python3
"""Mark a sub-agent as completed in the session JSON.

Usage: python3 .tiller/bin/complete-agent.py <session_file> <name>
"""
import json, sys

f, name = sys.argv[1], sys.argv[2]
d = json.load(open(f))
for a in d.get('agents', []):
    if a.get('name') == name:
        a['status'] = 'completed'
json.dump(d, open(f, 'w'), indent=2)
`;
}
