import type { ProjectConfig } from "../types.js";

export function generateSailSkill(config: ProjectConfig): string {
  return (
    `---
name: sail
description: Start or continue work — features, fixes, and tasks.
---

# /sail — Start or continue work

Use this skill to contribute anything: new features, bug fixes, or incremental tasks on an existing branch. It handles branch routing automatically so you can focus on the work.

## Sub-agent registration rule (applies to ALL steps)

**Every time** you spawn a sub-agent (via the Agent tool), you MUST register it in the session BEFORE spawning.

**Preferred — use the MCP tool** (if \`tiller/register-agent\` is available):
Use the \`tiller/register-agent\` MCP tool with parameters: \`{ "sessionSlug": "<slug>", "name": "<agent-name>", "type": "<agent-type>", "startedAt": "<ISO timestamp>" }\`.
Then write the current-agent file: \`echo "<agent-name>" > .tiller/sessions/<slug>/current-agent\`

**Fallback — use the Python script** (if MCP tool is not available):
\`\`\`bash
ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
python3 .tiller/bin/register-agent.py ".tiller/sessions/<slug>/session.json" "$ts" "<agent-name>" "<agent-type>"
echo "<agent-name>" > .tiller/sessions/<slug>/current-agent
\`\`\`

Use descriptive names and types: e.g. \`"interviewer" "requirements"\`, \`"planner" "planning"\`, \`"worker-1" "fleet"\`, \`"quartermaster" "review"\`.

After a sub-agent completes, mark it completed and restore the lead agent:

**Preferred — MCP tool:** Use \`tiller/complete-agent\` with \`{ "sessionSlug": "<slug>", "agentName": "<agent-name>" }\`, then \`echo "sail-lead" > .tiller/sessions/<slug>/current-agent\`.

**Fallback — Python script:**
\`\`\`bash
python3 .tiller/bin/complete-agent.py ".tiller/sessions/<slug>/session.json" "<agent-name>"
echo "sail-lead" > .tiller/sessions/<slug>/current-agent
\`\`\`

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
   - **If it does not exist**: create the session folder and metadata (include sail-lead in agents):
     \`\`\`bash
     mkdir -p .tiller/sessions/<slug> && echo '{"id":"<slug>","branch":"<branch>","startedAt":"<ISO-timestamp>","status":"active","agents":[{"name":"sail-lead","type":"lead","status":"active","startedAt":"<ISO-timestamp>"}]}' > .tiller/sessions/<slug>/session.json
     echo "sail-lead" > .tiller/sessions/<slug>/current-agent
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
  - **Uncertain** → ask the user: "Should I continue on \`<current-branch>\` (treating this as the next task), or start a new branch \`<prefix>/<kebab>\`?"
    - Wait for the user's choice before continuing.

**$ARGUMENTS provided + on main:**
  Check if a branch named \`<prefix>/<kebab-case-of-arguments>\` already exists locally or remotely.
  - If it exists: switch to it. Ask: "Found existing branch <prefix>/<name>. Continue where we left off, or do you want to revisit the plan first?"
    - Continue → pick up from the next unchecked milestone
    - Revisit → summarize what's done so far, discuss before building
  - If it doesn't exist: create it from main.
    - **simple:** Say: "On it."
    - **detailed:** State: "Starting work on: <description>"

**No arguments + already on a feature or fix branch** → continue.
  - **simple:** Say nothing unless asked.
  - **detailed:** State: "Continuing work on: <branch-name>"

**No arguments + on main** → list open feature and fix branches briefly, ask what to work on.

\`TaskUpdate\` → mark "Branch routing" as \`completed\`.

## Step 2.5: Tech debt check

\`TaskUpdate\` → mark "Tech debt check" as \`in_progress\`.

Before planning, check if a tech debt cleanup is due:

1. Count lines in \`changelog.md\` matching the pattern \`- [` +
    `[^]]*] (landed|docked) feature/\` — this is \`landedCount\`
2. Read \`.tiller/tech-debt.json\` — get \`lastTechDebtAtFeature\` and \`threshold\` (default threshold: 3)
3. If \`(landedCount - lastTechDebtAtFeature) >= threshold\`:
   - Use the **Task tool** (foreground, \`subagent_type: "general-purpose"\`) with the contents of \`.claude/skills/tech-debt/SKILL.md\` as the prompt
   - Wait for the agent to complete before continuing
4. If \`tech-backlog.md\` exists, check it for any \`[critical]\` items:
   - If critical items are found: **alert the user** before planning: "Critical debt items exist: <list them>. Proceed with the feature, or address critical debt first?"
   - Wait for user response before continuing to Step 3
5. Continue to Step 2.7 regardless of whether the tech debt agent ran or critical items were found (unless user chooses to address debt first)

\`TaskUpdate\` → mark "Tech debt check" as \`completed\`.

## Step 2.7: Requirements Interview

\`TaskUpdate\` → mark "Requirements interview" as \`in_progress\`. ⚠️ REQUIRED — do not skip

Gather requirements from the user before planning. This eliminates ambiguity and reduces rework.

### Skip condition

Skip this step and go directly to Step 3 if:
- Continuing on an existing branch with no new \`$ARGUMENTS\`
- \`$ARGUMENTS\` clearly describes work related to the current branch (e.g. "fix the tests" on a feature branch you're already building)
- The user explicitly asks to skip the interview (e.g. "just build it") — respect that and proceed to Step 3

### How to interview

Use any mix of \`AskUserQuestion\` (structured) and freeform conversational questions. There is no fixed phase ordering — cycle between structured and freeform as the conversation demands. Start wherever makes sense for the task, and keep going until no ambiguity remains.

Tailor every question to the specific \`$ARGUMENTS\` and codebase context — do not ask generic questions.

### Core topics (all modes)

Cover these before moving on:
- **Scope & goals**: What exactly should this feature/fix do? What's the expected outcome? What's explicitly out of scope?
- **User-facing behavior**: Who/what triggers this? What does the user see or experience? What are the success and failure states?
- **Edge cases & constraints**: Any known edge cases? Platform/environment constraints? Dependencies on external systems?
- **Acceptance criteria**: How will we know this is done? Are there specific test scenarios?

Also watch for and address:
- Contradictions or ambiguities in answers
- Interactions with existing features discovered during codebase exploration
- Priority trade-offs (speed vs thoroughness, etc.)

### Technical topics (detailed mode only)

In detailed mode, also cover:
- **Architecture**: Which existing patterns/modules to follow? Where should new code live?
- **Data flow & error handling**: Input validation, error states, recovery behavior
- **Testing strategy**: Unit vs integration, specific scenarios, mocking needs
- **API contracts & backwards compatibility**: Breaking changes, migration path, versioning
- **Performance**: Any latency/memory/scaling considerations?

### Output

Compile all answers into a **Requirements Summary** (bulleted list). Present it to the user: "Here's what I understand — anything to correct or add?" Wait for confirmation before proceeding to Step 3.

\`TaskUpdate\` → mark "Requirements interview" as \`completed\`.

## Step 3: Plan milestones

\`TaskUpdate\` → mark "Plan milestones" as \`in_progress\`. ⚠️ REQUIRED — do not skip

Use the requirements summary from Step 2.7 to inform milestone breakdown.

**If mode is simple:** Explore the codebase and break the work into 2–5 milestones internally. Do not show this plan to the user. Tag each milestone as \`[independent]\` or \`[depends-on: N]\` based on whether it can run in parallel with others.

**If mode is detailed:** Call \`EnterPlanMode\`. In the plan file, use this exact template — fill in every section, do not omit any:

\`\`\`
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
\`\`\`

\`TaskUpdate\` → mark "Plan milestones" as \`completed\`.

After planning produces milestones, dynamically create one \`TaskCreate\` per milestone (e.g. "Build: <milestone description>"), then delete the placeholder "Build" task.

## Step 3.5: Evaluate scope

Before building, classify the task into a tier using these heuristics on the milestones from Step 3:

- **Small**: < 3 milestones AND < 5 files AND single subsystem
- **Large**: >= 6 milestones OR >= 10 files OR >= 3 independent subsystems
- **Medium**: everything else

**If mode is simple:** Evaluate silently, pick the tier, proceed to Step 4.
**If mode is detailed:** Announce: "Scope assessment: **<tier>** — <rationale>" and ask the user to confirm or override the tier. Wait for confirmation before proceeding.

## Step 4: Build milestone by milestone

For each milestone, \`TaskUpdate\` → mark its task as \`in_progress\` at the start, and \`completed\` at the end.

After planning, look at the dependency tags on your milestones. **detailed only:** Read \`.tiller/compass.md\` to find the milestone checklist and resume from the first unchecked milestone. Use the tier from Step 3.5 to select the execution path.

### Small tier — solo sequential

All milestones run one by one, no agent spawning:
1. **detailed only:** Announce: "Milestone X/N: <description>"
2. Build the functionality
3. Add or update tests for what was built
4. Run \`${config.runCommand}\` — **simple:** fix failures silently. **detailed:** fix before continuing.
5. \`git add -A && git commit -m "<milestone description>"\`
6. Add entry to \`changelog.md\` Done section. Amend: \`git commit --amend --no-edit\`
7. **detailed only:** Update \`.tiller/compass.md\` to check off this milestone. Amend: \`git commit --amend --no-edit\`
8. **simple:** Say: "Saved: <what changed>". **detailed:** Report: "Saved: <description> (X/N)"

### Medium tier — parallel with /fleet

Use \`/fleet\` to execute independent milestones in parallel:

**Setup:** Register each worker agent per the sub-agent registration rule above (use type \`"fleet"\`).

**Execution:**
3. Use \`/fleet implement milestones: <list of independent milestones>\` to execute independent milestones in parallel
4. While fleet workers run, the lead agent handles any sequential milestones that are unblocked
5. When each milestone completes, run \`${config.runCommand}\` to verify
6. Commit incrementally: \`git add -A && git commit -m "<milestone description>"\`
7. Add entry to \`changelog.md\` Done section. Amend: \`git commit --amend --no-edit\`

**Then continue** with any remaining sequential milestones using the Small tier loop above.

### Large tier — orchestrator mode with /fleet

The main agent becomes a pure orchestrator. It does NOT implement any code itself — all implementation is delegated to spawned agents.

**Setup:** Register each worker agent per the sub-agent registration rule above (use type \`"fleet"\`).

**Execution:**
3. Group all currently unblocked milestones and use \`/fleet implement milestones: <list>\` to execute them in parallel, selecting the model based on milestone complexity:
   - **haiku**: simple, mechanical milestones (rename, move files, update imports, boilerplate)
   - **sonnet**: moderate implementation (new functions, test writing, standard feature work)
   - **opus**: complex or architectural work (design decisions, cross-cutting changes, tricky logic)
4. Do NOT implement any code yourself — delegate everything
5. When a worker completes: review the changes, run \`${config.runCommand}\`, fix integration issues if needed
6. Commit incrementally: \`git add -A && git commit -m "<milestone description>"\`
7. Add entry to \`changelog.md\` Done section. Amend: \`git commit --amend --no-edit\`
8. **detailed only:** Update \`.tiller/compass.md\` to check off the milestone. Amend: \`git commit --amend --no-edit\`
9. Mark the task completed via \`TaskUpdate\`, then use \`/fleet\` again for any newly unblocked milestones (using the same model selection rules)
10. Repeat until all milestones are done

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

### Within-milestone split (optional)

For a large milestone where implementation and tests are clearly separable, the lead can spawn a single worker agent to write tests while it implements:
- Lead implements the feature code
- Worker (spawned via \`Task\` tool) writes the tests in parallel
- Register the worker in \`.tiller/sessions/<slug>/session.json\` before spawning and set \`TILLER_AGENT_NAME\`
- Lead reviews, runs \`${config.runCommand}\`, commits

\`TaskUpdate\` → mark "Code review" as \`completed\`.

## Step 5: Complete

\`TaskUpdate\` → mark "Complete" as \`in_progress\`, then \`completed\` after announcing.

**simple:** Say: "Feature complete. Type /dock when ready to merge."
**detailed:** Add a note to \`.tiller/compass.md\` under Notes: "Sail complete — ready to /dock." Summarize everything that was built across all milestones. Suggest \`/dock\` to merge.

## If something goes wrong

**simple:** Fix it yourself first. Only tell the user if you genuinely can't resolve it.
**detailed:** Explain what happened and what you plan to do.
`
  );
}
