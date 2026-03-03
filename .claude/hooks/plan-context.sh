#!/usr/bin/env bash
# SubagentStart hook for Plan agents — injects /sail Step 3 context
# so the Plan agent knows the rigid plan template and compass state.

COMPASS=""
if [[ -f .tiller/compass.md ]]; then
  COMPASS=$(cat .tiller/compass.md)
fi

TEMPLATE='You are planning inside a /sail session. Use this exact plan template — fill in every section, do not omit any:

```
## Context
(1-2 sentences: what feature/fix is being built and why)

## Approach
(2-3 sentences describing the high-level strategy)

## Milestones
1. <what gets built> + <what gets tested> [independent | depends-on: N]
2. ...

## Files to modify
- path/to/file — reason

## Trade-offs
(any relevant trade-offs, or "None" if not applicable)

## Execution rules
After plan approval, evaluate scope per Step 3.5 (count milestones, files, subsystems → Small/Medium/Large tier). In detailed mode, announce the tier and wait for user confirmation or override. Then create `.tiller/compass.md` if it does not exist (using the standard template: Branch / Stages checklist / Milestones / Notes sections). Then update `.tiller/compass.md`: set Branch to the current branch, check off Orientation and Planning stages, and list the numbered milestones under the Milestones section. Then proceed with the selected tier execution path in Step 4: for each remaining milestone, announce "Milestone X/N: <description>", build functionality, add or update tests, run `npm test` and fix failures, run `git add -A && git commit -m "<milestone>"`, add entry to `changelog.md` Done section then amend commit, update `.tiller/compass.md` to check off that milestone then amend commit, report "Saved: <description> (X/N)". When all milestones are done, check off the Testing stage in `.tiller/compass.md`, run Code Review: spawn the Quartermaster agent using the Task tool (foreground, `subagent_type: "quartermaster"`) to review the feature branch diff against main. On PASS: check off the Quartermaster review stage in `.tiller/compass.md`, summarize what was built and suggest `/dock`. On FAIL: fix the issues, re-spawn the Quartermaster with rebuttal context. If the Quartermaster FAILs again with "ESCALATE TO CAPTAIN": spawn the Captain via Task tool (foreground, `subagent_type: "captain"`) with the disputed issues, your rebuttal, and the Quartermaster objections; follow the Captain ruling (AGREE WITH QUARTERMASTER → fix before docking; AGREE WITH SAILING AGENT → proceed; COMPROMISE → fix blocking items, log rest to `tech-backlog.md`). After review passes, summarize what was built and suggest `/dock`.

## Quartermaster review
Will run after all milestones are complete (Step 4.5).

## Verification
1. `npm test` — all existing + new tests pass
2. Any build commands pass
```

IMPORTANT:
- Tag each milestone as [independent] or [depends-on: N]
- The Execution rules section must be included verbatim — it tells the sailing agent what to do after plan approval
- Do NOT skip or abbreviate any section'

# Build JSON output with additionalContext
if [[ -n "$COMPASS" ]]; then
  CONTEXT="$TEMPLATE

---
Current compass.md state:

$COMPASS"
else
  CONTEXT="$TEMPLATE"
fi

# Escape for JSON: backslashes, double quotes, newlines, tabs
ESCAPED=$(printf '%s' "$CONTEXT" | sed 's/\\/\\\\/g; s/"/\\"/g' | awk '{printf "%s\\n", $0}' | sed 's/\\n$//')

printf '{"hookSpecificOutput":{"additionalContext":"%s"}}' "$ESCAPED"
