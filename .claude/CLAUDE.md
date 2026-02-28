# Tiller — How to work

> These rules are managed by Tiller. Do not edit manually.

## Modes

The mode is set in `.claude/.tiller.json` (or overridden locally in `.tiller.local.json`). Read it at the start of every session.

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

## Workflows

The workflow is set in `.claude/.tiller.json` (or overridden locally in `.tiller.local.json`).

### solo

Single developer or local-only flow. /dock merges directly to main.

### team

Multiple developers. /dock pushes the feature branch and opens a PR. Merging happens on GitHub/GitLab after review and CI.

## Vibe loop

Every piece of work follows this loop:

1. **Orient** — read `.claude/.tiller.json` (and `.tiller.local.json` if present), compass.md (local), and changelog.md (shared)
2. **Confirm** — in detailed mode, enter plan mode with milestones and wait for approval
3. **Build** — implement milestone by milestone; milestones tagged `[independent]` may be parallelized using agent teams (TeamCreate + Task tool); each milestone includes tests, verify, and auto-commit
4. **Complete** — announce feature done, suggest /dock

## File discipline

- Never commit directly to main
- Always work on a feature branch (feature/<name>)
- Run the verify command before every anchor and dock
- `compass.md` is gitignored — it tracks your local active feature state
- `changelog.md` is committed and shared — it tracks the project's done log

## Per-dev overrides

Create `.tiller.local.json` (gitignored) to override mode or workflow personally:
```json
{ "mode": "simple", "workflow": "solo" }
```
Skills read `.tiller.local.json` first, then fall back to `.claude/.tiller.json`.

## Skills

- **/setup** — first-run: understand the project and configure CLAUDE.md
- **/sail** [idea] — milestone-driven development: plan, build, test, auto-commit. Independent milestones are parallelized using agent teams. Every 3 landed features, automatically runs a tech debt cleanup before planning.
- **/anchor** — commit current progress on the feature branch
- **/dock** — merge or PR depending on workflow
- **/recap** — read-only status of all work

## Agents

Tiller provides three specialist agents in `.claude/agents/`. They are spawned by skills via the Task tool — not invoked directly.

- **quartermaster** — independent code reviewer. Spawned at end of sail (Step 4.5) to review the feature branch diff. Returns PASS or FAIL. Negotiates one round; escalates to Captain on impasse. Requires `model: "opus"`.
- **bosun** — tech debt maintenance. Scans the codebase, logs issues to `tech-backlog.md` by severity, fixes one small item per run. Alerts on critical items.
- **captain** — arbitration. Only activated when Quartermaster and Sailing Agent reach impasse. Issues one of three rulings: AGREE WITH QUARTERMASTER, AGREE WITH SAILING AGENT, or COMPROMISE. Requires `model: "opus"`.

## Rules

- Do not skip the verify step
- Do not touch unrelated files
- Do not make architectural changes without explicit confirmation in detailed mode
- Keep commits atomic and descriptive
