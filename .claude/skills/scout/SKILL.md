---
name: scout
description: Investigate a feature or area and produce a structured ticket. Usage: /scout [feature or area to investigate]
---

# /scout — Pre-work investigation

## Step 1: Orient

Read `.claude/.tiller.json` (and `.tiller.local.json` if it exists) and `changelog.md` to understand current state.
If `codebase-map.md` exists, read it to get a structural overview of the codebase.
Run `git branch` and `git status`.

State the current mode from `.claude/.tiller.json` (or `.tiller.local.json` if it overrides): "Mode: <mode>".

**If mode is simple:** Do not narrate the orient step.
**If mode is detailed:** Summarize the current state in 2-3 sentences.

## Step 2: Scope

Parse `$ARGUMENTS` to understand what feature, bugfix, or area to investigate.

**If $ARGUMENTS is empty:** Ask the user what they want to investigate before continuing.

**If mode is simple:** Acknowledge the investigation target briefly.
**If mode is detailed:** State: "Investigating: <topic>"

## Step 3: Explore

Use the **Explore agent** (`subagent_type: "Explore"`, thoroughness: `"very thorough"`) to investigate the relevant parts of the codebase. Provide a prompt that asks the agent to:
- Find all files, functions, and patterns relevant to the investigation topic
- Identify entry points, data flows, and key abstractions
- Note any existing tests, related utilities, or similar patterns already in the codebase
- Flag anything that might be affected by changes in this area

Wait for the Explore agent to complete, then read the key files it identifies.

## Step 4: Ask questions

Ask the user clarifying questions using the `AskUserQuestion` tool. Incorporate their answers into the ticket.

**Both modes** ask product/behavior questions, for example:
- "Should this feature support X edge case?"
- "What should happen when Y condition occurs?"
- "Is there a specific user flow we should prioritize?"

**Detailed mode** also asks technical questions, for example:
- "Should we extend the existing pattern or introduce a new abstraction?"
- "Any preference on where this lives in the codebase?"
- "Are there performance constraints we should account for?"

Group questions logically — don't ask more than 4 at once. If answers raise follow-up questions, ask them before drafting the ticket.

## Step 5: Draft ticket

Produce a structured ticket with the following sections:

### Summary
What needs to be done — 1–2 sentences.

### Relevant code
Files, functions, and patterns discovered during exploration. Include file paths and line references where helpful.

### Suggested approach
Proposed milestones or implementation strategy. Tag each milestone as `[independent]` or `[depends-on: N]` to indicate parallelizability.

### Open questions
Any remaining unresolved decisions after the Q&A in Step 4.

### Scope estimate
One of: **small** (< 1 day) / **medium** (1–3 days) / **large** (> 3 days)

## Step 6: Review & publish

1. Show the draft ticket to the user. Ask: "Does this look right, or would you like to adjust anything before publishing?"
2. Wait for the user's response. Apply any adjustments.
3. Check if `gh` CLI is available: run `which gh`

**If gh is available:**
- Create a GitHub Issue: `gh issue create --title "<title>" --body "<ticket body>"`
- Show the issue URL

**If gh is not available:**
- Output the full ticket formatted for copy-paste

**simple:** "Ticket ready: <url or copy-paste block>"
**detailed:** "Created issue #N: <url>" with a brief recap of what was explored.
