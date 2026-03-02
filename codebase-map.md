# Codebase Map

> Maintained by Cartographer. Updated at each /dock.

## Modules

### CLI Entry & Commands

**Path:** `src/index.ts`, `src/commands/`

Three CLI commands wired up via commander: `init` (interactive scaffold), `upgrade` (regenerate managed files into an existing project), and `config` (interactively change mode/workflow). `src/commands/init.ts` is the most important file — it drives the user-facing prompts via `@clack/prompts` and calls the scaffold orchestrator.

### Scaffold Orchestrator

**Path:** `src/scaffold/index.ts`, `src/scaffold/types.ts`, `src/scaffold/tiller-manifest.ts`

Writes all files into the target directory in a single `scaffold()` call, then handles git init and initial commit. `tiller-manifest.ts` defines `MANAGED_FILES` and `TILLER_VERSION` — the canonical list of what Tiller owns and is responsible for regenerating on upgrade. As of `feature/tiller-md-instead-of-claude-md-ownership`, `MANAGED_FILES` lists `.claude/TILLER.md` (not `.claude/CLAUDE.md`); the upgrade command guards against deleting user-owned files. Start here when adding or removing any generated file.

### File Generators

**Path:** `src/scaffold/` (flat files), `src/scaffold/skills/`, `src/scaffold/hooks/`, `src/scaffold/agents/`

Each generator is a pure function that returns a string — the content of a file to be written into the scaffolded project. Skills (`sail`, `anchor`, `dock`, `recap`, `setup`, `scout`, `tech-debt`) produce `.claude/skills/*/SKILL.md`. The sail skill is the most complex: its Step 2 branch routing selects a `fix/` or `feature/` prefix based on keywords in `$ARGUMENTS`, then handles four chaining cases (related → stay, unrelated → new branch, uncertain → ask, no-args → continue or list). Step 2.7 runs a requirements interview before planning — it gathers scope, behavior, edge cases, and acceptance criteria via a mix of structured and freeform questions, with additional technical topics in detailed mode; the interview is skipped when continuing existing work or when the user opts out. Its Step 3 plan block embeds the full Quartermaster→Captain PASS/FAIL/ESCALATE review protocol inline so the plan is self-contained after a context clear. Hooks (`post-write`, `secret-scan`, `session-resume`) produce `.claude/hooks/*.sh`. Agents (`quartermaster`, `bosun`, `captain`, `cartographer`) produce `.claude/agents/*.md` with native Claude Code frontmatter (`name`, `description`, `model`, `tools`) and spawn via `subagent_type` rather than custom Task wiring. The cartographer agent maintains only the Modules section of `codebase-map.md`; shipped feature history is tracked exclusively in `changelog.md`. `claude-md.ts` covers the two CLAUDE.md-family files: `generateUserClaudeMd()` produces the user-owned `.claude/CLAUDE.md` (a single import line pointing at TILLER.md), and `generateTillerMd()` (formerly `generateDotClaudeMd`) produces the Tiller-managed `.claude/TILLER.md` that holds all vibe-loop rules. This split means upgrades regenerate only `TILLER.md` and never clobber user edits in `CLAUDE.md`. `changelog.ts`, `gitignore.ts`, `settings-json.ts`, and `tech-backlog.ts` cover the remaining generated files.

### Utilities

**Path:** `src/utils/`

Thin wrappers over Node built-ins. `fs.ts` provides `writeFile` (with auto-mkdir) used by the scaffold orchestrator. `git.ts` wraps `isGitRepo`, `gitInit`, `gitAdd`, and `gitCommit` for the post-scaffold commit. These two files are the only place I/O primitives should be imported directly.

### Test Suite

**Path:** `test/`

Vitest unit and integration tests. Unit tests cover individual generators; integration tests scaffold into a temp directory and assert the resulting file tree and content. Run with `npm test`. The `scripts/regen-skills.ts` helper regenerates skill fixtures used in tests.

### Promotional Website

**Path:** `website/`

Static Astro site deployed to GitHub Pages. Nautical theme with navy/teal/gold palette. Not part of the npm package — exists purely for project marketing. The landing page is assembled from section components in `website/src/components/` (Hero, Problem, Features, HowItWorks, GettingStarted, Footer). Edit those components for content changes; the GitHub Actions pipeline handles deployment.

