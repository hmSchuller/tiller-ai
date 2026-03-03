import type { ProjectConfig } from './types.js';

export function generateTillerMd(_config: ProjectConfig): string {
  return `# Tiller — How to work

## Protocol enforcement

**Skill instructions are protocols, not suggestions. Execute every numbered step in order. Never skip, reorder, or abbreviate a step because the task seems simple enough to not need it. If a step has a skip condition, only skip when that condition is explicitly met.**

## Modes

The mode is set in \`.tiller/tiller.json\` (or overridden locally in \`.tiller/local.json\`). Read it at the start of every session.

### simple

The user is non-technical. They want to describe what they want and have it built for them.

- Do not explain your technical decisions unless asked
- Do not narrate steps as you do them
- Do not ask about tooling, frameworks, file structure, or verify commands
- When something goes wrong, fix it yourself first — only surface it if you can't resolve it
- Keep all communication short and outcome-focused: "Done. Here's what changed."

### detailed

The user is technical and wants to stay in control.

- Before touching files: write out your proposed approach, list files you'll create or modify, wait for explicit confirmation
- Narrate what you're doing and why
- Surface decisions and trade-offs before making them
- When something goes wrong, explain what happened and what you plan to do

## Workflows

The workflow is set in \`.tiller/tiller.json\` (or overridden locally in \`.tiller/local.json\`).

### solo

Single developer or local-only flow. /dock merges directly to main.

### team

Multiple developers. /dock pushes the feature branch and opens a PR. Merging happens on GitHub/GitLab after review and CI.

## Vibe loop

Every piece of work follows this loop:

1. **Orient** — read \`.tiller/tiller.json\` (and \`.tiller/local.json\` if present) and changelog.md (shared); if \`codebase-map.md\` exists, read it for a structural overview
2. **Plan** — in detailed mode, enter plan mode with milestones and wait for approval
3. **Build** — implement milestone by milestone; milestones tagged \`[independent]\` may be parallelized using agent teams (TeamCreate + Task tool); each milestone includes tests, verify, and auto-commit
4. **Review** — Quartermaster inspects the feature branch diff and issues PASS or FAIL; one round of negotiation allowed; unresolved disagreements escalate to Captain
5. **Dock** — announce feature done, suggest /dock to merge and clean up

## File discipline

- Never commit directly to main
- Always work on a feature branch (feature/<name>)
- Run the verify command before every anchor and dock
- \`changelog.md\` is committed and shared — it tracks the project's done log

## Per-dev overrides

Create \`.tiller/local.json\` (gitignored) to override mode or workflow personally:
\`\`\`json
{ "mode": "simple", "workflow": "solo" }
\`\`\`
Skills read \`.tiller/local.json\` first, then fall back to \`.tiller/tiller.json\`.

## Upgrading

To check if a newer version of Tiller is available:
\`\`\`
npx tiller-ai --version      # current version installed in this project
npm view tiller-ai version   # latest published version
\`\`\`

To upgrade (non-interactive, safe for agents to run):
\`\`\`
npx tiller-ai upgrade --yes
\`\`\`

## Skills

- **/setup** — first-run: understand the project and configure CLAUDE.md
- **/sail** [idea] — milestone-driven development: plan, build, test, auto-commit. Independent milestones are parallelized using agent teams. Every 3 landed features, automatically runs a tech debt cleanup before planning.
- **/scout** [topic] — pre-work investigation: explore the codebase, ask clarifying questions, produce a structured ticket (GitHub Issue or terminal output).
- **/anchor** — commit current progress on the feature branch
- **/dock** — merge or PR depending on workflow
- **/recap** — read-only status of all work

## Agents

Tiller provides four specialist agents in \`.claude/agents/\`. They are native Claude Code agents spawned by skills via \`subagent_type\`.

- **quartermaster** — independent code reviewer. Spawned at end of sail (Step 4.5) to review the feature branch diff. Returns PASS or FAIL. Negotiates one round; escalates to Captain on impasse. (opus)
- **bosun** — tech debt maintenance. Scans the codebase, logs issues to \`tech-backlog.md\` by severity, fixes one small item per run. Alerts on critical items.
- **captain** — arbitration. Only activated when Quartermaster and Sailing Agent reach impasse. Issues one of three rulings: AGREE WITH QUARTERMASTER, AGREE WITH SAILING AGENT, or COMPROMISE. (opus)
- **cartographer** — codebase map maintainer. Spawned at /dock time to update \`codebase-map.md\` with features and module paths. Reports structural concerns for the calling skill to escalate.

## Rules

- Do not skip the verify step
- Do not touch unrelated files
- Do not make architectural changes without explicit confirmation in detailed mode
- Keep commits atomic and descriptive
`;
}

export function generateUserClaudeMd(): string {
  return `@../.tiller/TILLER.md\n`;
}
