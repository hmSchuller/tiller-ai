# Codebase Map

> Maintained by Cartographer. Updated at each /dock.

## Modules

### CLI Commands

**Path:** `src/index.ts`, `src/commands/`

The CLI entrypoint wires four user-facing commands: `init`, `upgrade`, `config`, and the newer `dashboard`. These command files stay thin and mostly hand off to shared config/scaffold logic, so `src/index.ts`, `src/commands/config.ts`, and `src/commands/dashboard.ts` are the best starting points when changing command behavior.

### Configuration Dashboard

**Path:** `src/commands/dashboard.ts`, `src/commands/dashboard/`

This area implements `tiller-ai dashboard` as a local configuration server. `server.ts` boots the HTTP listener, `routes.ts` serves the HTML shell, bundled assets, and `/api/config` read/save endpoints, while `contracts.ts` centralizes request/response types, labels, and type guards shared by both server and client. Read `src/commands/dashboard.ts`, then `src/commands/dashboard/routes.ts`, then `src/commands/dashboard/contracts.ts`.

### Dashboard React Client

**Path:** `src/commands/dashboard/client/`, `tsup.config.ts`

The dashboard UI is a bundled React/ReactDOM client with reusable presentational components, external CSS, and theme tokens instead of inline markup. `app.tsx` owns the fetch/save flow, `state.ts` and `view-model.ts` hold the pure state reducers/helpers added during hardening, and `theme.ts` plus `styles.css` define the shared visual system; `tsup.config.ts` is where the browser bundle entry is registered.

### Config Persistence & Regeneration

**Path:** `src/commands/config-shared.ts`, `src/scaffold/index.ts`, `src/scaffold/regenerate.ts`, `src/scaffold/tiller-manifest.ts`

This is the shared backend for both the prompt-driven `config` command and the dashboard API. `config-shared.ts` reads project/local config, computes effective settings, and persists project-vs-local saves, while the scaffold manifest and regeneration helpers decide which managed files must be written or removed when tool selection changes. Start with `src/commands/config-shared.ts` and `src/scaffold/tiller-manifest.ts`.

### Managed File Generators

**Path:** `src/scaffold/`, `src/scaffold/skills/`, `src/scaffold/hooks/`, `src/scaffold/agents/`, `src/scaffold/copilot/`, `src/scaffold/opencode/`

These generators produce the actual Tiller-owned files for Claude Code, GitHub Copilot, and OpenCode projects. Most files here are pure string builders, so the important first reads are `src/scaffold/index.ts` for orchestration and the specific generator file for the output you want to change (for example `skills/`, `hooks/`, or tool-specific subfolders).

### Test Suite

**Path:** `test/`

Vitest covers the CLI, scaffold generators, and the dashboard’s server/client split. `test/commands/dashboard.test.ts` is the integration-style check for server routing, asset serving, and config persistence; `test/commands/dashboard-client.test.ts` covers the new client reducers, view-model helpers, reusable components, and accessibility-sensitive rendering.

### Promotional Website

**Path:** `website/`

The Astro website is separate from the npm package and exists for project marketing. Work here is mostly content and landing-page composition, so start in `website/src/components/` when updating the public-facing site.
