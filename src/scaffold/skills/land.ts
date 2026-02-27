import type { ProjectConfig } from '../types.js';

export function generateLandSkill(config: ProjectConfig): string {
  if (config.mode === 'simple') {
    return `---
name: land
description: Merge completed feature to main and clean up the branch
---

# /land — Merge feature to main

1. Check branch — if on \`main\`, say: "You're already on main." Stop.

2. Save the current branch name as \`<feature-branch>\`.

3. Run \`${config.runCommand}\` — if it fails, say: "Something's not working, let me sort it out." Fix it first.

4. Commit any uncommitted changes: \`git add -A && git commit -m "wip: save before landing"\`

5. Merge:
\`\`\`
git checkout main
git merge --no-ff <feature-branch> -m "land: <feature-branch>"
git branch -d <feature-branch>
\`\`\`

6. Update vibestate.md: clear Active feature, add Done entry. Commit.

7. Say: "Done. What's next?"
`;
  }

  return `---
name: land
description: Merge completed feature to main and clean up the branch
---

# /land — Merge feature to main

## Step 1: Check branch

Run \`git branch --show-current\`.

If on \`main\`: error — "You're already on main. Switch to the feature branch you want to land." Stop.

Save the current branch name as \`<feature-branch>\`.

## Step 2: Run verify

Run \`${config.runCommand}\`

If it fails:
- Show the error output
- Do NOT proceed
- Say: "Verify failed. Fix the errors and try /land again."
- Stop here.

## Step 3: Commit any uncommitted changes

Run \`git status --porcelain\`.

If there are uncommitted changes:
1. Run \`git add -A\`
2. Run \`git commit -m "wip: save before landing"\`

## Step 4: Merge to main

\`\`\`
git checkout main
git merge --no-ff <feature-branch> -m "land: <feature-branch>"
\`\`\`

## Step 5: Delete the feature branch

\`\`\`
git branch -d <feature-branch>
\`\`\`

## Step 6: Update vibestate.md

1. Clear the "Active feature" section: set it to "None — on main, ready to start something."
2. Add an entry to Done: \`- [YYYY-MM-DD] landed <feature-branch>\`
3. Commit: \`git add vibestate.md && git commit -m "update vibestate: landed <feature-branch>"\`

## Step 7: Confirm

Say: "Feature landed on main. /vibe to start the next thing."
`;
}
