# Codebase Map

> Maintained by Cartographer. Updated at each /dock.

### CLI Entry Point

**Path:** `src/index.ts`

Defines the `tiller` CLI using commander with three commands: `init`, `upgrade`, and `config`. This is the binary entry point built by tsup into `dist/index.js`.

### Init Command

**Path:** `src/commands/init.ts`

Handles `tiller init` — prompts the user for mode (simple/detailed) and workflow (solo/team) via `@clack/prompts`, then delegates to the scaffold orchestrator to write all Tiller files into the current directory.

### Upgrade Command

**Path:** `src/commands/upgrade.ts`

Handles `tiller upgrade` — reads the existing `.claude/.tiller.json` manifest, removes stale managed files from prior versions, and overwrites all managed Tiller files (hooks, skills, agents) with their current generated versions.

### Config Command

**Path:** `src/commands/config.ts`

Handles `tiller config` — interactively updates mode and workflow settings either project-wide (writes to `.claude/.tiller.json`) or locally per-developer (writes to `.tiller.local.json`).

### Scaffold Orchestrator

**Path:** `src/scaffold/index.ts`

Top-level function that writes every Tiller file into a target directory: `.gitignore`, `changelog.md`, `.claude/` configs, hooks, skills, agents, and tracking files. Also runs `git init` and makes the initial commit if the directory is not already a git repo.

### Project Config Type

**Path:** `src/scaffold/types.ts`

Single shared TypeScript interface `ProjectConfig` (`projectName`, `description`, `runCommand`, `mode`, `workflow`) passed through all scaffold generators.

### Tiller Manifest Generator

**Path:** `src/scaffold/tiller-manifest.ts`

Generates `.claude/.tiller.json` — the Tiller version manifest. Also exports `MANAGED_FILES` (the canonical list of files owned by Tiller) and `TILLER_VERSION`. Used by both scaffold and upgrade.

### CLAUDE.md Generators

**Path:** `src/scaffold/claude-md.ts`

Generates `.claude/CLAUDE.md` — the Tiller-managed rules file injected into every Claude session. Contains mode definitions, workflow rules, the vibe loop, skill references, and agent descriptions.

### Settings Generator

**Path:** `src/scaffold/settings-json.ts`

Generates `.claude/settings.json` — Claude Code's hook configuration. Wires up `post-write.sh` as a PostToolUse hook, `secret-scan.sh` as a PreToolUse hook, and `session-resume.sh` as a SessionStart hook.

### Hooks Generators

**Path:** `src/scaffold/hooks/`

Three hook generators:
- `post-write.ts` — generates a shell script that runs a formatter after file edits.
- `secret-scan.ts` — generates a shell script that scans for secrets before Bash commands; returns a `permissionDecision: deny` if secrets are detected.
- `session-resume.ts` — generates a shell script that detects an active feature branch on session start and reminds the user to run `/sail`.

### Skills Generators

**Path:** `src/scaffold/skills/`

Six skill generators (`sail.ts`, `anchor.ts`, `dock.ts`, `recap.ts`, `setup.ts`, `tech-debt.ts`). Each produces the `SKILL.md` file that Claude Code loads when the user runs the corresponding slash command (e.g. `/sail`, `/dock`). Output is mode- and workflow-aware.

### Agent Generators

**Path:** `src/scaffold/agents/`

Four agent generators (`quartermaster.ts`, `bosun.ts`, `captain.ts`, `cartographer.ts`). Each produces the `.claude/agents/<name>.md` file that defines a specialist sub-agent spawned during the vibe loop (code review, tech debt, arbitration, and codebase mapping respectively).

### Changelog Generator

**Path:** `src/scaffold/changelog.ts`

Generates the initial `changelog.md` stub written into scaffolded projects. The file is subsequently maintained by Claude during `/sail` and `/dock`.

### Tech Backlog Generator

**Path:** `src/scaffold/tech-backlog.ts`

Generates the initial `tech-backlog.md` stub. The file is maintained by the Bosun agent as it discovers and fixes tech debt across sessions.

### Tech Debt State Generator

**Path:** `src/scaffold/tech-debt-state.ts`

Generates `.claude/.tiller-tech-debt.json` — a small JSON file tracking how many features have landed since the last tech debt pass, used by `/sail` to auto-trigger the Bosun every three features.

### Gitignore Generator

**Path:** `src/scaffold/gitignore.ts`

Generates a default `.gitignore` and exports `TILLER_GITIGNORE_ENTRIES` (currently just `.tiller.local.json`). The scaffold orchestrator appends only missing entries when an existing `.gitignore` is present.

### Filesystem Utilities

**Path:** `src/utils/fs.ts`

Thin wrapper around Node `fs/promises` — provides `writeFile` (creates parent directories automatically) and `ensureDir`.

### Git Utilities

**Path:** `src/utils/git.ts`

Thin wrapper around `execSync` for `git init`, `git add`, and `git commit`. Used by the scaffold orchestrator after writing files.

### Skill Regeneration Script

**Path:** `scripts/regen-skills.ts`

Developer utility script that re-renders all skills and the cartographer agent from source generators into the live `.claude/` directory of this repo. Reads config from `.claude/.tiller.json` and `.tiller.local.json`.

### Tests

**Path:** `test/`

Vitest test suite with unit tests for each generator category (skills, agents, claude-md, settings-json) and an integration test that runs the full scaffold into a temporary directory and validates the output files.
