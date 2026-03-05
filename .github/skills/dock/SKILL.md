---
name: dock
description: Merge completed feature to main and clean up the branch
---

# /dock — Merge feature to main

## Step 0: Set up progress tracking

Create all tasks upfront using `TaskCreate` so the user sees a visible checklist:

1. "Check branch" (Step 1)
2. "Run verify" (Step 2)
3. "Commit uncommitted changes" (Step 3)
4. "Quartermaster check" (Step 4)
5. "Run cartographer" (Step 5)
6. "Check workflow & merge/PR" (Step 6)
7. "Update changelog" (Step 7)
8. "Confirm" (Step 8)

Save the returned task IDs for later `TaskUpdate` calls. Proceed immediately — do not wait for user input.

## Step 1: Check branch

`TaskUpdate` → mark "Check branch" as `in_progress`.

Run `git branch --show-current`.

If on `main`:
- **simple:** Say: "You're already on main." Stop.
- **detailed:** Error: "You're already on main. Switch to the feature branch you want to dock." Stop.

Save the current branch name as `<feature-branch>`.

`TaskUpdate` → mark "Check branch" as `completed`.

## Step 2: Run verify

`TaskUpdate` → mark "Run verify" as `in_progress`.

Run `npm test`

If it fails:
- **simple:** Say: "Something's not working, let me sort it out." Fix it first.
- **detailed:** Show the error output. Do NOT proceed. Say: "Verify failed. Fix the errors and try /dock again." Stop.

`TaskUpdate` → mark "Run verify" as `completed`.

## Step 3: Commit any uncommitted changes

`TaskUpdate` → mark "Commit uncommitted changes" as `in_progress`.

Run `git status --porcelain`.

If there are uncommitted changes:
```
git add -A
git commit -m "wip: save before docking"
```

`TaskUpdate` → mark "Commit uncommitted changes" as `completed`.

## Step 4: Quartermaster check

`TaskUpdate` → mark "Quartermaster check" as `in_progress`.

Determine whether the Quartermaster has already reviewed the current work in this session:

**Case A — Session history available and Quartermaster already ran:** The session contains a Quartermaster review (PASS or FAIL resolved to proceed). Skip this step and proceed to Step 5.

**Case B — Session history available and Quartermaster has NOT run:** Spawn the Quartermaster now using the **Task tool** (foreground, `subagent_type: "quartermaster"`) to review the feature branch diff against main.

- On **PASS**: proceed to Step 5.
- On **FAIL**: fix the issues raised, then re-spawn the Quartermaster with the fixes and your rebuttal.
  - If the Quartermaster FAILs again with "ESCALATE TO CAPTAIN": spawn the Captain via the **Task tool** (foreground, `subagent_type: "captain"`) with the disputed issues, your rebuttal, and the Quartermaster objections.
    - **AGREE WITH QUARTERMASTER** → fix before proceeding.
    - **AGREE WITH SAILING AGENT** → proceed to Step 5.
    - **COMPROMISE** → fix blocking items, log the rest to `tech-backlog.md`, then proceed.

**Case C — Session history not available** (context was cleared): Ask the user:

> "The Quartermaster code review hasn't run in this session (context may have been cleared). Would you like me to run it now before docking?"

- If yes → run the Quartermaster as in Case B.
- If no → proceed to Step 5.

`TaskUpdate` → mark "Quartermaster check" as `completed`.

## Step 5: Run cartographer

`TaskUpdate` → mark "Run cartographer" as `in_progress`.

Use the **Task tool** (foreground, `subagent_type: "cartographer"`).

The cartographer will update `codebase-map.md` based on the docked feature changes.

After the cartographer completes, commit the updated map if it changed:

```
git add codebase-map.md && git diff --staged --quiet || git commit -m "map: update codebase map"
```

Then handle any Structural Concerns the cartographer reported:

- If the output contains a `## Structural Concerns` section recommending `escalate to captain`: spawn the Captain via the **Task tool** (foreground, `subagent_type: "captain"`) with the concerns as context. Present the Captain's ruling to the user.
- If recommending `log to tech-backlog.md`: add the items directly to `tech-backlog.md` (create the file if it doesn't exist).
- If recommending `monitor` or no concerns: continue.

`TaskUpdate` → mark "Run cartographer" as `completed`.

## Step 6: Check workflow

`TaskUpdate` → mark "Check workflow & merge/PR" as `in_progress`.

Read workflow from `.tiller/local.json` if it exists, otherwise from `.tiller/tiller.json`. Default: solo.

**If workflow is solo** → go to Step 6a (local merge).
**If workflow is team** → go to Step 6b (open PR).

## Step 6a: Solo — merge to main

```
git checkout main
git merge --no-ff <feature-branch> -m "dock: <feature-branch>"
git branch -d <feature-branch>
```

Then go to Step 7.

## Step 6b: Team — open PR

First, update changelog so the single push includes it:

1. Add an entry to the Done section of `changelog.md`: `- [YYYY-MM-DD] PR opened: <feature-branch>`
2. Commit:
   ```
   git add changelog.md && git commit -m "update changelog: docked <feature-branch>"
   ```

Then push and open the PR:
```
git push origin <feature-branch>
```

Check if `gh` CLI is available: run `which gh`.

**If gh is available:**
```
gh pr create --fill
```
Print the PR URL. Say: "PR opened. Merge happens on GitHub after review and CI."

**If gh is not available:**
Run `git remote get-url origin` to get the remote URL. Convert to a browser URL if needed.
Say: "Push done. Open a PR at: <remote-url>/compare/<feature-branch>"

Then go to Step 8 (do NOT delete the branch locally — it will be deleted after the PR merges remotely).

`TaskUpdate` → mark "Check workflow & merge/PR" as `completed`.

## Step 7: Update changelog.md (solo only)

`TaskUpdate` → mark "Update changelog" as `in_progress`.

1. Add an entry to the Done section of `changelog.md`:
   - `- [YYYY-MM-DD] docked <feature-branch>`
2. Commit:
   ```
   git add changelog.md && git commit -m "update changelog: docked <feature-branch>"
   ```

`TaskUpdate` → mark "Update changelog" as `completed`.

## Step 8: Confirm

`TaskUpdate` → mark "Confirm" as `in_progress`.

- **simple:** Say: "Done. Run `/clear` to reset context before starting your next feature, then `/sail` to continue."
- **detailed:** Say: "Feature docked. Run `/clear` to reset context before your next feature, then `/sail` to continue."

`TaskUpdate` → mark "Confirm" as `completed`.
