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

7. Say: "Done. What's next?"
