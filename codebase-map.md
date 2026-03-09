# Codebase Map

> Maintained by Cartographer. Updated at each /dock.

## Modules

### CLI Commands

**Path:** `src/index.ts`, `src/commands/`

The CLI entrypoint wires five user-facing commands: `init`, `upgrade`, `config`, `dashboard`, and `mcp-server`. These command files stay thin and mostly hand off to shared config, scaffold, dashboard, and MCP logic, so `src/index.ts`, `src/commands/config.ts`, `src/commands/dashboard.ts`, and `src/commands/mcp-server.ts` are the best starting points when changing command behavior.

### Dashboard Server & Client

**Path:** `src/commands/dashboard.ts`, `src/commands/dashboard/`, `src/commands/dashboard/client/`, `tsup.config.ts`

This area powers `tiller-ai dashboard` as a local server plus bundled React UI for both config editing and the Sessions tab. `routes.ts` owns config endpoints, session summary/detail APIs, inbox message posting, and inbox message deletion (DELETE by index); `client/components/SessionDetail.tsx` provides the polished session detail view with sorted agents, expand/collapse, message priority indicators, delivery status, log toggling, and message truncation. Start with `contracts.ts` for the shared schema, then `routes.ts` and `SessionDetail.tsx`.

### Config Persistence & Regeneration

**Path:** `src/commands/config-shared.ts`, `src/scaffold/regenerate.ts`, `src/scaffold/tiller-manifest.ts`

This is the shared backend for both the prompt-driven `config` command and the dashboard API. `config-shared.ts` reads project/local config, computes effective settings, and persists project-vs-local saves, while the scaffold manifest and regeneration helpers decide which managed files must be written or removed when tool selection changes. Start with `src/commands/config-shared.ts` and `src/scaffold/tiller-manifest.ts`.

### Agent Sessions

**Path:** `src/sessions/`

This file-backed store defines how sail sessions, agent rosters, logs, and inbox messages live under `.tiller/sessions/` so the dashboard and generated hooks can observe the same run state. Key operations include reading/writing sessions, appending and parsing inbox messages, marking delivery, and deleting unread inbox messages by index. `AgentRecord.type` now spans four values: `fleet | specialist | ephemeral | lead` — `lead` identifies the sail-orchestrating agent registered at session start. Read `src/sessions/fs.ts` first for the on-disk operations, then `src/sessions/types.ts` for the session schema.

### Managed File Generators

**Path:** `src/scaffold/index.ts`, `src/scaffold/skills/`, `src/scaffold/hooks/`, `src/scaffold/bin/`, `src/scaffold/agents/`, `src/scaffold/copilot/`, `src/scaffold/opencode/`

These generators produce the Tiller-managed files for Claude Code, GitHub Copilot, and OpenCode projects, including hooks, agents, skill prompts, and the shared `register-agent.py`/`complete-agent.py` helper scripts under `src/scaffold/bin/`. Copilot now has dedicated sail and dock generators under `src/scaffold/copilot/skills/` and a `.vscode/mcp.json` generator at `src/scaffold/copilot/mcp-json.ts` that auto-wires the `tiller-ai mcp-server` process into VS Code. Both Copilot and Claude sail skills now use MCP-first session creation — calling `tiller/create-session` then `tiller/register-agent` (with `type: "lead"`) for new sessions, falling back to direct bash only when MCP is unavailable. Start with `src/scaffold/index.ts`, then the specific generator you need — `src/scaffold/copilot/mcp-json.ts` for MCP auto-config, `src/scaffold/copilot/skills/` or `src/scaffold/skills/` for sail flow behavior.

### MCP Server

**Path:** `src/mcp/`, `src/commands/mcp-server.ts`

Implements a JSON-RPC 2.0 / Model Context Protocol server (`tiller-ai mcp-server`) that exposes Tiller's session and inbox operations as typed MCP tools and resources so AI agents can communicate without shelling out to Python scripts. `server.ts` owns the protocol handshake and request dispatch; `tools.ts` defines and handles all 10 tool calls (register-agent, complete-agent, send-inbox-message, read-inbox, read/write-compass, list-sessions, and **create-session** — idempotent, path-traversal-safe, derives a slug from a branch name via `branchToSlug`); `register-agent` now accepts `fleet | specialist | ephemeral | lead` as valid agent types. `transport.ts` wraps stdio line-by-line framing; `types.ts` carries the full JSON-RPC + MCP type surface. Start with `src/mcp/server.ts`, then `src/mcp/tools.ts`.

### Test Suite

**Path:** `test/`

Vitest covers the CLI, scaffold generators, sessions store, the dashboard’s server/client split, and the MCP server. `test/mcp/server.test.ts`, `test/mcp/tools.test.ts`, and `test/mcp/resources.test.ts` exercise the full MCP protocol surface (tool dispatch, resource reads, JSON-RPC edge cases); `tools.test.ts` now asserts 10 tool definitions and includes a `create-session` suite covering happy path, idempotency, missing param, and path-traversal rejection, plus `register-agent` cases for the new `lead` type. `test/sessions/fs.test.ts` covers the `lead` type guard. `test/commands/mcp-server.test.ts` covers the CLI command entrypoint. `test/scaffold/copilot.test.ts` and `test/scaffold/skills.test.ts` pin MCP-first session creation output for both Copilot and Claude sail skills.

