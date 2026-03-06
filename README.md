# tiller-ai

[![npm](https://img.shields.io/npm/v/tiller-ai)](https://www.npmjs.com/package/tiller-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node ≥22](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)

**Give Claude Code a workflow it follows by default.**

Tiller scaffolds a set of slash commands, agents, and shared tracking files into any repo. Once installed, Claude knows how to branch, build, review, and ship — without you explaining the loop every session.

## Quick start

```bash
# 1. Scaffold into a new (or existing) repo
npx tiller-ai init

# 2. Open in Claude Code and run first-time setup
/setup

# 3. Describe work and let Claude plan and build it
/sail add a login page
```

## How it works

```
/sail  →  Orient  →  Plan (detailed mode)  →  Build  →  Quartermaster review  →  /dock
                                                 ↑
                              independent milestones run in parallel via agent teams
```

Every `/sail`:
- Claude reads `.tiller/tiller.json` and `changelog.md` to pick up where you left off
- In `detailed` mode, Claude proposes a plan and waits for your go-ahead before touching files
- Independent milestones are built in parallel using agent teams
- Every 3 features, Bosun auto-runs a tech debt cleanup before planning starts
- Quartermaster reviews the full diff; one round of negotiation; Captain arbitrates any impasse

`/dock` merges to main (solo) or opens a PR (team), updates the changelog, and cleans up the branch.

## Skills

| Command | What it does |
|---|---|
| `/setup` | First-run: understand the project, fill in `CLAUDE.md` |
| `/sail [idea]` | Plan and build; parallelizes independent milestones; auto-runs debt cleanup every 3 features |
| `/scout [topic]` | Investigate a codebase area and produce a structured ticket |
| `/anchor` | Commit current progress on the feature branch |
| `/dock` | Merge to main (solo) or open a PR (team); update changelog; clean up branch |
| `/recap` | Read-only status — active feature, notes |
| `/repair-hull` | Pick a tech debt item from `tech-backlog.md` and fix it on demand |

## Agents

Four specialist agents run automatically — you never invoke them directly.

| Agent | Role |
|---|---|
| **Quartermaster** | Reviews the feature diff before every `/dock`. Issues PASS or FAIL. Negotiates one round; escalates to Captain on impasse. |
| **Bosun** | Scans for tech debt, logs to `tech-backlog.md`, fixes one small item per run. Auto-triggered every 3 features. |
| **Captain** | Arbitrates Quartermaster/sailing-agent impasses. Final ruling — no further escalation. |
| **Cartographer** | Updates `codebase-map.md` at `/dock` time so Claude has a structural overview at session start. |

## Modes & Workflows

**Modes** control how Claude communicates:
- `simple` — builds without narrating, surfaces only blockers, short outcome-focused responses
- `detailed` — proposes approach and waits for confirmation before touching files, narrates decisions

**Workflows** control how `/dock` behaves:
- `solo` — merges feature branch to main locally, deletes branch
- `team` — pushes branch, opens a PR via `gh` CLI (or prints URL), branch kept locally

Switch at any time:

```bash
npx tiller-ai config
npx tiller-ai dashboard
```

Per-dev override (gitignored, not scaffolded): create `.tiller/local.json` with `{ "mode": "simple", "workflow": "solo" }` to override shared settings locally.

## CLI reference

### `npx tiller-ai init`

Scaffold a new project interactively. Prompts for project name, description, run/verify command, mode, and workflow. Writes all files and makes an initial git commit.

```bash
npx tiller-ai init

# Skip prompts and use defaults
npx tiller-ai init --yes

# Set mode and workflow non-interactively
npx tiller-ai init --mode detailed --workflow team
```

| Flag | Description |
|---|---|
| `-y, --yes` | Skip all prompts, use defaults |
| `--mode <mode>` | `simple` or `detailed` (default: `simple`) |
| `--workflow <workflow>` | `solo` or `team` (default: `solo`) |

### `npx tiller-ai upgrade`

Update Tiller-managed files (`.tiller/TILLER.md`, `settings.json`, hooks, skills, agents) to the latest version without touching your `changelog.md` or project-specific content.

```bash
npx tiller-ai upgrade

# Skip confirmation prompt
npx tiller-ai upgrade --yes
```

| Flag | Description |
|---|---|
| `-y, --yes` | Skip confirmation prompt |

### `npx tiller-ai config`

Interactively update mode, workflow, tool selection, and whether the change applies locally or to the shared project config.

```bash
npx tiller-ai config
```

### `npx tiller-ai dashboard`

Launch a temporary local web dashboard for the same configuration surface as `config`. It prints a localhost URL, opens it in your browser, shows project values, local overrides, and the effective config side by side, and keeps inline errors visible if reading or saving fails.

```bash
npx tiller-ai dashboard
```

## Scaffolded files

<details>
<summary>View full file tree</summary>

```
your-project/
├── .gitignore                             # Tiller entries added (or appended if existing)
├── changelog.md                           # Done log — updated by /dock on each merge
├── tech-backlog.md                        # Tech debt register — managed by Bosun
├── .tiller/
│   ├── TILLER.md                          # Tiller-managed rules: vibe loop, skill docs, agents
│   ├── tiller.json                        # Manifest: version, mode, workflow, runCommand, managedFiles
│   ├── tech-debt.json                     # Tech debt state tracker (feature counter, threshold)
│   ├── compass.md                         # gitignored — per-dev sail waypoint
│   └── local.json                         # gitignored — per-dev mode/workflow overrides
└── .claude/
    ├── CLAUDE.md                          # Imports TILLER.md (one line: @.tiller/TILLER.md)
    ├── settings.json                      # Hook registrations (PostToolUse, PreToolUse, UserPromptSubmit)
    ├── agents/
    │   ├── quartermaster.md               # Code review agent
    │   ├── bosun.md                       # Tech debt agent
    │   ├── captain.md                     # Arbitration agent
    │   └── cartographer.md               # Codebase map agent
    ├── hooks/
    │   ├── post-write.sh                  # PostToolUse: run formatter after file writes
    │   ├── secret-scan.sh                 # PreToolUse: block writes containing secrets
    │   └── session-resume.sh              # UserPromptSubmit: orient Claude at session start
    └── skills/
        ├── setup/SKILL.md
        ├── sail/SKILL.md
        ├── scout/SKILL.md
        ├── anchor/SKILL.md
        ├── dock/SKILL.md
        ├── recap/SKILL.md
        ├── repair-hull/SKILL.md
        └── tech-debt/SKILL.md             # Internal — auto-run by /sail every 3 features
```

Not scaffolded by `init`:
- Root `CLAUDE.md` — created by `/setup` with project name and description
- `codebase-map.md` — generated by Cartographer at first `/dock`

</details>

## Requirements

- Node 22+
- [Claude Code](https://claude.ai/code)
- git

## License

MIT
