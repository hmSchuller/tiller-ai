---
name: vibe
description: Start or continue working on an idea. Usage: /vibe [idea description]
---

# /vibe — Start or continue work

## Step 1: Orient

Read `CLAUDE.md` and `vibestate.md`. Run `git branch` and `git status`. Do not narrate this.

## Step 2: Branch routing

**$ARGUMENTS provided** → create `feature/<kebab-case-of-arguments>` from main (or switch if it exists). Say: "On it."

**Already on a feature branch** → continue. Say nothing unless asked.

**Neither** → list open feature branches briefly, ask what to work on.

## Step 3: Build

Just build. No plan narration, no step-by-step commentary.

After each chunk: run ``. Fix failures silently before continuing.

When done with a chunk, say what changed in one sentence. Then:
- "Type /snapshot to save, /land when you're done."

## If something goes wrong

Fix it yourself first. Only tell the user if you genuinely can't resolve it.
