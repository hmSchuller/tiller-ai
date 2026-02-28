import type { ProjectConfig } from '../types.js';

export function generateRecapSkill(_config: ProjectConfig): string {
  return `---
name: recap
description: Read-only status of all work — completed and in progress
---

# /recap — Project status

> Read-only. No file modifications. No suggestions. No internal monologue.

## Gather everything silently first

Run all of these before writing any output:

1. Read \`compass.md\` (active feature, local state)
2. Read \`changelog.md\` (shared done log)
3. \`git log main --oneline\`
4. \`git branch --list 'feature/*'\`
5. For each feature branch: \`git log main..<branch> --oneline\`

## Then produce output based on mode

Read mode from \`.claude/.tiller.json\` (or \`.tiller.local.json\` if it exists and overrides).

**If mode is simple:** Translate everything into plain English. No hashes, no branch names, no git jargon.

Format:

---

**Working on:** <what's currently being built, from compass.md — or "nothing, ready to start">

**Done**
- <plain English description of what was built>
...

**In progress**
- <plain English description of what's being worked on>
...

---

If there's nothing in progress: omit the "In progress" section.
If there's nothing done yet: say "Nothing completed yet."

**If mode is detailed:** Include technical details.

Format:

---

**Active:** <active feature from compass.md, or "none">

**Completed (main)**
<hash> <message>
...

**In progress**
feature/<name>
  <hash> <message>
  ...

<X> features landed, <Y> in progress.

---

Nothing else. No commentary, no second-guessing, no re-running commands.
`;
}
