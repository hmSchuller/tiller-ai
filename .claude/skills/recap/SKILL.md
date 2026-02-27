---
name: recap
description: Read-only status of all work — completed and in progress
---

# /recap — Project status

> Read-only. No file modifications. No suggestions. No internal monologue.

## Gather everything silently first

Run all of these before writing any output:

1. Read `vibestate.md`
2. `git log main --oneline`
3. `git branch --list 'feature/*'`
4. For each feature branch: `git log main..<branch> --oneline`

## Then produce a single plain-English output

Translate git commit messages into natural language. No hashes, no branch names, no git jargon.

Format:

---

**Working on:** <what's currently being built, from vibestate.md — or "nothing, ready to start">

**Done**
- <plain English description of what was built>
- <plain English description of what was built>
...

**In progress**
- <plain English description of what's being worked on>
...

---

If there's nothing in progress: omit the "In progress" section.
If there's nothing done yet: say "Nothing completed yet."

Nothing else. No commentary, no suggestions, no second-guessing.
