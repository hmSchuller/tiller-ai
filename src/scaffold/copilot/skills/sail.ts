import type { ProjectConfig } from "../../types.js";

export function generateCopilotSailSkill(config: ProjectConfig): string {
  return (
    `---
name: sail
description: Start or continue work — features, fixes, and tasks.
---

# /sail — Start or continue work (Copilot orchestrator)

Use this skill to contribute anything: new features, bug fixes, or incremental tasks on an existing branch. This skill conserves the main agent's context by delegating all heavy work to sub-agents. The main agent never writes implementation code itself.

**All user interaction uses \`AskUserQuestion\` only. No chat prompts, no \`EnterPlanMode\`. One continuous prompt.**

## Step 0: Set up progress tracking and session

Create all tasks upfront using \`TaskCreate\` so the user sees a visible checklist:

1. "Dust off compass" — read/create \`.tiller/compass.md\`
2. "Orient" (Step 1)
3. "Branch routing" (Step 2)
4. "Tech debt check" (Step 2.5)
5. "Requirements interview" (Step 2.7)
6. "Plan milestones" (Step 3)
7. "Build" (Step 4) — placeholder, will be replaced by per-milestone tasks after planning
8. "Code review" (Step 4.5)
9. "Complete" (Step 5)

Save the returned task IDs for later \`TaskUpdate\` calls. Proceed immediately — do not wait for user input.

### Session creation

After branch routing (Step 2) determines the branch name, create or reuse a session folder for this sail:

1. Derive the session slug from the branch name by replacing \`/\` with \`-\` (e.g. \`feature/my-thing\` → \`feature-my-thing\`)
2. Check if \`.tiller/sessions/<slug>/session.json\` already exists:
   - **If it exists** (resuming a previous sail): read the existing session and continue. Do not overwrite it.
   - **If it does not exist**: create the session folder and metadata:
     \`\`\`bash
     mkdir -p .tiller/sessions/<slug>
     ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
     printf '{"id":"%s","branch":"%s","startedAt":"%s","status":"active","agents":[]}' "<slug>" "<branch>" "$ts" > .tiller/sessions/<slug>/session.json
     \`\`\`
3. Set the \`TILLER_AGENT_NAME\` environment variable to \`sail-lead\` so hooks can identify this agent:
   \`\`\`bash
   export TILLER_AGENT_NAME=sail-lead
   \`\`\`
4. Print: "Dashboard: http://localhost:19850 (run \`tiller-ai dashboard\` in another terminal to view session)"

## Step 1: Orient

\`TaskUpdate\` → mark "Dust off compass" as \`in_progress\`. Read or create \`.tiller/compass.md\`. \`TaskUpdate\` → mark "Dust off compass" as \`completed\`.

\`TaskUpdate\` → mark "Orient" as \`in_progress\`.

Read \`.tiller/tiller.json\` (and \`.tiller/local.json\` if it exists), \`changelog.md\`, and \`.tiller/compass.md\` (if it exists) to understand current state.
If \`codebase-map.md\` exists, read it to get a structural overview of the codebase.
Run \`git branch\` and \`git status\`.

State the current mode from \`.tiller/tiller.json\` (or \`.tiller/local.json\` if it overrides): "Mode: <mode>".

**If mode is simple:** Do not narrate the orient step.
**If mode is detailed:** Summarize the current state in 2-3 sentences.

\`TaskUpdate\` → mark "Orient" as \`completed\`.

## Step 2: Branch routing

\`TaskUpdate\` → mark "Branch routing" as \`in_progress\`.

### Branch prefix selection

Before routing, determine the right branch prefix for $ARGUMENTS (if provided):
- If the arguments clearly describe a bug fix (contains words like "fix", "bug", "broken", "repair", "crash", "error", "wrong", "incorrect") → use prefix \`fix/\`
- Otherwise → use prefix \`feature/\`

Convert $ARGUMENTS to kebab-case for the branch name (e.g. "fix broken auth redirect" → \`fix/broken-auth-redirect\`).

### Routing cases

**$ARGUMENTS provided + already on a feature or fix branch:**
  Assess whether the arguments describe work that belongs on the current branch:
  - **Clearly related** (same feature area, natural next step, continuation of current work) → stay on the current branch. Treat $ARGUMENTS as the next task description. Skip to Step 2.5.
    - **simple:** Say: "Continuing on <branch-name>."
    - **detailed:** State: "Continuing work on: <branch-name> — <task description>"
  - **Clearly unrelated** (different domain, new feature, unrelated fix) → create a new \`<prefix>/<kebab>\` branch from main (same as the "on main" case below).
  - **Uncertain** → use \`AskUserQuestion\` to ask: "Should I continue on \`<current-branch>\` (treating this as the next task), or start a new branch \`<prefix>/<kebab>\`?"

**$ARGUMENTS provided + on main:**
  Check if a branch named \`<prefix>/<kebab-case-of-arguments>\` already exists locally or remotely.
  - If it exists: switch to it. Use \`AskUserQuestion\`: "Found existing branch <prefix>/<name>. Continue where we left off, or revisit the plan first?"
    - Continue → pick up from the next unchecked milestone
    - Revisit → summarize what's done so far, discuss before building
  - If it doesn't exist: create it from main.
    - **simple:** Say: "On it."
    - **detailed:** State: "Starting work on: <description>"

**No arguments + already on a feature or fix branch** → continue.
  - **simple:** Say nothing unless asked.
  - **detailed:** State: "Continuing work on: <branch-name>"

**No arguments + on main** → list open feature and fix branches briefly, use \`AskUserQuestion\` to ask what to work on.

\`TaskUpdate\` → mark "Branch routing" as \`completed\`.

## Step 2.5: Tech debt check

\`TaskUpdate\` → mark "Tech debt check" as \`in_progress\`.

Before planning, check if a tech debt cleanup is due:

1. Count lines in \`changelog.md\` matching the pattern \`- [\` +
    \`[^]]*] (landed|docked) feature/\` — this is \`landedCount\`
2. Read \`.tiller/tech-debt.json\` — get \`lastTechDebtAtFeature\` and \`threshold\` (default threshold: 3)
3. If \`(landedCount - lastTechDebtAtFeature) >= threshold\`:
   - Use the **Task tool** (foreground, \`subagent_type: "general-purpose"\`) with the contents of \`.github/skills/tech-debt/SKILL.md\` as the prompt
   - Wait for the agent to complete before continuing
4. If \`tech-backlog.md\` exists, check it for any \`[critical]\` items:
   - If critical items are found: use \`AskUserQuestion\` to alert: "Critical debt items exist: <list them>. Proceed with the feature, or address critical debt first?"
   - Wait for response before continuing to Step 3
5. Continue to Step 2.7 regardless of whether the tech debt agent ran or critical items were found (unless user chooses to address debt first)

\`TaskUpdate\` → mark "Tech debt check" as \`completed\`.

## Step 2.7: Requirements Interview — DELEGATED

\`TaskUpdate\` → mark "Requirements interview" as \`in_progress\`. ⚠️ REQUIRED — do not skip

### Skip condition

Skip this step and go directly to Step 3 if:
- Continuing on an existing branch with no new \`$ARGUMENTS\`
- \`$ARGUMENTS\` clearly describes work related to the current branch (e.g. "fix the tests" on a feature branch you're already building)
- The user explicitly asks to skip the interview (e.g. "just build it") — respect that and proceed to Step 3

### How to gather requirements

**Delegate to a sub-agent.** Spawn a \`general-purpose\` agent via the **Task tool** (foreground) with this prompt:

> You are a requirements interviewer for a coding task. The task description is: "$ARGUMENTS"
>
> Your job is to gather requirements by asking the user questions using \`AskUserQuestion\`. Use any mix of structured choices and freeform questions. Tailor every question to the specific task — do not ask generic questions.
>
> Cover these topics before finishing:
> - **Scope & goals**: What exactly should this feature/fix do? What's the expected outcome? What's explicitly out of scope?
> - **User-facing behavior**: Who/what triggers this? What does the user see or experience? What are the success and failure states?
> - **Edge cases & constraints**: Any known edge cases? Platform/environment constraints? Dependencies on external systems?
> - **Acceptance criteria**: How will we know this is done? Are there specific test scenarios?
>
> In detailed mode, also cover:
> - Architecture, data flow, error handling, testing strategy, API contracts, performance
>
> When done, compile all answers into a **Requirements Summary** (bulleted list). Present it to the user via \`AskUserQuestion\`: "Here's what I understand — anything to correct or add?" with options ["Looks good", "Needs changes"]. If "Needs changes", ask follow-up questions until confirmed.
>
> Return the final confirmed requirements summary as your result.

Store the returned requirements summary. Do NOT re-ask the user the same questions.

\`TaskUpdate\` → mark "Requirements interview" as \`completed\`.

## Step 3: Plan milestones — DELEGATED

\`TaskUpdate\` → mark "Plan milestones" as \`in_progress\`. ⚠️ REQUIRED — do not skip

**Delegate to a sub-agent.** Spawn a \`general-purpose\` agent via the **Task tool** (foreground) with this prompt:

> You are a planning agent. Create a milestone plan for implementing this task.
>
> **Task description:** "$ARGUMENTS"
> **Requirements summary:** <paste requirements from Step 2.7>
> **Codebase map:** <paste codebase-map.md contents if available>
>
> Explore the codebase to understand the relevant code. Then produce a plan using this template:
>
> ## Approach
> (2-3 sentences describing the high-level strategy)
>
> ## Milestones
> 1. <what gets built> + <what gets tested> [independent | depends-on: N]
> 2. ...
>
> ## Files to modify
> - path/to/file — reason
>
> ## Trade-offs
> (any relevant trade-offs, or "None" if not applicable)
>
> Return the complete plan as your result.

**Present the plan to the user** via \`AskUserQuestion\`: show the plan and ask "Accept this plan?" with options ["Accept", "Needs changes"]. If "Needs changes", use \`AskUserQuestion\` to ask what should change, then re-run the planning agent with the feedback. Repeat until accepted.

After acceptance:
- Create \`.tiller/compass.md\` if it doesn't exist (using the standard template)
- Update \`.tiller/compass.md\`: set Branch to the current branch, check off Orientation and Planning stages, list the numbered milestones
- Dynamically create one \`TaskCreate\` per milestone (e.g. "Build: <milestone description>"), then delete the placeholder "Build" task

\`TaskUpdate\` → mark "Plan milestones" as \`completed\`.

## Step 4: Build milestone by milestone — ALWAYS ORCHESTRATE

\`TaskUpdate\` → mark each milestone task as \`in_progress\` at the start, and \`completed\` at the end.

The main agent is a **pure orchestrator**. It does NOT implement any code itself — all implementation is delegated to spawned agents.

### Setup

1. Register each worker agent in the session before spawning. For each agent, append to \`.tiller/sessions/<slug>/session.json\` agents array:
   \`\`\`json
   {"name":"worker-<N>","type":"fleet","status":"active","startedAt":"<ISO-timestamp>"}
   \`\`\`
2. Set \`TILLER_AGENT_NAME\` environment variable for each spawned agent so hooks can identify it

### Execution

3. Group all currently unblocked milestones and use \`/fleet implement milestones: <list>\` to execute them in parallel
4. For sequential milestones (those with dependencies), execute them one by one using the Task tool after their dependencies complete
5. Do NOT implement any code yourself — delegate everything
6. When a worker completes: review the changes, run \`${config.runCommand}\`, fix integration issues if needed
7. Commit incrementally: \`git add -A && git commit -m "<milestone description>"\`
8. Add entry to \`changelog.md\` Done section. Amend: \`git commit --amend --no-edit\`
9. **detailed only:** Update \`.tiller/compass.md\` to check off the milestone. Amend: \`git commit --amend --no-edit\`
10. Mark the task completed via \`TaskUpdate\`, then use \`/fleet\` again for any newly unblocked milestones
11. Repeat until all milestones are done

## Step 4.5: Code Review

\`TaskUpdate\` → mark "Code review" as \`in_progress\`. ⚠️ REQUIRED — do not skip

After all milestones are built and committed, **detailed only:** check off the Testing stage in \`.tiller/compass.md\`. Then spawn the Quartermaster to review the feature branch:

1. Use the **Task tool** (foreground, \`subagent_type: "quartermaster"\`)
2. Wait for the Quartermaster's verdict

**On PASS:**
- **detailed only:** Check off the Quartermaster review stage in \`.tiller/compass.md\`
- Proceed to Step 5

**On FAIL:**
- Review the issues list
- Fix the issues, then present a rebuttal to the Quartermaster: re-spawn via Task tool (\`subagent_type: "quartermaster"\`) with the rebuttal context
- If Quartermaster returns PASS (or PASS WITH NOTES): proceed to Step 5
- If Quartermaster returns FAIL again and says "ESCALATE TO CAPTAIN":
  - Spawn the Captain via the **Task tool** (foreground, \`subagent_type: "captain"\`) with a summary of: the disputed issues, the Sailing Agent's rebuttal, and the Quartermaster's maintained objections
  - Wait for the Captain's ruling
  - Present the Captain's ruling to the user
  - If ruling is AGREE WITH QUARTERMASTER: fix the required items before docking
  - If ruling is AGREE WITH SAILING AGENT: proceed to Step 5
  - If ruling is COMPROMISE: fix the blocking items, log the rest to \`tech-backlog.md\`, proceed to Step 5

\`TaskUpdate\` → mark "Code review" as \`completed\`.

## Step 5: Complete — Dock or Continue

\`TaskUpdate\` → mark "Complete" as \`in_progress\`, then \`completed\` after announcing.

**simple:** Summarize what was built in one sentence.
**detailed:** Add a note to \`.tiller/compass.md\` under Notes: "Sail complete — ready to /dock." Summarize everything that was built across all milestones.

Then use \`AskUserQuestion\` to ask: "What next?" with options:
- **"Dock"** → Run \`/dock\` to merge and clean up. End.
- **"Start new sail"** → Use \`AskUserQuestion\` to ask: "What should we work on next?" (freeform). Take the response as the new $ARGUMENTS and loop back to **Step 2** (branch routing). Reuse the existing progress tracking tasks — create fresh ones for the new sail.

This loop continues until the user chooses to dock.

## If something goes wrong

**simple:** Fix it yourself first. Only tell the user if you genuinely can't resolve it.
**detailed:** Explain what happened and what you plan to do.
`
  );
}
