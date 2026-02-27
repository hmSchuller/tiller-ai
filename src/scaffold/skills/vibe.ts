import type { ProjectConfig } from '../types.js';

export function generateVibeSkill(config: ProjectConfig): string {
  if (config.mode === 'simple') {
    return `---
name: vibe
description: Start or continue working on an idea. Usage: /vibe [idea description]
---

# /vibe — Start or continue work

## Step 1: Orient

Read \`CLAUDE.md\` and \`vibestate.md\`. Run \`git branch\` and \`git status\`. Do not narrate this.

## Step 2: Branch routing

**$ARGUMENTS provided** → create \`feature/<kebab-case-of-arguments>\` from main (or switch if it exists). Say: "On it."

**Already on a feature branch** → continue. Say nothing unless asked.

**Neither** → list open feature branches briefly, ask what to work on.

## Step 3: Build

Just build. No plan narration, no step-by-step commentary.

After each chunk: run \`${config.runCommand}\`. Fix failures silently before continuing.

When done with a chunk, say what changed in one sentence. Then:
- "Type /snapshot to save, /land when you're done."

## If something goes wrong

Fix it yourself first. Only tell the user if you genuinely can't resolve it.
`;
  }

  return `---
name: vibe
description: Start or continue working on an idea. Usage: /vibe [idea description]
---

# /vibe — Start or continue work

## Step 1: Orient

Read these files to understand current state:
- \`CLAUDE.md\` — project context, verify command, mode
- \`vibestate.md\` — active feature, done log, notes
- Run \`git branch\` and \`git status\`

Summarize the current state in 2-3 sentences.

## Step 2: Branch routing

**$ARGUMENTS provided** → create \`feature/<kebab-case-of-arguments>\` from main (or switch if it already exists). State: "Starting work on: <idea>"

**Already on a feature branch** → stay on it. State: "Continuing work on: <branch-name>"

**Neither** → list open feature branches as in-progress ideas, ask what to work on or if they want to start something new.

## Step 3: Plan

Write out your proposed approach:
- What you're going to build (3-5 bullets)
- Which files you'll create or modify
- Any decisions or trade-offs worth noting

Wait for explicit confirmation before touching files.

## Step 4: Build

Implement in small, logical chunks. After each chunk:
1. Run \`${config.runCommand}\`
2. Fix any failures before continuing
3. Report what was done and whether verify passed

## Step 5: Remind

After each working chunk:
- \`/snapshot\` to save progress on this feature
- \`/land\` when the feature is complete and ready to merge
`;
}
