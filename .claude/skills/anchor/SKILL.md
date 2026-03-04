---
name: anchor
description: Anchor current progress with a commit on the feature branch
---

# /anchor — Anchor progress

## Step 1: Check branch

Run `git branch --show-current`.

If on `main`:
- **simple:** Say: "You're on main — use /sail to start a feature first." Stop.
- **detailed:** Warn: "You're on main. Anchor is for feature branches. Use /sail to start a feature branch first." Stop.

## Step 2: Run verify

Run `npm test`

If it fails:
- **simple:** Say: "Something's broken, let me fix it first." Fix it, then continue.
- **detailed:** Show the error output. Do NOT commit. Say: "Verify failed. Fix the errors and try /anchor again." Stop.

## Step 3: Describe changes

If $ARGUMENTS is provided, use that as the commit message.

Otherwise, run `git diff --stat HEAD` and infer a short, descriptive commit message.

Format: `<verb> <what> — <brief detail if needed>`

## Step 4: Commit

```
git add -A
git commit -m "<message>"
```

## Step 5: Update changelog.md

Add an entry to the Done section of `changelog.md`:
```
- [YYYY-MM-DD] <message>
```

Run `git add changelog.md && git commit --amend --no-edit`.

## Step 6: Code Review ⚠️ REQUIRED — do not skip

Spawn the Quartermaster to review the feature branch diff against main:

1. Use the **Task tool** (foreground, `subagent_type: "quartermaster"`)
2. Wait for the Quartermaster's verdict

**On PASS:**
- Proceed to Step 7

**On FAIL:**
- Review the issues list
- Fix the issues, then present a rebuttal to the Quartermaster: re-spawn via Task tool (`subagent_type: "quartermaster"`) with the rebuttal context
- If Quartermaster returns PASS (or PASS WITH NOTES): proceed to Step 7
- If Quartermaster returns FAIL again and says "ESCALATE TO CAPTAIN":
  - Spawn the Captain via the **Task tool** (foreground, `subagent_type: "captain"`) with a summary of: the disputed issues, the Anchor Agent's rebuttal, and the Quartermaster's maintained objections
  - Wait for the Captain's ruling
  - Present the Captain's ruling to the user
  - If ruling is AGREE WITH QUARTERMASTER: fix the required items before finishing
  - If ruling is AGREE WITH SAILING AGENT: proceed to Step 7
  - If ruling is COMPROMISE: fix the blocking items, log the rest to `tech-backlog.md`, proceed to Step 7

## Step 7: Confirm

- **simple:** Say: "Anchored. Keep going or type /dock when you're done."
- **detailed:** Say: "Anchored: <message>. Use /dock when this feature is ready to merge."
