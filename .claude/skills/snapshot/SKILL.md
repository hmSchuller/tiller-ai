---
name: snapshot
description: Save current progress with a commit on the feature branch
---

# /snapshot — Save progress

## Step 1: Check branch

Run `git branch --show-current`.

If on `main`: warn — "You're on main. Snapshot is for feature branches. Use /vibe to start a feature branch first." Stop.

## Step 2: Run verify

Run ``

If it fails:
- Show the error output
- Do NOT commit
- Say: "Verify failed. Fix the errors and try /snapshot again."
- Stop here.

## Step 3: Describe changes

If $ARGUMENTS is provided, use that as the commit message.

Otherwise, run `git diff --stat HEAD` and infer a short, descriptive commit message.

Format: `<verb> <what> — <brief detail if needed>`
Examples: "add search bar to header", "fix null check in auth middleware"

## Step 4: Commit

```
git add -A
git commit -m "<message>"
```

## Step 5: Update vibestate.md

Add an entry to the Done section:
```
- [YYYY-MM-DD] <message>
```

Run `git add vibestate.md && git commit --amend --no-edit`.

## Step 6: Confirm

Say: "Snapshot saved: <message>. Use /land when this feature is ready to merge."
