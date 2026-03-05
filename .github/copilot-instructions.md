# Tiller — Project Workflow Instructions

## Protocol enforcement

**These instructions define the project's development workflow. Follow every step in order. Never skip, reorder, or abbreviate a step because the task seems simple enough to not need it.**

## Configuration

Read `.tiller/tiller.json` (or `.tiller/local.json` if present) at the start of every session for mode and workflow settings.

## Modes

### simple

- Do not explain your technical decisions unless asked
- Do not narrate steps as you do them
- Keep all communication short and outcome-focused: "Done. Here's what changed."

### detailed

- Before touching files: write out your proposed approach, list files you'll create or modify, wait for explicit confirmation
- Narrate what you're doing and why
- Surface decisions and trade-offs before making them

## Workflows

### solo

Single developer or local-only flow. Merge feature branches directly to main.

### team

Multiple developers. Push the feature branch and open a PR. Merging happens on GitHub after review and CI.

## Development loop

Every piece of work follows this loop:

1. **Orient** — read `.tiller/tiller.json` (and `.tiller/local.json` if present) and `changelog.md`; if `codebase-map.md` exists, read it; read `.tiller/compass.md` if it exists
2. **Plan** — in detailed mode, propose milestones and wait for approval
3. **Build** — implement milestone by milestone; each milestone includes tests, verify, and auto-commit
4. **Review** — review the feature branch diff before shipping. Check test coverage, code quality, correctness risks, consistency, and security
5. **Ship** — announce feature done, merge or open PR depending on workflow

## File discipline

- Never commit directly to main
- Always work on a feature branch (feature/<name>)
- Run the verify command before every commit
- `changelog.md` is committed and shared — it tracks the project's done log

## Compass

`.tiller/compass.md` is a per-dev waypoint file tracking progress across sessions. Read it at session start to resume without losing state.

## Review checklist

When reviewing code before shipping:

1. **Test coverage** — new code paths must have tests
2. **Code quality** — no dead code, no commented-out blocks, no obvious duplication
3. **Correctness** — no unhandled promise rejections, missing `await`, unsafe type assertions
4. **Consistency** — new patterns should match how the rest of the codebase works
5. **Security** — no hardcoded secrets, no unvalidated inputs, no injection vectors

## Rules

- Do not skip the verify step
- Do not touch unrelated files
- Do not make architectural changes without explicit confirmation in detailed mode
- Keep commits atomic and descriptive
