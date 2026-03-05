---
name: sail
description: Start work on a feature or fix. Plans via sail-planner subagent, then hands off to /underway for execution. Usage: /sail [description]
---

# /sail — Launch work

## Step 1: Spawn the planner

Spawn the sail-planner agent via the **Task tool**:
- `subagent_type: "sail-planner"`
- Pass `$ARGUMENTS` as context

Wait for the sail-planner to complete.

## Step 2: Verify compass

Check that `.tiller/compass.md` exists and is non-empty.

If it does not exist or is empty: stop and say "Planning did not complete — compass.md was not written. Check what went wrong and try /sail again."

## Step 3: Execute the plan

Read `.claude/skills/underway/SKILL.md` and execute it from Step 1.
