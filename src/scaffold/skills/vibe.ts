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

## Step 3: Plan milestones (internal)

Explore the codebase and break the work into 2–5 milestones. Do not show this plan to the user.

## Step 4: Build milestone by milestone

For each milestone:
1. Build the functionality
2. Add or update tests for what was built
3. Run \`${config.runCommand}\` — fix any failures silently before continuing
4. \`git add -A && git commit -m "<milestone description>"\`
5. Update \`vibestate.md\` (check off milestone, update Done section), then amend: \`git commit --amend --no-edit\`
6. Say in one line: "Saved: <what changed>"

## Step 5: Complete

Say: "Feature complete. Type /land when ready to merge."

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

## Step 3: Enter plan mode

Call \`EnterPlanMode\`. In the plan file, write:
- High-level approach (2–3 sentences)
- 2–5 numbered milestones, each with: what gets built + what gets tested
- Files to create or modify
- Any trade-offs worth noting
- **Execution rules** (embed verbatim): After plan approval, read \`vibestate.md\` to find the milestone checklist, then execute the milestone loop: for each remaining milestone, announce "Milestone X/N: <description>", build functionality, add or update tests, run \`${config.runCommand}\` and fix failures, run \`git add -A && git commit -m "<milestone>"\`, update \`vibestate.md\` checkboxes and amend commit, report "Saved: <description> (X/N)". When all milestones are done, summarize what was built and suggest \`/land\`.

Before exiting plan mode, write the milestone checklist to the \`Active feature\` section of \`vibestate.md\` with \`Status: executing\` and the plan file path.

## Step 4: Build milestone by milestone

For each milestone (after plan approval):
1. Announce: "Milestone X/N: <description>"
2. Build the functionality
3. Add or update tests for what was built
4. Run \`${config.runCommand}\` — fix any failures before continuing
5. \`git add -A && git commit -m "<milestone description>"\`
6. Update \`vibestate.md\` milestone checkboxes, then amend: \`git commit --amend --no-edit\`
7. Report: "Saved: <description> (X/N)"

## Step 5: Complete

Summarize everything that was built across all milestones. Suggest \`/land\` to merge.
`;
}
