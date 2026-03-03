# tech-backlog.md — tiller-ai

> Maintained by the Bosun agent. Committed and shared — tracks the project's known tech debt.
> Severities: [critical] correctness/security | [major] quality/consistency | [minor] clutter/readability

## Backlog

## Done

- [done 2026-03-03] src/commands/upgrade.ts: `writeFile as fsWriteFile` from `node:fs/promises` was still used in `migrateLegacyFiles` for a `.gitignore` write — replaced with the shared `writeFile` utility from `utils/fs.ts` for consistency; removed the now-unused alias from the import

- [done 2026-03-03] src/commands/config.ts: switched two `fsWriteFile` calls to use the shared `writeFile` utility from `utils/fs.ts`; removed the redundant `writeFile as fsWriteFile` import from `node:fs/promises`
- [done 2026-03-03] src/scaffold/tiller-manifest.ts + src/commands/config.ts: `projectName` and `description` were optional fields on `TillerManifest` but never written by `generateTillerManifest`; `config.ts` read them back as `manifest.projectName ?? ''` making them permanently empty — removed dead fields from the type and replaced the two `?? ''` references with literal `''`
- [done 2026-03-02] src/commands/upgrade.ts: redundant `writeFile as fsWriteFile` import — one call used raw `fsWriteFile` while all other writes in the same file used the shared `writeFile` utility from `utils/fs.ts`; replaced with the utility wrapper for consistency
- [done 2026-03-02] src/commands/upgrade.ts + src/scaffold/tiller-manifest.ts: session-resume.sh was missing from MANAGED_FILES and not written during upgrade; both gaps fixed together
- [done 2026-03-02] src/index.ts: hardcoded version string '0.2.0' in program.version() — duplicated TILLER_VERSION from tiller-manifest.ts; now imports and uses TILLER_VERSION directly
- [done 2026-02-28] src/scaffold/skills/setup.ts: stale /vibe reference in setup skill outro — should say /sail
- [done 2026-02-28] src/scaffold/skills/tech-debt.ts: stale /vibe reference in skill frontmatter description — should say /sail
- [done 2026-02-28] src/scaffold/hooks/session-resume.ts: stale /vibe reference in session-resume hook output — should say /sail
