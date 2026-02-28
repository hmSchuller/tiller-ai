import type { ProjectConfig } from '../types.js';

export function generateSailSkill(config: ProjectConfig): string {
  return `---
name: sail
description: Start or continue working on an idea. Usage: /sail [idea description]
---

# /sail — Start or continue work

## Step 1: Orient

Read \`.claude/.tiller.json\` (and \`.tiller.local.json\` if it exists), \`compass.md\`, and \`changelog.md\` to understand current state.
Run \`git branch\` and \`git status\`.

State the current mode from \`.claude/.tiller.json\` (or \`.tiller.local.json\` if it overrides): "Mode: <mode>".

**If mode is simple:** Do not narrate the orient step.
**If mode is detailed:** Summarize the current state in 2-3 sentences.

## Step 2: Branch routing

**$ARGUMENTS provided** → check if a branch named \`feature/<kebab-case-of-arguments>\` already exists locally or remotely.
  - If it exists: switch to it. Read \`compass.md\` for current state. Ask: "Found existing branch feature/<name>. Continue where we left off, or do you want to revisit the plan first?"
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

1. Count lines in \`changelog.md\` matching the pattern \`- [` + `[^]]*] landed feature/\` — this is \`landedCount\`
2. Read \`.claude/.tiller-tech-debt.json\` — get \`lastTechDebtAtFeature\` and \`threshold\` (default threshold: 3)
3. If \`(landedCount - lastTechDebtAtFeature) >= threshold\`:
   - Use the **Task tool** (foreground, \`subagent_type: "general-purpose"\`) with the contents of \`.claude/skills/tech-debt/SKILL.md\` as the prompt
   - Wait for the agent to complete before continuing
4. If \`tech-backlog.md\` exists, check it for any \`[critical]\` items:
   - If critical items are found: **alert the user** before planning: "Critical debt items exist: <list them>. Proceed with the feature, or address critical debt first?"
   - Wait for user response before continuing to Step 3
5. Continue to Step 3 regardless of whether the tech debt agent ran or critical items were found (unless user chooses to address debt first)

## Step 3: Plan milestones

**If mode is simple:** Explore the codebase and break the work into 2–5 milestones internally. Do not show this plan to the user. Tag each milestone as \`[independent]\` or \`[depends-on: N]\` based on whether it can run in parallel with others.

**If mode is detailed:** Call \`EnterPlanMode\`. In the plan file, write:
- High-level approach (2–3 sentences)
- 2–5 numbered milestones, each with: what gets built + what gets tested + a dependency tag: \`[independent]\` if it can run in parallel with other independent milestones, or \`[depends-on: N]\` if it requires milestone N to complete first
- Files to create or modify
- Any trade-offs worth noting
- **Execution rules** (embed verbatim): After plan approval, read \`compass.md\` to find the milestone checklist, then execute the milestone loop: for each remaining milestone, announce "Milestone X/N: <description>", build functionality, add or update tests, run \`${config.runCommand}\` and fix failures, run \`git add -A && git commit -m "<milestone>"\`, update \`compass.md\` checkboxes and \`changelog.md\` Done section then amend commit, report "Saved: <description> (X/N)". When all milestones are done, summarize what was built and suggest \`/dock\`.

  Before exiting plan mode, write the milestone checklist to the \`Active feature\` section of \`compass.md\` with \`Status: executing\` and the plan file path.

## Step 4: Build milestone by milestone

After planning, look at the dependency tags on your milestones:

### If all milestones are sequential (all tagged \`[depends-on: N]\`)

Execute them one by one:
1. **detailed only:** Announce: "Milestone X/N: <description>"
2. Build the functionality
3. Add or update tests for what was built
4. Run \`${config.runCommand}\` — **simple:** fix failures silently. **detailed:** fix before continuing.
5. \`git add -A && git commit -m "<milestone description>"\`
6. Update \`compass.md\` milestone checkboxes (detailed) and add entry to \`changelog.md\` Done section. Amend: \`git commit --amend --no-edit\`
7. **simple:** Say: "Saved: <what changed>". **detailed:** Report: "Saved: <description> (X/N)"

### If independent milestones exist

Use agent teams to parallelize independent work:

**Setup:**
1. Use \`TeamCreate\` to create a team named after the feature branch (e.g. \`feature-x\`)
2. For each independent milestone, use \`TaskCreate\` to create a task with the milestone description and full context (branch name, files involved, verify command: \`${config.runCommand}\`)
3. For each independent milestone, spawn a \`general-purpose\` agent via the \`Task\` tool with \`team_name\` set. Provide each agent its task description and these instructions:
   - Work on branch \`<feature-branch>\` (already checked out — do not switch branches)
   - Implement only the files in your milestone scope
   - Run \`${config.runCommand}\` before reporting done — fix any failures
   - Do NOT commit — the lead agent commits
   - Report done via \`SendMessage\` to the lead with a summary of what you changed

**Coordination:**
4. While workers run, the lead agent handles any sequential milestones that are unblocked
5. Use \`TaskList\` to monitor progress
6. When a worker sends a completion message, update \`TaskUpdate\` to mark it completed
7. Once all independent milestones are done, shut down the team via \`SendMessage\` with \`type: "shutdown_request"\`
8. Run \`${config.runCommand}\` once across all changes — fix any failures as lead
9. \`git add -A && git commit -m "<feature>: parallel milestones <list>"\`
10. Update \`compass.md\` and \`changelog.md\`. Amend: \`git commit --amend --no-edit\`

**Then continue** with any remaining sequential milestones using the sequential loop above.

## Step 4.5: Code Review

After all milestones are built and committed, spawn the Quartermaster to review the feature branch:

1. Use the **Task tool** (foreground, \`subagent_type: "general-purpose"\`, **\`model: "opus"\`**) with the contents of \`.claude/agents/quartermaster.md\` as the prompt
2. Wait for the Quartermaster's verdict

**On PASS:**
- Proceed to Step 5

**On FAIL:**
- Review the issues list
- Fix the issues, then present a rebuttal to the Quartermaster: re-spawn via Task tool with the original prompt plus the rebuttal context
- If Quartermaster returns PASS (or PASS WITH NOTES): proceed to Step 5
- If Quartermaster returns FAIL again and says "ESCALATE TO CAPTAIN":
  - Spawn the Captain via the **Task tool** (foreground, \`subagent_type: "general-purpose"\`, **\`model: "opus"\`**) with the contents of \`.claude/agents/captain.md\` as the prompt, plus a summary of: the disputed issues, the Sailing Agent's rebuttal, and the Quartermaster's maintained objections
  - Wait for the Captain's ruling
  - Present the Captain's ruling to the user
  - If ruling is AGREE WITH QUARTERMASTER: fix the required items before docking
  - If ruling is AGREE WITH SAILING AGENT: proceed to Step 5
  - If ruling is COMPROMISE: fix the blocking items, log the rest to \`tech-backlog.md\`, proceed to Step 5

### Within-milestone split (optional)

For a large milestone where implementation and tests are clearly separable, the lead can spawn a single worker agent to write tests while it implements:
- Lead implements the feature code
- Worker (spawned via \`Task\` tool, no team needed) writes the tests in parallel
- Worker reports back via \`SendMessage\` when done
- Lead reviews, runs \`${config.runCommand}\`, commits

## Step 5: Complete

**simple:** Say: "Feature complete. Type /dock when ready to merge."
**detailed:** Summarize everything that was built across all milestones. Suggest \`/dock\` to merge.

## If something goes wrong

**simple:** Fix it yourself first. Only tell the user if you genuinely can't resolve it.
**detailed:** Explain what happened and what you plan to do.
`;
}
