# Codebase Map

> Maintained by Cartographer. Updated at each /dock.

## Modules

### CLI Commands

**Path:** `src/index.ts`, `src/commands/`

The CLI entrypoint wires four user-facing commands: `init`, `upgrade`, `config`, and `dashboard`. These command files stay thin and mostly hand off to shared config, scaffold, and dashboard logic, so `src/index.ts`, `src/commands/config.ts`, and `src/commands/dashboard.ts` are the best starting points when changing command behavior.

### Dashboard Server & Client

**Path:** `src/commands/dashboard.ts`, `src/commands/dashboard/`, `src/commands/dashboard/client/`, `tsup.config.ts`

This area powers `tiller-ai dashboard` as a local server plus bundled React UI for both config editing and the new Sessions tab. `routes.ts` now owns the config endpoints, session summary/detail APIs, and inbox message posts, while `client/app.tsx` and the session components handle tab switching, polling, and per-agent messaging; `contracts.ts` remains the shared schema to read first.

### Config Persistence & Regeneration

**Path:** `src/commands/config-shared.ts`, `src/scaffold/regenerate.ts`, `src/scaffold/tiller-manifest.ts`

This is the shared backend for both the prompt-driven `config` command and the dashboard API. `config-shared.ts` reads project/local config, computes effective settings, and persists project-vs-local saves, while the scaffold manifest and regeneration helpers decide which managed files must be written or removed when tool selection changes. Start with `src/commands/config-shared.ts` and `src/scaffold/tiller-manifest.ts`.

### Agent Sessions

**Path:** `src/sessions/`

This file-backed store defines how sail sessions, agent rosters, logs, and inbox messages live under `.tiller/sessions/` so the dashboard and generated hooks can observe the same run state. Read `src/sessions/fs.ts` first for the branch-to-slug rules and on-disk operations, then `src/sessions/types.ts` for the session schema.

### Managed File Generators

**Path:** `src/scaffold/index.ts`, `src/scaffold/skills/`, `src/scaffold/hooks/`, `src/scaffold/agents/`, `src/scaffold/copilot/`, `src/scaffold/opencode/`

These generators produce the actual Tiller-owned files for Claude Code, GitHub Copilot, and OpenCode projects, including the new session-log, inbox-check, and agent-complete hooks plus sail skill instructions that create and use sessions. Most files here are pure string builders, so the important first reads are `src/scaffold/index.ts` for orchestration and the specific generator file for the output you want to change, especially `hooks/`, `skills/sail.ts`, or tool-specific subfolders.

### Test Suite

**Path:** `test/`

Vitest covers the CLI, scaffold generators, sessions store, and the dashboard’s server/client split. `test/commands/dashboard.test.ts` and `test/commands/dashboard-client.test.ts` cover the Sessions tab plus config flows, while `test/sessions/fs.test.ts` and the scaffold tests pin the file-backed session format and generated hook/skill output.

### Promotional Website

**Path:** `website/`

The Astro website is separate from the npm package and exists for project marketing. Work here is mostly content and landing-page composition, so start in `website/src/components/` when updating the public-facing site.
