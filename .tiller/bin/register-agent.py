#!/usr/bin/env python3
"""Register a sub-agent in the session JSON.

Usage: python3 .tiller/bin/register-agent.py <session_file> <timestamp> <name> <type>
"""
import json, sys

f, ts, name, atype = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
d = json.load(open(f))
d['agents'].append({'name': name, 'type': atype, 'status': 'active', 'startedAt': ts})
json.dump(d, open(f, 'w'), indent=2)
