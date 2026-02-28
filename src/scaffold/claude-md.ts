import type { ProjectConfig } from './types.js';

export function generateRootClaudeMd(config: ProjectConfig): string {
  const description = config.description || '<!-- Run /setup to fill this in -->';
  const runCommand = config.runCommand || '# not set — run /setup to configure';
  const modeLabel = config.mode === 'detailed' ? 'detailed' : 'simple';
  const workflowLabel = config.workflow === 'team' ? 'team' : 'solo';

  return `# ${config.projectName}

${description}

## Verify command

\`\`\`
${runCommand}
\`\`\`

## Mode

${modeLabel}

## Workflow

${workflowLabel}
`;
}

export function generateDotClaudeMd(_config: ProjectConfig): string {
  return `# Tiller — How to work

> These rules are managed by Tiller. Do not edit manually.

## Modes

The mode is set in CLAUDE.md (or overridden locally in \`.tiller.local.json\`). Read it at the start of every session.

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

The workflow is set in CLAUDE.md (or overridden locally in \`.tiller.local.json\`).

### solo

Single developer or local-only flow. /land merges directly to main.

### team

Multiple developers. /land pushes the feature branch and opens a PR. Merging happens on GitHub/GitLab after review and CI.

## Vibe loop

Every piece of work follows this loop:

1. **Orient** — read CLAUDE.md, vibestate.md (local), and changelog.md (shared)
2. **Confirm** — in detailed mode, enter plan mode with milestones and wait for approval
3. **Build** — implement milestone by milestone; milestones tagged \`[independent]\` may be parallelized using agent teams (TeamCreate + Task tool); each milestone includes tests, verify, and auto-commit
4. **Complete** — announce feature done, suggest /land

## File discipline

- Never commit directly to main
- Always work on a feature branch (feature/<name>)
- Run the verify command before every save and land
- \`vibestate.md\` is gitignored — it tracks your local active feature state
- \`changelog.md\` is committed and shared — it tracks the project's done log

## Per-dev overrides

Create \`.tiller.local.json\` (gitignored) to override mode or workflow personally:
\`\`\`json
{ "mode": "simple", "workflow": "solo" }
\`\`\`
Skills read \`.tiller.local.json\` first, then fall back to CLAUDE.md.

## Skills

- **/setup** — first-run: understand the project and configure CLAUDE.md
- **/sail** [idea] — milestone-driven development: plan, build, test, auto-commit. Independent milestones are parallelized using agent teams. Every 3 landed features, automatically runs a tech debt cleanup before planning.
- **/anchor** — commit current progress on the feature branch
- **/land** — merge or PR depending on workflow
- **/recap** — read-only status of all work

## Rules

- Do not skip the verify step
- Do not touch unrelated files
- Do not make architectural changes without explicit confirmation in detailed mode
- Keep commits atomic and descriptive
`;
}
