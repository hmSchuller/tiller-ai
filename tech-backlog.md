# tech-backlog.md — tiller-ai

> Maintained by the Bosun agent. Committed and shared — tracks the project's known tech debt.
> Severities: [critical] correctness/security | [major] quality/consistency | [minor] clutter/readability

## Backlog

- [major] src/commands/upgrade.ts: upgradeCommand does not write session-resume.sh or .tiller-tech-debt.json — files added in a later version of scaffold are silently skipped on upgrade; users who run upgrade won't get them
- [major] src/scaffold/tiller-manifest.ts: MANAGED_FILES list omits session-resume.sh, so upgrade does not overwrite it and the file is excluded from any managed-file tracking

## Done

- [done 2026-02-28] src/scaffold/skills/setup.ts: stale /vibe reference in setup skill outro — should say /sail
- [done 2026-02-28] src/scaffold/skills/tech-debt.ts: stale /vibe reference in skill frontmatter description — should say /sail
- [done 2026-02-28] src/scaffold/hooks/session-resume.ts: stale /vibe reference in session-resume hook output — should say /sail
