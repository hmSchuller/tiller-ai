---
name: vibe
description: Start or continue working on an idea. Usage: /vibe [idea description]
---

# /vibe — Start or continue work

## Step 1: Orient

Read `CLAUDE.md`, `vibestate.md`, and `changelog.md` to understand current state.
Run `git branch` and `git status`.

State the current mode from CLAUDE.md: "Mode: <mode>".

**If mode is simple:** Do not narrate the orient step.
**If mode is detailed:** Summarize the current state in 2-3 sentences.

## Step 2: Branch routing

**$ARGUMENTS provided** → check if a branch named `feature/<kebab-case-of-arguments>` already exists locally or remotely.
  - If it exists: switch to it. Read `vibestate.md` for current state. Ask: "Found existing branch feature/<name>. Continue where we left off, or do you want to revisit the plan first?"
    - Continue → pick up from the next unchecked milestone
    - Revisit → summarize what's done so far, discuss before building
  - If it doesn't exist: create it from main.
    - **simple:** Say: "On it."
    - **detailed:** State: "Starting work on: <idea>"

**Already on a feature branch** → continue.
  - **simple:** Say nothing unless asked.
  - **detailed:** State: "Continuing work on: <branch-name>"

**Neither** → list open feature branches briefly, ask what to work on.

## Step 2.5: Tech debt check

Before planning, check if a tech debt cleanup is due:

1. Count lines in `changelog.md` matching the pattern `- [[^]]*] landed feature/` — this is `landedCount`
2. Read `.claude/.tiller-tech-debt.json` — get `lastTechDebtAtFeature` and `threshold` (default threshold: 3)
3. If `(landedCount - lastTechDebtAtFeature) >= threshold`:
   - Use the **Task tool** (foreground, `subagent_type: "general-purpose"`) with the contents of `.claude/skills/tech-debt/SKILL.md` as the prompt
   - Wait for the agent to complete before continuing
4. Continue to Step 3 regardless of whether the tech debt agent ran

## Step 3: Plan milestones

**If mode is simple:** Explore the codebase and break the work into 2–5 milestones internally. Do not show this plan to the user.

**If mode is detailed:** Call `EnterPlanMode`. In the plan file, write:
- High-level approach (2–3 sentences)
- 2–5 numbered milestones, each with: what gets built + what gets tested
- Files to create or modify
- Any trade-offs worth noting
- **Execution rules** (embed verbatim): After plan approval, read `vibestate.md` to find the milestone checklist, then execute the milestone loop: for each remaining milestone, announce "Milestone X/N: <description>", build functionality, add or update tests, run `npm test` and fix failures, run `git add -A && git commit -m "<milestone>"`, update `vibestate.md` checkboxes and `changelog.md` Done section then amend commit, report "Saved: <description> (X/N)". When all milestones are done, summarize what was built and suggest `/land`.

  Before exiting plan mode, write the milestone checklist to the `Active feature` section of `vibestate.md` with `Status: executing` and the plan file path.

## Step 4: Build milestone by milestone

For each milestone:
1. **detailed only:** Announce: "Milestone X/N: <description>"
2. Build the functionality
3. Add or update tests for what was built
4. Run `npm test` — **simple:** fix failures silently. **detailed:** fix before continuing.
5. `git add -A && git commit -m "<milestone description>"`
6. Update `vibestate.md` milestone checkboxes (detailed) and add entry to `changelog.md` Done section. Amend: `git commit --amend --no-edit`
7. **simple:** Say: "Saved: <what changed>". **detailed:** Report: "Saved: <description> (X/N)"

## Step 5: Complete

**simple:** Say: "Feature complete. Type /land when ready to merge."
**detailed:** Summarize everything that was built across all milestones. Suggest `/land` to merge.

## If something goes wrong

**simple:** Fix it yourself first. Only tell the user if you genuinely can't resolve it.
**detailed:** Explain what happened and what you plan to do.
