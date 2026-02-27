# tiller-code

Scaffold Claude Code projects with a structured vibe loop — branch, build, commit, land.

## What is this?

Tiller is a thin scaffold for Claude Code that turns a blank repo into a project Claude knows how to navigate. It installs a set of slash commands (skills), two `CLAUDE.md` files (one user-facing, one Tiller-managed), hooks for formatting and secret scanning, and shared tracking files. Once scaffolded, you describe work with `/vibe`, save checkpoints with `/snapshot`, and ship with `/land` — and Claude follows the loop without you having to re-explain your workflow every session.

## Quick start

```bash
# 1. Scaffold a new project
npx tiller-code init

# 2. Open in Claude Code and run setup
/setup

# 3. Start working
/vibe add a login page
```

## Skills

| Command | What it does |
|---|---|
| `/setup` | First-run: understand the project and fill in `CLAUDE.md` |
| `/vibe [idea]` | Start or continue work on something |
| `/snapshot` | Commit current progress on the feature branch |
| `/land` | Merge completed feature to main (solo) or open a PR (team) |
| `/recap` | Read-only status — active feature, notes |

## Modes

Tiller has two modes that control how Claude communicates:

**`simple`** — for non-technical users. Claude builds without narrating steps, surfaces only blockers, and keeps responses short and outcome-focused.

**`detailed`** — for technical users. Claude proposes an approach and waits for confirmation before touching files, narrates decisions, and surfaces trade-offs.

Switch modes at any time:

```bash
npx tiller-code mode simple
npx tiller-code mode detailed
```

Use `--project` to update the shared project default instead of your personal override:

```bash
npx tiller-code mode detailed --project
```

Or just update the `Mode:` line in your root `CLAUDE.md`.

## Workflows

Tiller supports two workflows that affect how `/land` behaves:

**`solo`** — single developer. `/land` merges the feature branch into main locally and deletes the branch.

**`team`** — multiple developers. `/land` pushes the branch and opens a PR (via `gh` CLI if available, otherwise prints the URL). The branch is not deleted locally.

The workflow is set during `init` and stored in `.claude/.tiller.json`. Each developer can override it locally in `.tiller.local.json` (gitignored).

## What gets scaffolded

```
your-project/
├── CLAUDE.md                              # User-facing: project context, verify command, mode, workflow
├── .gitignore                             # Ignores vibestate.md, .tiller.local.json, common build artifacts
├── changelog.md                           # Shared done log — updated by /land on each merge
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
│       ├── vibe/SKILL.md                  # /vibe skill
│       ├── snapshot/SKILL.md              # /snapshot skill
│       ├── land/SKILL.md                  # /land skill
│       └── recap/SKILL.md                 # /recap skill
```

**Per-dev local overrides** — `.tiller.local.json` (gitignored, not scaffolded) lets individual developers override `mode` and `workflow` without touching shared files.

## The vibe loop

Every piece of work follows this loop:

1. **Orient** — Claude reads `CLAUDE.md` and `vibestate.md` to understand project state and pick up any in-progress work
2. **Confirm** — in `detailed` mode, Claude writes out the proposed approach and waits for a go-ahead before touching files
3. **Build** — Claude implements, runs the verify command after each chunk, and fixes failures before moving on
4. **Save** — Claude reminds you to `/snapshot` when stable and `/land` when the feature is done

`vibestate.md` tracks the active branch, milestone checklist, and session notes. `changelog.md` is the shared done log — updated by `/land` whenever a feature merges, so team members can see what's been shipped.

## CLI reference

### `npx tiller-code init`

Scaffold a new project interactively. Prompts for project name, description, run/verify command, mode, and workflow. Writes all files and makes an initial git commit.

```bash
npx tiller-code init
```

### `npx tiller-code upgrade`

Update Tiller-managed files (`.claude/CLAUDE.md`, `settings.json`, hooks, skills) to the latest version without touching your `CLAUDE.md`, `vibestate.md`, or `changelog.md`.

```bash
npx tiller-code upgrade
```

### `npx tiller-code mode <mode>`

Switch the project mode between `simple` and `detailed`. Without `--project`, writes to `.tiller.local.json` (your personal override). With `--project`, updates the shared `CLAUDE.md`.

```bash
npx tiller-code mode simple
npx tiller-code mode detailed
npx tiller-code mode detailed --project   # update shared project default
```

## Requirements

- Node 22+
- [Claude Code](https://claude.ai/code)
- git

## License

MIT
