# tiller-ai

Scaffold Claude Code projects with a structured vibe loop — branch, build, commit, dock.

## What is this?

Tiller is a thin scaffold for Claude Code that turns a blank repo into a project Claude knows how to navigate. It installs a set of slash commands (skills), two `CLAUDE.md` files (one user-facing, one Tiller-managed), hooks for formatting and secret scanning, and shared tracking files. Once scaffolded, you describe work with `/sail`, anchor checkpoints with `/anchor`, and ship with `/dock` — and Claude follows the loop without you having to re-explain your workflow every session. When milestones are independent, `/sail` spawns parallel agent workers to build them simultaneously.

## Quick start

```bash
# 1. Scaffold a new project
npx tiller-ai init

# 2. Open in Claude Code and run setup
/setup

# 3. Start working
/sail add a login page
```

## Skills

| Command | What it does |
|---|---|
| `/setup` | First-run: understand the project and fill in `CLAUDE.md` |
| `/sail [idea]` | Start or continue work; parallelizes independent milestones using agent teams |
| `/anchor` | Anchor current progress on the feature branch |
| `/dock` | Merge completed feature to main (solo) or open a PR (team) |
| `/recap` | Read-only status — active feature, notes |

## Modes

Tiller has two modes that control how Claude communicates:

**`simple`** — for non-technical users. Claude builds without narrating steps, surfaces only blockers, and keeps responses short and outcome-focused.

**`detailed`** — for technical users. Claude proposes an approach and waits for confirmation before touching files, narrates decisions, and surfaces trade-offs.

Switch modes at any time with the interactive config command:

```bash
npx tiller-ai config
```

Or update the `Mode:` line in your root `CLAUDE.md` directly.

## Workflows

Tiller supports two workflows that affect how `/dock` behaves:

**`solo`** — single developer. `/dock` merges the feature branch into main locally and deletes the branch.

**`team`** — multiple developers. `/dock` pushes the branch and opens a PR (via `gh` CLI if available, otherwise prints the URL). The branch is not deleted locally.

The workflow is set during `init` and stored in `.claude/.tiller.json`. Each developer can override it locally in `.tiller.local.json` (gitignored).

## What gets scaffolded

```
your-project/
├── CLAUDE.md                              # User-facing: project context, verify command, mode, workflow
├── .gitignore                             # Ignores vibestate.md, .tiller.local.json, common build artifacts
├── changelog.md                           # Shared done log — updated by /dock on each merge
├── vibestate.md                           # Per-dev: active feature, milestone checklist, notes (gitignored)
├── .claude/
│   ├── CLAUDE.md                          # Tiller-managed: vibe loop rules, skill docs
│   ├── settings.json                      # Hook registrations (PostToolUse, PreToolUse, UserPromptSubmit)
│   ├── .tiller.json                       # Manifest: version, mode, workflow, runCommand, managedFiles
│   ├── hooks/
│   │   ├── post-write.sh                  # PostToolUse: run formatter after file writes
│   │   ├── secret-scan.sh                 # PreToolUse: block writes containing secrets
│   │   └── session-resume.sh              # UserPromptSubmit: orient Claude at session start
│   └── skills/
│       ├── setup/SKILL.md                 # /setup skill
│       ├── sail/SKILL.md                  # /sail skill
│       ├── anchor/SKILL.md                # /anchor skill
│       ├── dock/SKILL.md                  # /dock skill
│       ├── recap/SKILL.md                 # /recap skill
│       └── tech-debt/SKILL.md             # internal: auto-run by /sail every 3 features
```

**Per-dev local overrides** — `.tiller.local.json` (gitignored, not scaffolded) lets individual developers override `mode` and `workflow` without touching shared files.

## The vibe loop

Every piece of work follows this loop:

1. **Orient** — Claude reads `CLAUDE.md` and `vibestate.md` to understand project state and pick up any in-progress work
2. **Confirm** — in `detailed` mode, Claude writes out the proposed approach and waits for a go-ahead before touching files
3. **Build** — Claude implements milestone by milestone, running the verify command after each. Independent milestones are parallelized using agent teams.
4. **Anchor** — Claude reminds you to `/anchor` when stable and `/dock` when the feature is done

`vibestate.md` tracks the active branch, milestone checklist, and session notes. `changelog.md` is the shared done log — updated by `/dock` whenever a feature merges, so team members can see what's been shipped.

## CLI reference

### `npx tiller-ai init`

Scaffold a new project interactively. Prompts for project name, description, run/verify command, mode, and workflow. Writes all files and makes an initial git commit.

```bash
npx tiller-ai init
```

### `npx tiller-ai upgrade`

Update Tiller-managed files (`.claude/CLAUDE.md`, `settings.json`, hooks, skills) to the latest version without touching your `CLAUDE.md`, `vibestate.md`, or `changelog.md`.

```bash
npx tiller-ai upgrade
```

### `npx tiller-ai config`

Interactively update mode and workflow. Prompts for mode (`simple`/`detailed`), workflow (`solo`/`team`), and scope (`local` writes to `.tiller.local.json`, `project` updates the shared `CLAUDE.md` and `.tiller.json`).

```bash
npx tiller-ai config
```

## Requirements

- Node 22+
- [Claude Code](https://claude.ai/code)
- git

## License

MIT
