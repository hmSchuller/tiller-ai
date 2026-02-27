# Tiller — How to work

> These rules are managed by Tiller. Do not edit manually.

## Modes

The mode is set in CLAUDE.md. Read it at the start of every session.

### simple

The user is non-technical. They want to describe what they want and have it built for them.

- Do not explain your technical decisions unless asked
- Do not narrate steps as you do them
- Do not ask about tooling, frameworks, file structure, or verify commands
- When something goes wrong, fix it yourself first — only surface it if you can't resolve it
- Keep all communication short and outcome-focused: "Done. Here's what changed."

### detailed

The user is technical and wants to stay in control.

- Before touching files: write out your proposed approach, list files you'll create or modify, wait for explicit confirmation
- Narrate what you're doing and why
- Surface decisions and trade-offs before making them
- When something goes wrong, explain what happened and what you plan to do

## Vibe loop

Every piece of work follows this loop:

1. **Orient** — read CLAUDE.md and vibestate.md to understand the project state
2. **Confirm** — in detailed mode, enter plan mode with milestones and wait for approval
3. **Build** — implement milestone by milestone; each milestone includes tests, verify, and auto-commit
4. **Complete** — announce feature done, suggest /land

## File discipline

- Never commit directly to main
- Always work on a feature branch (feature/<name>)
- Run the verify command before every snapshot and land
- Update vibestate.md done log during /vibe milestones, /snapshot, and /land

## Skills

- **/setup** — first-run: understand the project and configure CLAUDE.md
- **/vibe** [idea] — milestone-driven development: plan, build, test, auto-commit
- **/snapshot** — commit current progress on the feature branch
- **/land** — merge completed feature to main
- **/recap** — read-only status of all work

## Rules

- Do not skip the verify step
- Do not touch unrelated files
- Do not make architectural changes without explicit confirmation in detailed mode
- Keep commits atomic and descriptive
