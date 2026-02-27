import type { ProjectConfig } from '../types.js';

export function generateSetupSkill(_config: ProjectConfig): string {
  return `---
name: setup
description: First-run setup — understand the project and configure CLAUDE.md
---

# /setup — Configure this project

> Run this once after \`tiller init\`.

## Step 1: Ask about mode first

Ask only this question to start:

> "How do you want to work together?
> - **Simple** — just tell me what to build, I'll handle all the technical decisions.
> - **Detailed** — I'll explain my thinking and check in with you before making decisions."

Wait for their answer. Default to simple if they're unsure.

---

## If mode is SIMPLE

The user is non-technical. Handle everything yourself, ask as little as possible.

**Step 2: Ask what the project is**

Ask one question: "What are you building?"

Listen to their answer. That's enough — use it as the description.

**Step 3: Derive the verify command yourself**

Look at the project files silently. Do not ask the user about this.

- \`package.json\` with a \`test\` script → \`npm test\`
- \`package.json\` without a \`test\` script → \`npm run build\` if build script exists, else \`node --check index.js\`
- \`pyproject.toml\` or \`setup.py\` → \`pytest\`
- \`Cargo.toml\` → \`cargo test\`
- \`go.mod\` → \`go test ./...\`
- \`Makefile\` with a \`test\` target → \`make test\`
- Nothing recognizable → \`echo ok\` (can be updated later)

**Step 4: Update CLAUDE.md and commit**

Rewrite \`CLAUDE.md\` with the project name, their description, the verify command you derived, and mode: simple.

Update \`runCommand\` and \`mode\` in \`.claude/.tiller.json\`.

\`\`\`
git add CLAUDE.md .claude/.tiller.json
git commit -m "chore: configure project via /setup"
\`\`\`

Say: "All set. Just tell me what you want to build and I'll take it from there."

---

## If mode is DETAILED

The user is technical and wants to stay in the loop.

**Step 2: Ask about the project**

Ask: "What are you building?" — let them describe it.

If there's already a README or package.json, read it first and confirm your understanding instead of asking blind.

**Step 3: Ask about the verify command**

Ask: "What command should I run to verify everything's working after a change?"

Give suggestions based on what you see in the project. If they don't know yet, suggest \`echo ok\` as a placeholder.

**Step 4: Update CLAUDE.md and commit**

Rewrite \`CLAUDE.md\` with the project name, description, verify command, and mode: detailed.

Update \`runCommand\` and \`mode\` in \`.claude/.tiller.json\`.

\`\`\`
git add CLAUDE.md .claude/.tiller.json
git commit -m "chore: configure project via /setup"
\`\`\`

Say: "All set. Use /vibe to start working."
`;
}
