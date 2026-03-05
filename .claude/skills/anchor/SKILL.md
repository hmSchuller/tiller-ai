---
name: anchor
description: Anchor current progress with a commit on the feature branch
---

# /anchor — Anchor progress

## Step 0: Set up progress tracking

Create all tasks upfront using `TaskCreate` so the user sees a visible checklist:

1. "Check branch" (Step 1)
2. "Run verify" (Step 2)
3. "Commit" (Step 3)
4. "Update changelog" (Step 4)
5. "Code review" (Step 5)
6. "Confirm" (Step 6)

Save the returned task IDs for later `TaskUpdate` calls. Proceed immediately — do not wait for user input.

## Step 1: Check branch

`TaskUpdate` → mark "Check branch" as `in_progress`.

Run `git branch --show-current`.

If on `main`:
- **simple:** Say: "You're on main — use /sail to start a feature first." Stop.
- **detailed:** Warn: "You're on main. Anchor is for feature branches. Use /sail to start a feature branch first." Stop.

`TaskUpdate` → mark "Check branch" as `completed`.

## Step 2: Run verify

`TaskUpdate` → mark "Run verify" as `in_progress`.

Run `npm test`

If it fails:
- **simple:** Say: "Something's broken, let me fix it first." Fix it, then continue.
- **detailed:** Show the error output. Do NOT commit. Say: "Verify failed. Fix the errors and try /anchor again." Stop.

`TaskUpdate` → mark "Run verify" as `completed`.

## Step 3: Commit

`TaskUpdate` → mark "Commit" as `in_progress`.

If $ARGUMENTS is provided, use that as the commit message.

Otherwise, run `git diff --stat HEAD` and infer a short, descriptive commit message.

Format: `<verb> <what> — <brief detail if needed>`

```
git add -A
git commit -m "<message>"
```

`TaskUpdate` → mark "Commit" as `completed`.

## Step 4: Update changelog.md

`TaskUpdate` → mark "Update changelog" as `in_progress`.

Add an entry to the Done section of `changelog.md`:
```
- [YYYY-MM-DD] <message>
```

Run `git add changelog.md && git commit --amend --no-edit`.

`TaskUpdate` → mark "Update changelog" as `completed`.

## Step 5: Code Review

`TaskUpdate` → mark "Code review" as `in_progress`.

⚠️ REQUIRED — do not skip

Spawn the Quartermaster to review the feature branch diff against main:

1. Use the **Task tool** (foreground, `subagent_type: "quartermaster"`)
2. Wait for the Quartermaster's verdict

**On PASS:**
- Proceed to Step 7

**On FAIL:**
- Review the issues list
- Fix the issues, then present a rebuttal to the Quartermaster: re-spawn via Task tool (`subagent_type: "quartermaster"`) with the rebuttal context
- If Quartermaster returns PASS (or PASS WITH NOTES): proceed to Step 6
- If Quartermaster returns FAIL again and says "ESCALATE TO CAPTAIN":
  - Spawn the Captain via the **Task tool** (foreground, `subagent_type: "captain"`) with a summary of: the disputed issues, the Anchor Agent's rebuttal, and the Quartermaster's maintained objections
  - Wait for the Captain's ruling
  - Present the Captain's ruling to the user
  - If ruling is AGREE WITH QUARTERMASTER: fix the required items before finishing
  - If ruling is AGREE WITH SAILING AGENT: proceed to Step 6
  - If ruling is COMPROMISE: fix the blocking items, log the rest to `tech-backlog.md`, proceed to Step 6

`TaskUpdate` → mark "Code review" as `completed`.

## Step 6: Confirm

`TaskUpdate` → mark "Confirm" as `in_progress`.

- **simple:** Say: "Anchored. Keep going or type /dock when you're done."
- **detailed:** Say: "Anchored: <message>. Use /dock when this feature is ready to merge."

`TaskUpdate` → mark "Confirm" as `completed`.
