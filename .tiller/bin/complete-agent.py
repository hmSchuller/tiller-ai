#!/usr/bin/env python3
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
