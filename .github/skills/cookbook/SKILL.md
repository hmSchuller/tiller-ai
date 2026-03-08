---
name: cookbook
description: Explore the codebase, gather best-practice documentation for every technology present, and write it as developer-friendly markdown files.
---

# /cookbook — Build a best-practices cookbook for this project

## Step 1: Orient

Read `.tiller/tiller.json` (and `.tiller/local.json` if it exists) to understand the current state.
If `codebase-map.md` exists, read it to get a structural overview.

State the current mode: "Mode: <mode>".

**If mode is simple:** Do not narrate the orient step.
**If mode is detailed:** Summarize the project stack in 2-3 sentences.

## Step 2: Detect technologies

Use the **Explore agent** (`subagent_type: "Explore"`, thoroughness: `"very thorough"`) to scan the project and identify every technology, language, framework, library, and tool that is meaningfully present. The agent should:

- Inspect `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Gemfile`, `pom.xml`, `build.gradle`, and similar manifest files.
- Look at file extensions present in `src/`, `lib/`, `app/`, and similar source directories.
- Check config files: `tsconfig.json`, `.eslintrc`, `vitest.config.*`, `jest.config.*`, `babel.config.*`, `webpack.config.*`, `vite.config.*`, `tailwind.config.*`, `Dockerfile`, `docker-compose.*`, CI workflow files in `.github/workflows/` etc.
- Note runtime/platform dependencies (Node.js, Python, JVM, Rust, Go, etc.).

Wait for the Explore agent to complete. Compile the results into a deduplicated list of technologies, for example:

```
Detected technologies:
1. TypeScript
2. Node.js
3. React
4. Vitest
5. tsup
6. Commander.js
…
```

Show this list to the user.

## Step 3: Check for existing guidelines

For each detected technology, search the codebase for existing coding or implementation guidelines:

- Look inside `docs/`, `documentation/`, `CONTRIBUTING.md`, `README.md`, `CLAUDE.md`, `AGENTS.md`, `.tiller/TILLER.md`, and any `*.md` files at the root or in common documentation paths.
- Search for technology-specific config comments, inline ADRs (Architecture Decision Records), or style notes.

Build a table:

| Technology | Existing guideline found? | Source file(s) |
|------------|--------------------------|----------------|
| TypeScript | Yes / No / Partial       | tsconfig.json, … |
| …          | …                        | …              |

Show this table to the user.

## Step 4: Confirm gaps with the user

For any technology where no existing guideline was found, ask the user to confirm:

> "I could not find implementation guidelines for the following technologies: **<list>**.
> Can you confirm there is indeed nothing documented for these, or should I look somewhere else?
> (Reply 'confirmed' to proceed, or point me to the right location.)"

Wait for the user's response. If they point to a specific location, re-examine it and update the table. Repeat until the user confirms or all gaps are resolved.

Produce a final list of technologies that need new cookbook entries (`missing-list`).

## Step 5: Ask where to place the cookbook

Ask the user:

> "Where should I create the cookbook folder? Suggested default: `docs/cookbook`
> (Press Enter to accept, or type a custom path.)"

Wait for the user's response and save the path as `cookbook-root`.

## Step 6: Research best practices

For each technology in `missing-list`, spawn a **general-purpose** sub-agent to research current, production-grade best practices:

```
subagent_type: "general-purpose"
prompt: |
  You are a senior software engineer and technical writer.
  Research current best practices for using **<technology>** in a production-grade, maintainable project.
  Focus on:
  - Project structure and file organization
  - Coding style and naming conventions
  - Error handling and resilience patterns
  - Testing strategies (unit, integration, e2e)
  - Performance considerations
  - Security considerations
  - Dependency management and versioning
  - Tooling and developer experience (linting, formatting, CI)
  - Common pitfalls and how to avoid them
  - Recommended patterns (with short code examples where useful)

  Organise your findings under clearly separated headings.
  Return the full content; it will be written to markdown files.
```

Collect all research results before proceeding (you may run agents in parallel for independent technologies).

## Step 7: Write the cookbook files

Create the folder structure:

```
<cookbook-root>/
  README.md                     ← overview & index of all technologies
  <technology-1>/
    README.md                   ← 1–2 sentence intro + links to sub-files
    project-structure.md
    coding-style.md
    error-handling.md
    testing.md
    performance.md
    security.md
    tooling.md
    pitfalls.md
  <technology-2>/
    …
```

**Rules for writing files:**
- **Never** put everything into one large file. Split by topic as shown above. Only create a topic file if there is meaningful content for it (skip empty sections).
- Each file starts with a H1 heading that matches the topic.
- Use clear, concise language — helpful for both AI agents and human developers.
- Include short, realistic code examples (fenced code blocks) where they add clarity.
- Cross-reference other cookbook files where technologies interact (e.g., "See [TypeScript › Testing](../typescript/testing.md) for type-safe test patterns").
- Keep each file under ~300 lines. If content is longer, split into numbered part files (e.g., `testing-1.md`, `testing-2.md`).

**Top-level `README.md` format:**
```markdown
# Project Cookbook

This cookbook documents best practices for every technology used in this project.
It is intended for both AI coding agents and human developers joining the project.

## Technologies

| Technology | Folder | Description |
|------------|--------|-------------|
| TypeScript | [typescript/](./typescript/) | … |
…

## How to use this cookbook

- AI agents: Read the relevant section before implementing a feature in that technology.
- Humans: Use as a reference when making architecture or style decisions.
```

## Step 8: Confirm and summarise

After writing all files, output a summary:

```
Cookbook created at: <cookbook-root>

Technologies documented:
  ✓ <technology-1>  →  <cookbook-root>/<technology-1>/  (<N> files)
  ✓ <technology-2>  →  <cookbook-root>/<technology-2>/  (<N> files)
  …

Technologies with existing guidelines (skipped):
  – <technology-X>  (found in <source-file>)
  …
```

**If mode is simple:** Print the summary only.
**If mode is detailed:** Print the summary and add: "You can run /cookbook again at any time to expand or update the documentation as the project evolves."
