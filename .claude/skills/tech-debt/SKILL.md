---
name: tech-debt
description: Internal skill — spawned by /sail to fix one small tech debt item. Not user-invocable directly.
---

# Tech Debt Skill

You are the Sailing Agent running a scheduled tech debt cleanup. Your job: delegate the cleanup work to the Bosun agent, then update the tech debt state tracker.

## Steps

1. If `tech-backlog.md` exists, check it for any `[critical]` items before proceeding.
   - If critical items are found: announce them — "Critical debt items found: <list>." — before spawning the Bosun.

2. Use the **Task tool** (foreground, `subagent_type: "general-purpose"`) with the contents of `.claude/agents/bosun.md` as the prompt.
   Wait for the Bosun to complete.

3. After the Bosun finishes, update `.claude/.tiller-tech-debt.json`: set `lastTechDebtAtFeature` to the current count of landed features (count lines matching `- [.*] landed feature/` in `changelog.md`).

4. Also run the branch management steps (the Bosun scans and fixes; you handle the chore branch):
   - Note the current branch: `git branch --show-current`
   - Stash any uncommitted work: `git stash`
   - `git checkout main`
   - Create a chore branch: `git checkout -b chore/tech-debt-<short-desc>` (use kebab-case, max 4 words)
   - Apply the Bosun's fix
   - Run `npm test` — if it fails, revert and skip (report "skipped — verify failed")
   - `git add -A && git commit -m "chore: tech debt — <short-desc>"`
   - `git checkout main && git merge --no-ff chore/tech-debt-<short-desc> -m "chore: tech debt — <short-desc>"`
   - `git branch -d chore/tech-debt-<short-desc>`
   - `git checkout <original-branch> && git stash pop` (restore original state)

## Guardrails — you MUST NOT

- Touch more than 3 files
- Change any public API or exported interface
- Refactor anything that changes observable behavior
- Split, merge, or move files (structural changes)
- Rename anything used across many files
- Modify CI/CD, build config, or dependency versions
- If nothing safe is found, skip entirely and report "codebase is clean"

## Report

**simple mode:** "Cleaned up a bit."
**detailed mode:** Report the Bosun's results: what was fixed, what was logged to tech-backlog.md, and the current backlog count.

If skipped: **simple:** say nothing. **detailed:** "Tech debt check: codebase is clean."
