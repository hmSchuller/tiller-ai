import type { ProjectConfig } from '../types.js';

export function generatePlanContextHook(config: ProjectConfig): string {
  return `#!/usr/bin/env bash
# PreToolUse hook on ExitPlanMode — injects /sail Step 3 context
# so the Plan agent knows the rigid plan template and compass state.

COMPASS=""
if [[ -f .tiller/compass.md ]]; then
  COMPASS=$(cat .tiller/compass.md)
fi

read_sail_plan_template() {
  local skill_path="$1"
  [[ -f "$skill_path" ]] || return 1

  awk '
    /\*\*If mode is detailed:\*\* Call \`EnterPlanMode\`\./ { in_detailed_step=1; next }
    in_detailed_step && /^\`\`\`$/ {
      fence_count++
      if (fence_count == 1) {
        capture=1
        next
      }
      if (fence_count == 2) {
        exit
      }
    }
    capture { print }
  ' "$skill_path"
}

PLAN_TEMPLATE_PREFIX=$(cat <<'EOF_PLAN_PREFIX'
You are planning inside a /sail session. Use this exact plan template — fill in every section, do not omit any:

\`\`\`
## Context
(1-2 sentences: what feature/fix is being built and why)
EOF_PLAN_PREFIX
)

PLAN_TEMPLATE_SUFFIX=$(cat <<'EOF_PLAN_SUFFIX'
## Verification
1. \`${config.runCommand}\` — all existing + new tests pass
2. Any build commands pass
\`\`\`

IMPORTANT:
- Tag each milestone as [independent] or [depends-on: N]
- The Execution rules section must be included verbatim — it tells the sailing agent what to do after plan approval
- Do NOT skip or abbreviate any section
EOF_PLAN_SUFFIX
)

FALLBACK_SAIL_TEMPLATE=$(cat <<'EOF_FALLBACK_TEMPLATE'
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
After plan approval, evaluate scope per Step 3.5 (count milestones, files, subsystems → Small/Medium/Large tier). In detailed mode, announce the tier and wait for user confirmation or override. Then create \`.tiller/compass.md\` if it doesn't exist (using the standard template: Branch / Stages checklist / Milestones / Notes sections). Then update \`.tiller/compass.md\`: set Branch to the current branch, check off Orientation and Planning stages, and list the numbered milestones under the Milestones section. Then proceed with the selected tier's execution path in Step 4: for each remaining milestone, announce "Milestone X/N: <description>", build functionality, add or update tests, run \`${config.runCommand}\` and fix failures, run \`git add -A && git commit -m "<milestone>"\`, add entry to \`changelog.md\` Done section then amend commit, update \`.tiller/compass.md\` to check off that milestone then amend commit, report "Saved: <description> (X/N)". When all milestones are done, check off the Testing stage in \`.tiller/compass.md\`, run Code Review: spawn the Quartermaster agent using the Task tool (foreground, \`subagent_type: "quartermaster"\`) to review the feature branch diff against main. On PASS: check off the Quartermaster review stage in \`.tiller/compass.md\`, summarize what was built and suggest \`/dock\`. On FAIL: fix the issues, re-spawn the Quartermaster with rebuttal context. If the Quartermaster FAILs again with "ESCALATE TO CAPTAIN": spawn the Captain via Task tool (foreground, \`subagent_type: "captain"\`) with the disputed issues, your rebuttal, and the Quartermaster's objections; follow the Captain's ruling (AGREE WITH QUARTERMASTER → fix before docking; AGREE WITH SAILING AGENT → proceed; COMPROMISE → fix blocking items, log rest to \`tech-backlog.md\`). After review passes, summarize what was built and suggest \`/dock\`.

## Quartermaster review
Will run after all milestones are complete (Step 4.5).
EOF_FALLBACK_TEMPLATE
)

SAIL_TEMPLATE=$(read_sail_plan_template ".claude/skills/sail/SKILL.md")
if [[ -z "$SAIL_TEMPLATE" ]]; then
  SAIL_TEMPLATE="$FALLBACK_SAIL_TEMPLATE"
fi

TEMPLATE="$PLAN_TEMPLATE_PREFIX

$SAIL_TEMPLATE

$PLAN_TEMPLATE_SUFFIX"

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
`;
}
