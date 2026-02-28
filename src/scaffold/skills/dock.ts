import type { ProjectConfig } from '../types.js';

export function generateDockSkill(config: ProjectConfig): string {
  return `---
name: dock
description: Merge completed feature to main and clean up the branch
---

# /dock — Merge feature to main

## Step 1: Check branch

Run \`git branch --show-current\`.

If on \`main\`:
- **simple:** Say: "You're already on main." Stop.
- **detailed:** Error: "You're already on main. Switch to the feature branch you want to dock." Stop.

Save the current branch name as \`<feature-branch>\`.

## Step 2: Run verify

Run \`${config.runCommand}\`

If it fails:
- **simple:** Say: "Something's not working, let me sort it out." Fix it first.
- **detailed:** Show the error output. Do NOT proceed. Say: "Verify failed. Fix the errors and try /dock again." Stop.

## Step 3: Commit any uncommitted changes

Run \`git status --porcelain\`.

If there are uncommitted changes:
\`\`\`
git add -A
git commit -m "wip: save before docking"
\`\`\`

## Step 4: Check workflow

Read workflow from \`.tiller.local.json\` if it exists, otherwise from CLAUDE.md or \`.tiller.json\`. Default: solo.

**If workflow is solo** → go to Step 5a (local merge).
**If workflow is team** → go to Step 5b (open PR).

## Step 5a: Solo — merge to main

\`\`\`
git checkout main
git merge --no-ff <feature-branch> -m "dock: <feature-branch>"
git branch -d <feature-branch>
\`\`\`

Then go to Step 6.

## Step 5b: Team — open PR

First, update changelog and vibestate so the single push includes them:

1. Add an entry to the Done section of \`changelog.md\`: \`- [YYYY-MM-DD] PR opened: <feature-branch>\`
2. Clear the \`Active feature\` section of \`vibestate.md\`: set it to "None — on main, ready to start something."
3. Commit:
   \`\`\`
   git add changelog.md vibestate.md && git commit -m "update changelog: docked <feature-branch>"
   \`\`\`

Then push and open the PR:
\`\`\`
git push origin <feature-branch>
\`\`\`

Check if \`gh\` CLI is available: run \`which gh\`.

**If gh is available:**
\`\`\`
gh pr create --fill
\`\`\`
Print the PR URL. Say: "PR opened. Merge happens on GitHub after review and CI."

**If gh is not available:**
Run \`git remote get-url origin\` to get the remote URL. Convert to a browser URL if needed.
Say: "Push done. Open a PR at: <remote-url>/compare/<feature-branch>"

Then go to Step 7 (do NOT delete the branch locally — it will be deleted after the PR merges remotely).

## Step 6: Update changelog.md (solo only)

1. Add an entry to the Done section of \`changelog.md\`:
   - \`- [YYYY-MM-DD] landed <feature-branch>\`
2. Clear the \`Active feature\` section of \`vibestate.md\`: set it to "None — on main, ready to start something."
3. Commit:
   \`\`\`
   git add changelog.md vibestate.md && git commit -m "update changelog: landed <feature-branch>"
   \`\`\`

## Step 7: Confirm

- **simple:** Say: "Done. Run \`/clear\` to reset context before starting your next feature, then \`/sail\` to continue."
- **detailed:** Say: "Feature docked. Run \`/clear\` to reset context before your next feature, then \`/sail\` to continue."
`;
}
