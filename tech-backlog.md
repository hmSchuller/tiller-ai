# tech-backlog.md — tiller-ai

> Maintained by the Bosun agent. Committed and shared — tracks the project's known tech debt.
> Severities: [critical] correctness/security | [major] quality/consistency | [minor] clutter/readability

## Backlog

## Done

- [done 2026-03-02] src/commands/upgrade.ts + src/scaffold/tiller-manifest.ts: session-resume.sh was missing from MANAGED_FILES and not written during upgrade; both gaps fixed together
- [done 2026-03-02] src/index.ts: hardcoded version string '0.2.0' in program.version() — duplicated TILLER_VERSION from tiller-manifest.ts; now imports and uses TILLER_VERSION directly
- [done 2026-02-28] src/scaffold/skills/setup.ts: stale /vibe reference in setup skill outro — should say /sail
- [done 2026-02-28] src/scaffold/skills/tech-debt.ts: stale /vibe reference in skill frontmatter description — should say /sail
- [done 2026-02-28] src/scaffold/hooks/session-resume.ts: stale /vibe reference in session-resume hook output — should say /sail
