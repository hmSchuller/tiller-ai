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

## Step 6: Confirm

- **simple:** Say: "Anchored. Keep going or type /land when you're done."
- **detailed:** Say: "Anchored: <message>. Use /land when this feature is ready to merge."
