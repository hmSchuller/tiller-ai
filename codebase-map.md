# Codebase Map

> Maintained by Cartographer. Updated at each /dock.

## Modules

### CLI Entry & Commands

**Path:** `src/index.ts`, `src/commands/`

Three CLI commands wired up via commander: `init` (interactive scaffold), `upgrade` (regenerate managed files into an existing project), and `config` (interactively change mode/workflow). `src/commands/init.ts` is the most important file — it drives the user-facing prompts via `@clack/prompts` and calls the scaffold orchestrator.

### Scaffold Orchestrator

**Path:** `src/scaffold/index.ts`, `src/scaffold/types.ts`, `src/scaffold/tiller-manifest.ts`

Writes all files into the target directory in a single `scaffold()` call, then handles git init and initial commit. `tiller-manifest.ts` defines `MANAGED_FILES` and `TILLER_VERSION` — the canonical list of what Tiller owns and is responsible for regenerating on upgrade. Start here when adding or removing any generated file.

### File Generators

**Path:** `src/scaffold/` (flat files), `src/scaffold/skills/`, `src/scaffold/hooks/`, `src/scaffold/agents/`

Each generator is a pure function that returns a string — the content of a file to be written into the scaffolded project. Skills (`sail`, `anchor`, `dock`, `recap`, `setup`, `tech-debt`) produce `.claude/skills/*/SKILL.md`. Hooks (`post-write`, `secret-scan`, `session-resume`) produce `.claude/hooks/*.sh`. Agents (`quartermaster`, `bosun`, `captain`, `cartographer`) produce `.claude/agents/*.md`. The cartographer agent generator produces instructions for a concern-level map (3–7 module sections grouped by concern, not by file) with a Shipped Features list sourced from `changelog.md`. `claude-md.ts`, `changelog.ts`, `gitignore.ts`, `settings-json.ts`, and `tech-backlog.ts` cover the remaining generated files.

### Utilities

**Path:** `src/utils/`

Thin wrappers over Node built-ins. `fs.ts` provides `writeFile` (with auto-mkdir) used by the scaffold orchestrator. `git.ts` wraps `isGitRepo`, `gitInit`, `gitAdd`, and `gitCommit` for the post-scaffold commit. These two files are the only place I/O primitives should be imported directly.

### Test Suite

**Path:** `test/`

Vitest unit and integration tests. Unit tests cover individual generators; integration tests scaffold into a temp directory and assert the resulting file tree and content. Run with `npm test`. The `scripts/regen-skills.ts` helper regenerates skill fixtures used in tests.

### Promotional Website

**Path:** `website/`

Static Astro site deployed to GitHub Pages. Nautical theme with navy/teal/gold palette. Not part of the npm package — exists purely for project marketing. Edit `website/src/` for content changes; the GitHub Actions pipeline handles deployment.

## Shipped Features

- `feature/cartographer-coarser-map` — cartographer produces concern-level map (3–7 module sections by concern) with a Shipped Features list from changelog
- `feature/fix-sail-execution-rules` — Quartermaster added to embedded sail execution rules; tech debt counter fixed to count docked entries
- `feature/remove-compass` — remove compass.md — redundant local state file replaced by git branch + git log
- `feature/upgrade-remove-stale-managed-files` — upgrade removes stale managed files from disk when tiller drops them between versions
- `feature/update-readme-to-match-current-feature-set` — update README to match current feature set — agents section, file tree, vibe loop step 4, CLI flags
- `feature/add-repository-homepage-bugs-to-package-json` — add repository, homepage, bugs fields to package.json for npm listing
- `feature/bump-version-to-0-2-0` — bump version to 0.2.0
- `feature/ships-crew-agents` — add quartermaster, bosun, captain, and cartographer agents + tech-backlog.md
- `feature/upgrade-without-interactive-prompt` — add --yes/-y non-interactive flag to init and upgrade commands
- `feature/bump-version-to-0-1-4` — bump version to 0.1.4
- `feature/remove-config-from-root-claude-md` — slim root CLAUDE.md to name+desc only; config reads from .tiller.json
- `feature/rename-skill-land-to-dock` — rename /land → /dock across source, skills, README, website
- `feature/fix-land-team-workflow-double-ci-push` — commit changelog before push in team workflow to prevent double CI run
- `feature/update-readme-sync-feature-set` — add agent team support to README intro, skills table, and Features card
- `feature/rename-vibe-to-sail-save-to-anchor` — rename /vibe → /sail and /save → /anchor across all source, generators, and tests
- `feature/can-tiller-spawn-agent-teams` — team-aware sail skill with dependency tags, TeamCreate/TaskCreate/SendMessage, and sequential fallback
- `feature/bump-version-to-0-1-3` — bump version to 0.1.3
- `feature/fix-gitignore-preservation` — preserve existing .gitignore on init; append tiller entries only if missing
- `feature/bump-version-to-0-1-2` — bump version to 0.1.2
- `feature/bump-version-to-0-1-1` — import TILLER_VERSION from single source; update package.json, index.ts, and tests
- `feature/command-config-interactive-select` — replace mode/workflow commands with unified tiller config interactive select UI
- `feature/fix-nodejs-version-requirement` — fix website Node.js version requirement: 18+ → 22+
- `feature/evaluate-if-snapshot-and-recap-are-good-names` — rename /snapshot → /save
- `feature/create-static-promotional-website-for-github-pages` — static Astro promotional website with GitHub Actions deploy pipeline
- `feature/rename-package-to-tiller-ai` — rename package from tiller-code to tiller-ai
- `feature/vibe-resume-existing-branch` — vibe skill resumes existing feature branches instead of recreating them
- `feature/vibe-resume-ask-user` — ask user to continue or revisit plan when resuming an existing branch
- `feature/state-current-mode-before-vibe` — state current mode before vibing a new feature
- `feature/multi-dev-support` — multi-dev support: workflow config, changelog split, unified skills, team PR flow, per-dev mode
- `feature/add-workflow-command` — add tiller workflow command (solo/team, local + --project scope)
- `feature/tech-debt-skill` — tech debt skill: background agent every 3 features, guardrails, stash/restore, mode-aware reporting
- `feature/sync-readme` — rewrite README to reflect actual feature set
- `feature/add-npm-keywords` — expand npm keywords for better discoverability
