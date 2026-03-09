# tiller-ai

[![npm](https://img.shields.io/npm/v/tiller-ai)](https://www.npmjs.com/package/tiller-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node ≥22](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)

**The companion framework for AI coding assistants.**

Tiller scaffolds a structured development workflow into any repo — branching, planning, parallel builds, code review, and changelog — for both **GitHub Copilot CLI** and **Claude Code**. One command installs everything. Your AI assistant picks up where you left off every session, without you re-explaining the process.

## Tool support

Tiller started with Claude Code and the direct Claude API — that is still the most mature integration, with native hooks, agent definitions, and settings.json giving it deep out-of-the-box workflow capabilities.

The current development focus is **GitHub Copilot CLI**. Copilot's request-based quota model (versus per-token) rewards structured, efficient workflows — Tiller's MCP server bridges the gaps that Claude Code handles natively (agent teams, inter-agent messaging, session tracking) and makes that quota go further.

**OpenCode** is scaffolded but experimental — not on the near-term roadmap. In theory, pairing OpenCode with a Copilot provider subscription could be powerful, but that combination is not battle-tested yet.

| Tool | Status | Notes |
|---|---|---|
| **Claude Code** | ✅ Mature | Where Tiller started. Battle-tested workflow with native hooks, agents, and settings.json. Full test coverage. |
| **GitHub Copilot CLI** | 🎯 Active focus | Current development priority. MCP server bridges agent coordination gaps; structured workflow maximizes Copilot's request-based quota. |
| **OpenCode** | 🧪 Experimental | Scaffolded. Theoretically interesting with a Copilot provider, but not on the near-term roadmap. |

## Quick start

```bash
# 1. Scaffold into your repo (choose between "claude", "copilot" when prompted for AI tool)
npx tiller-ai init

# 2. Open in CLI and run first-time setup
/setup

# 3. Start building
/sail add a login page
```

## How it works

```
/sail  →  Orient  →  Plan (detailed mode)  →  Build  →  Quartermaster review  →  /dock
                                                 ↑
                              independent milestones run in parallel via agent teams
```

Every `/sail`:
- Reads `.tiller/tiller.json` and `changelog.md` to pick up where you left off
- In `detailed` mode, proposes a plan and waits for your go-ahead before touching files
- Builds independent milestones in parallel using agent teams
- Every 3 features, Bosun auto-runs a tech debt cleanup before planning starts
- Quartermaster reviews the full diff; one round of negotiation; Captain arbitrates any impasse

`/dock` merges to main (solo) or opens a PR (team), updates the changelog, and cleans up the branch.

## Skills

| Command | What it does |
|---|---|
| `/setup` | First-run: understand the project, fill in the AI context file |
| `/sail [idea]` | Plan and build; parallelizes independent milestones; auto-runs debt cleanup every 3 features |
| `/scout [topic]` | Investigate a codebase area and produce a structured ticket |
| `/anchor` | Commit current progress on the feature branch |
| `/dock` | Merge to main (solo) or open a PR (team); update changelog; clean up branch |
| `/recap` | Read-only status — active feature, notes |
| `/repair-hull` | Pick a tech debt item from `tech-backlog.md` and fix it on demand |
| `/cookbook` | Gather best-practice documentation for every technology in the project |

## Agents

Four specialist agents run automatically — you never invoke them directly.

| Agent | Role |
|---|---|
| **Quartermaster** | Reviews the feature diff before every `/dock`. Issues PASS or FAIL. Negotiates one round; escalates to Captain on impasse. |
| **Bosun** | Scans for tech debt, logs to `tech-backlog.md`, fixes one small item per run. Auto-triggered every 3 features. |
| **Captain** | Arbitrates Quartermaster/sailing-agent impasses. Final ruling — no further escalation. |
| **Cartographer** | Updates `codebase-map.md` at `/dock` time so the AI assistant has a structural overview at session start. |

## MCP Server (GitHub Copilot)

When using GitHub Copilot CLI, Tiller runs a local [Model Context Protocol](https://modelcontextprotocol.io) server that agents connect to via VS Code. It is auto-configured in `.vscode/mcp.json` during `init`.

```bash
npx tiller-ai mcp-server
```

The MCP server exposes 10 tools for structured agent coordination:

| Tool | What it does |
|---|---|
| `register-agent` / `complete-agent` | Track agent lifecycle within a session |
| `send-inbox-message` / `check-inbox` | Inter-agent messaging (e.g. sail lead → worker) |
| `delete-inbox-message` | Remove a processed message from an agent's inbox |
| `read-compass` / `update-compass` | Read/write the per-session waypoint file |
| `list-sessions` / `create-session` / `read-session` | Manage and inspect branch sessions under `.tiller/sessions/` |

This gives Copilot CLI agents the same coordination layer that Claude Code has through its built-in hooks system.

**Live session dashboard:**

```bash
npx tiller-ai dashboard
```

Opens a local web UI showing active sessions, agent rosters, inbox messages, and session logs in real time.

## Modes & Workflows

**Modes** control how the AI communicates:
- `simple` — builds without narrating, surfaces only blockers, short outcome-focused responses
- `detailed` — proposes approach and waits for confirmation before touching files, narrates decisions

**Workflows** control how `/dock` behaves:
- `solo` — merges feature branch to main locally, deletes branch
- `team` — pushes branch, opens a PR via `gh` CLI, branch kept locally

Switch at any time:

```bash
npx tiller-ai config
npx tiller-ai dashboard
```

Per-dev override (gitignored): create `.tiller/local.json` with `{ "mode": "simple", "workflow": "solo" }` to override shared settings locally.

## CLI reference

### `npx tiller-ai init`

Scaffold a new project interactively. Prompts for project name, description, run/verify command, mode, workflow, and AI tool (Copilot / Claude Code / OpenCode). Writes all files and makes an initial git commit.

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

Update Tiller-managed files to the latest version without touching your `changelog.md` or project-specific content.

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

Launch a local web dashboard for configuration and live session monitoring. Shows project values, local overrides, effective config, and active agent sessions side by side.

```bash
npx tiller-ai dashboard
```

### `npx tiller-ai mcp-server`

Start the MCP server over stdio. Auto-configured in `.vscode/mcp.json` for GitHub Copilot CLI. Exposes session management, agent inbox, compass, and agent lifecycle tools to Copilot agents running inside VS Code.

```bash
npx tiller-ai mcp-server
```

## Scaffolded files

Tiller writes different files depending on which AI tool you selected during `init`.

<details>
<summary>Shared files (all tools)</summary>

```
your-project/
├── .gitignore                             # Tiller entries added (or appended if existing)
├── changelog.md                           # Done log — updated by /dock on each merge
├── tech-backlog.md                        # Tech debt register — managed by Bosun
└── .tiller/
    ├── TILLER.md                          # Tiller-managed rules: workflow loop, skill docs, agents
    ├── tiller.json                        # Manifest: version, mode, workflow, runCommand, managedFiles
    ├── tech-debt.json                     # Tech debt state tracker (feature counter, threshold)
    ├── bin/
    │   ├── register-agent.py              # Agent registration helper (MCP fallback)
    │   └── complete-agent.py              # Agent completion helper (MCP fallback)
    ├── compass.md                         # gitignored — per-dev sail waypoint
    └── local.json                         # gitignored — per-dev mode/workflow overrides
```

</details>

<details>
<summary>GitHub Copilot CLI path</summary>

```
your-project/
├── .vscode/
│   └── mcp.json                           # Auto-wires tiller-ai mcp-server to VS Code
└── .github/
    ├── copilot-instructions.md            # AI context file (the Copilot equivalent of CLAUDE.md)
    ├── skills/
    │   ├── setup/SKILL.md
    │   ├── sail/SKILL.md
    │   ├── scout/SKILL.md
    │   ├── anchor/SKILL.md
    │   ├── dock/SKILL.md
    │   ├── recap/SKILL.md
    │   ├── repair-hull/SKILL.md
    │   ├── cookbook/SKILL.md
    │   └── tech-debt/SKILL.md             # Internal — auto-run by /sail every 3 features
    ├── agents/
    │   ├── quartermaster.agent.md
    │   ├── bosun.agent.md
    │   ├── captain.agent.md
    │   └── cartographer.agent.md
    └── hooks/
        ├── hooks.json                     # Hook registrations
        ├── post-write.sh                  # PostToolUse: run formatter after file writes
        ├── secret-scan.sh                 # PreToolUse: block writes containing secrets
        ├── session-resume.sh              # Session start: orient AI at context start
        ├── session-log.sh                 # PostToolUse: log tool activity to session
        └── inbox-check.sh                 # PreToolUse: check agent inbox before each tool
```

Not scaffolded by `init`:
- `codebase-map.md` — generated by Cartographer at first `/dock`

</details>

<details>
<summary>Claude Code path</summary>

```
your-project/
└── .claude/
    ├── CLAUDE.md                          # Imports TILLER.md (one line: @.tiller/TILLER.md)
    ├── settings.json                      # Hook registrations (PostToolUse, PreToolUse, UserPromptSubmit)
    ├── agents/
    │   ├── quartermaster.md
    │   ├── bosun.md
    │   ├── captain.md
    │   └── cartographer.md
    ├── hooks/
    │   ├── post-write.sh                  # PostToolUse: run formatter after file writes
    │   ├── secret-scan.sh                 # PreToolUse: block writes containing secrets
    │   ├── session-resume.sh              # UserPromptSubmit: orient Claude at session start
    │   └── plan-context.sh                # ExitPlanMode: inject plan template context
    └── skills/
        ├── setup/SKILL.md
        ├── sail/SKILL.md
        ├── scout/SKILL.md
        ├── anchor/SKILL.md
        ├── dock/SKILL.md
        ├── recap/SKILL.md
        ├── repair-hull/SKILL.md
        ├── cookbook/SKILL.md
        └── tech-debt/SKILL.md             # Internal — auto-run by /sail every 3 features
```

Not scaffolded by `init`:
- Root `CLAUDE.md` — created by `/setup` with project name and description
- `codebase-map.md` — generated by Cartographer at first `/dock`

</details>

## Requirements

- Node 22+
- git
- [GitHub Copilot CLI](https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-in-the-command-line) or [Claude Code](https://claude.ai/code)

## License

MIT
