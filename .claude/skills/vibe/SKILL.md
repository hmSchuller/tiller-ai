---
name: vibe
description: Start or continue working on an idea. Usage: /vibe [idea description]
---

# /vibe — Start or continue work

## Step 1: Orient

Read `CLAUDE.md` and `vibestate.md`. Run `git branch` and `git status`. Do not narrate this.

## Step 2: Branch routing

**$ARGUMENTS provided** → check if a branch named `feature/<kebab-case-of-arguments>` already exists locally or remotely.
  - If it exists: switch to it. Read `vibestate.md` for current state. Ask: "Found existing branch feature/<name>. Continue where we left off, or do you want to revisit the plan first?"
    - Continue → pick up from the next unchecked milestone
    - Revisit → summarize what's done so far, discuss before building
  - If it doesn't exist: create it from main. Say: "On it."

**Already on a feature branch** → continue. Say nothing unless asked.

**Neither** → list open feature branches briefly, ask what to work on.

## Step 3: Enter plan mode

Call `EnterPlanMode`. In the plan file, write:
- High-level approach (2–3 sentences)
- 2–5 numbered milestones, each with: what gets built + what gets tested
- Files to create or modify
- Any trade-offs worth noting
- **Execution rules** (embed verbatim): After plan approval, read `vibestate.md` to find the milestone checklist, then execute the milestone loop: for each remaining milestone, announce "Milestone X/N: <description>", build functionality, add or update tests, run `npm test` and fix failures, run `git add -A && git commit -m "<milestone>"`, update `vibestate.md` checkboxes and amend commit, report "Saved: <description> (X/N)". When all milestones are done, summarize what was built and suggest `/land`.

Before exiting plan mode, write the milestone checklist to the `Active feature` section of `vibestate.md` with `Status: executing` and the plan file path.

## Step 4: Build milestone by milestone

For each milestone (after plan approval):
1. Announce: "Milestone X/N: <description>"
2. Build the functionality
3. Add or update tests for what was built
4. Run `npm test` — fix any failures before continuing
5. `git add -A && git commit -m "<milestone description>"`
6. Update `vibestate.md` milestone checkboxes, then amend: `git commit --amend --no-edit`
7. Report: "Saved: <description> (X/N)"

## Step 5: Complete

Summarize everything that was built across all milestones. Suggest `/land` to merge.
