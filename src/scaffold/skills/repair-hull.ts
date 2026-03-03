import type { ProjectConfig } from '../types.js';

export function generateRepairHullSkill(config: ProjectConfig): string {
  return `---
name: repair-hull
description: Interactive tech debt fix — pick an item from tech-backlog.md and fix it via Bosun. Usage: /repair-hull [item description]
---

# /repair-hull — On-demand tech debt fix

## Step 1: Check arguments

Parse \`$ARGUMENTS\`.

- If \`$ARGUMENTS\` is non-empty: match it against open items in \`tech-backlog.md\` (substring match). If a clear match is found, skip Step 2 and use that item directly. If no match is found, proceed to Step 2 with the argument as a hint.
- If \`$ARGUMENTS\` is empty: proceed to Step 2.

## Step 2: Read backlog

Read \`tech-backlog.md\` and collect all open (non-done) items — lines in the **Backlog** section that are not marked as done.

- If there are **no open items**: report "No open items in tech-backlog.md." and stop.
- If there are **≤3 items**: present all of them.
- If there are **>3 items**: present the top 3 items, plus a "List all" option.

Use the \`AskUserQuestion\` tool to present the items as options. Wait for the user's selection before proceeding.

## Step 3: Branch setup

- Note the current branch: \`git branch --show-current\`
- Stash any uncommitted work: \`git stash\`
- \`git checkout main\`
- Create a chore branch: \`git checkout -b chore/repair-hull-<kebab-desc>\` (derive kebab-case slug from the chosen item, max 4 words)

## Step 4: Delegate to Bosun

Use the **Task tool** (foreground, \`subagent_type: "bosun"\`) with the chosen item as the explicit target.

Pass the chosen item description so the Bosun knows exactly what to fix. Wait for the Bosun to complete before continuing.

## Guardrails — the Bosun MUST NOT

- Touch more than 3 files
- Change any public API or exported interface
- Refactor anything that changes observable behavior
- Split, merge, or move files (structural changes)
- Rename anything used across many files
- Modify CI/CD, build config, or dependency versions
- If nothing safe is found, skip entirely and report "codebase is clean"

## Step 5: Verify & commit

Run \`${config.runCommand}\`.

- If it **fails**: revert the changes, checkout main, delete the chore branch, restore original branch + stash pop, and abort with: "repair-hull aborted — verify failed. No changes were made."
- If it **passes**: \`git add -A && git commit -m "chore: repair-hull — <desc>"\`

## Step 6: Merge & cleanup

- \`git checkout main && git merge --no-ff chore/repair-hull-<kebab-desc> -m "chore: repair-hull — <desc>"\`
- \`git branch -d chore/repair-hull-<kebab-desc>\`
- \`git checkout <original-branch> && git stash pop\` (restore original state)
- Mark the item as done in \`tech-backlog.md\`

## Report

Read mode from \`.tiller/tiller.json\` (or \`.tiller/local.json\` if it exists and overrides).

**simple mode:** "Fixed: <desc>"

**detailed mode:** Full summary of what changed, which files were touched, and the updated open backlog count.
`;
}
