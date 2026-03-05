---
name: underway
description: Execute the plan in compass.md — creates branch, builds milestones, runs tests, spawns Quartermaster. Run after /sail, or directly to resume an in-progress feature.
---

# /underway — Execute the plan

You start with a clean context. Your only source of truth is `.tiller/compass.md`. Read it first — everything you need is there.

You do not plan. You do not interview. You execute.

## Step 1: Read the compass

Read `.tiller/compass.md`. Extract:
- **Feature** — what is being built
- **Branch** — the target branch
- **Scope** — Small, Medium, or Large
- **Milestones** — find the first unchecked `[ ]` milestone
- **Verify command** — use this for all test runs
- **Files to modify** — reference per milestone

Read `.tiller/tiller.json` (and `.tiller/local.json` if present) for mode.

If `.tiller/compass.md` does not exist or is empty:
→ Stop. Say: "No compass found. Run /sail first."

If all milestones including Quartermaster review are already checked:
→ Stop. Say: "This feature is already complete. Run /dock to merge."

## Step 2: Set up branch

Run `git branch --show-current`.

If already on the correct branch: continue.

If on main and branch exists locally or remotely:
```
git checkout <branch>
```

If on main and branch does not exist:
```
git checkout -b <branch>
```

If on a different feature branch: stop and say "Already on \`<current-branch>\`. Check compass.md or run /sail to start a new plan."

## Step 3: Set up progress tracking

`TaskCreate` one task per unchecked milestone. Save task IDs. Proceed immediately.

## Step 4: Execute milestones

Use Scope from compass.md to select execution path.

Skip any milestone named "Quartermaster review" — that is handled in Step 5.

---

### Small — sequential

For each unchecked non-Quartermaster milestone in order:

1. `TaskUpdate` → `in_progress`
2. **detailed:** Announce "Milestone X/N: <description>"
3. Build the functionality
4. Add or update tests
5. Run verify command — fix any failures before continuing
6. `git add -A && git commit -m "<milestone description>"`
7. Add entry to `changelog.md` Done section. Amend: `git commit --amend --no-edit`
8. Check off milestone in `.tiller/compass.md`. Amend: `git commit --amend --no-edit`
9. `TaskUpdate` → `completed`
10. **simple:** "Saved: <what changed>" **detailed:** "Saved: <description> (X/N)"

---

### Medium — parallel with lead participation

**Setup:**
1. `TeamCreate` — name after branch
2. For each independent unchecked milestone: `TaskCreate` with full context
3. Spawn one `general-purpose` agent per independent milestone via Task tool with `team_name`. Each worker receives:
   - Milestone description and exact files in scope (from compass.md)
   - Branch name — already checked out, do not switch
   - Verify command
   - "Implement only your scoped files. Run verify before reporting done. Do NOT commit. Report done via SendMessage with a summary of what you changed."

**Coordination:**
4. Lead handles unblocked sequential milestones in parallel
5. Monitor via `TaskList`
6. On worker completion: review changes, `TaskUpdate` → completed
7. When all independent milestones done: `SendMessage` type `shutdown_request`
8. Run verify command across all changes — fix failures as lead
9. `git add -A && git commit -m "<feature>: parallel milestones complete"`
10. Update `changelog.md`. Amend commit.
11. Check off all completed milestones in `.tiller/compass.md`. Amend commit.
12. Continue remaining sequential milestones using Small path above.

---

### Large — orchestrator mode

Lead does NOT write any implementation code.

**Setup:**
1. `TeamCreate` — name after branch
2. `TaskCreate` for all unchecked non-Quartermaster milestones with `addBlockedBy` matching `[depends-on: N]` tags
3. For each currently unblocked milestone, spawn worker via Task tool with `team_name`. Select model by complexity:
   - **haiku**: mechanical (rename, move, imports, boilerplate)
   - **sonnet**: standard implementation (new functions, tests, feature work)
   - **opus**: complex/architectural (design decisions, cross-cutting changes)
4. Each worker receives: milestone description, exact files in scope, branch name, verify command, and: "Implement only your scoped files. Run verify before reporting done. Do NOT commit. Report done via SendMessage with a summary of what you changed."

**Coordination:**
5. Monitor via `TaskList` — do not write code
6. On worker completion: review changes, run verify, fix integration issues
7. `git add -A && git commit -m "<milestone description>"`
8. Update `changelog.md`. Amend commit.
9. Check off milestone in `.tiller/compass.md`. Amend commit.
10. `TaskUpdate` → completed. Spawn workers for newly unblocked milestones.
11. Repeat until all implementation milestones done.
12. `SendMessage` type `shutdown_request`

---

## Step 5: Quartermaster review ⚠️ REQUIRED — do not skip

`TaskCreate` "Quartermaster review". `TaskUpdate` → `in_progress`.

Check off the Testing stage in `.tiller/compass.md`:
`git add .tiller/compass.md && git commit -m "chore: testing stage complete"`

1. Spawn Quartermaster via Task tool (`subagent_type: "quartermaster"`)
2. Wait for verdict

**PASS:**
- Check off "Quartermaster review" in `.tiller/compass.md`. Commit.
- `TaskUpdate` → `completed`
- Proceed to Step 6

**FAIL:**
- Fix all listed issues
- Re-spawn Quartermaster via Task tool with rebuttal context (original issues + what was fixed)
- PASS or PASS WITH NOTES → proceed to Step 6
- FAIL again + "ESCALATE TO CAPTAIN":
  - Spawn Captain via Task tool (`subagent_type: "captain"`) with: disputed issues, your rebuttal, Quartermaster's maintained objections
  - **AGREE WITH QUARTERMASTER** → fix required items, re-run Quartermaster, then Step 6
  - **AGREE WITH SAILING AGENT** → proceed to Step 6
  - **COMPROMISE** → fix blocking items, log rest to `tech-backlog.md`, proceed to Step 6
- Check off "Quartermaster review" in `.tiller/compass.md`. Commit.
- `TaskUpdate` → `completed`

## Step 6: Complete

**simple:** 
- Summarize what was built across all milestones in product language. Do not specify tech, focus rather on the value created for the user of the software.
- Say: "All done. Run /dock to merge."

**detailed:**
- Add to `.tiller/compass.md` under Notes: "Underway complete — ready to /dock. [YYYY-MM-DD]". Commit.
- Summarize what was built across all milestones.
- Say: "Run /dock to merge."

## Resuming after interruption

If you were interrupted (context cleared, session ended, test failure):
1. Read `.tiller/compass.md`
2. Find the first unchecked `[ ]` milestone
3. Continue from there — do not redo completed milestones

The compass is the only state that matters. Trust the checkmarks.
