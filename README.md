# tiller-code

Scaffold Claude Code projects with a structured vibe loop — branch, build, commit, land.

## What is this?

Tiller is a thin scaffold for Claude Code that turns a blank repo into a project Claude knows how to navigate. It installs a set of slash commands (skills), two `CLAUDE.md` files (one user-facing, one Tiller-managed), and git hooks for formatting and secret scanning. Once scaffolded, you describe work with `/vibe`, save checkpoints with `/snapshot`, and ship with `/land` — and Claude follows the loop without you having to re-explain your workflow every session.

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
| `/land` | Merge completed feature to main |
| `/recap` | Read-only status — active feature, done log, notes |

## Modes

Tiller has two modes that control how Claude communicates:

**`simple`** — for non-technical users. Claude builds without narrating steps, surfaces only blockers, and keeps responses short and outcome-focused.

**`detailed`** — for technical users. Claude proposes an approach and waits for confirmation before touching files, narrates decisions, and surfaces trade-offs.

Switch modes at any time:

```bash
npx tiller-code mode simple
npx tiller-code mode detailed
```

Or just update the `Mode:` line in your root `CLAUDE.md`.

## What gets scaffolded

```
your-project/
├── CLAUDE.md                        # User-facing: project context, verify command, mode
├── vibestate.md                     # Active feature, milestone checklist, done log
├── .claude/
│   ├── CLAUDE.md                    # Tiller-managed: vibe loop rules, skill docs
│   ├── .tiller.json                 # Manifest: version, mode, runCommand, managedFiles
│   └── commands/
│       ├── setup.md                 # /setup skill
│       ├── vibe.md                  # /vibe skill
│       ├── snapshot.md              # /snapshot skill
│       ├── land.md                  # /land skill
│       └── recap.md                 # /recap skill
└── .claude/hooks/
    ├── post-write.sh                # PostToolUse: run formatter after file writes
    └── secret-scan.sh               # PreToolUse: block commits with secrets
```

## The vibe loop

Every piece of work follows this loop:

1. **Orient** — Claude reads `CLAUDE.md` and `vibestate.md` to understand project state and pick up any in-progress work
2. **Confirm** — in `detailed` mode, Claude writes out the proposed approach and waits for a go-ahead before touching files
3. **Build** — Claude implements, runs the verify command after each chunk, and fixes failures before moving on
4. **Save** — Claude reminds you to `/snapshot` when stable and `/land` when the feature is done

`vibestate.md` is the single source of truth: it tracks the active branch, milestone checklist, done log, and any session notes. Claude reads it at the start of every session so work is always resumable.

## CLI reference

### `npx tiller-code init`

Scaffold a new project interactively. Prompts for project name, description, run/verify command, and mode. Writes all files and makes an initial git commit.

```bash
npx tiller-code init
npx tiller-code init --yes   # skip prompts, use defaults
```

### `npx tiller-code upgrade`

Update Tiller-managed files (`.claude/CLAUDE.md`, hooks, skills) to the latest version without touching your `CLAUDE.md` or `vibestate.md`.

```bash
npx tiller-code upgrade
```

### `npx tiller-code mode <mode>`

Switch the project mode between `simple` and `detailed`. Updates `CLAUDE.md` in place.

```bash
npx tiller-code mode simple
npx tiller-code mode detailed
```

## Requirements

- Node 18+
- [Claude Code](https://claude.ai/code)
- git

## License

MIT
