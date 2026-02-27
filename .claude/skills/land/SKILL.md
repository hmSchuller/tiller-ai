---
name: land
description: Merge completed feature to main and clean up the branch
---

# /land — Merge feature to main

1. Check branch — if on `main`, say: "You're already on main." Stop.

2. Save the current branch name as `<feature-branch>`.

3. Run `` — if it fails, say: "Something's not working, let me sort it out." Fix it first.

4. Commit any uncommitted changes: `git add -A && git commit -m "wip: save before landing"`

5. Merge:
```
git checkout main
git merge --no-ff <feature-branch> -m "land: <feature-branch>"
git branch -d <feature-branch>
```

6. Update vibestate.md: clear Active feature, add Done entry. Commit.

1. Clear the "Active feature" section: set it to "None — on main, ready to start something."
2. Add an entry to Done: `- [YYYY-MM-DD] landed <feature-branch>`
3. Commit: `git add vibestate.md && git commit -m "update vibestate: landed <feature-branch>"`

## Step 7: Confirm

Say: "Feature landed on main. Run `/clear` to reset context before your next feature, then `/vibe` to continue."
