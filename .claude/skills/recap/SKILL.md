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

## Then produce a single output block

---

**Active:** <active feature from vibestate.md, or "none">

**Completed (main)**
<hash> <message>
<hash> <message>
...

**In progress**
feature/<name>
  <hash> <message>
  ...

<X> features landed, <Y> in progress.

---

Nothing else. No commentary, no second-guessing, no re-running commands.
