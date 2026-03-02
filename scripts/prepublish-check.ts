/**
 * Pre-publish validation script.
 *
 * Check A: Every path in MANAGED_FILES exists in this repo's own .claude/ folder.
 * Check B: Every path in MANAGED_FILES has a writeFile(...) call in src/scaffold/index.ts.
 */

import { existsSync, readFileSync } from 'node:fs';
import { MANAGED_FILES } from '../src/scaffold/tiller-manifest.ts';

let failed = false;

// ── Check A: local files exist ────────────────────────────────────────────────

const missing = MANAGED_FILES.filter((f) => !existsSync(f));

if (missing.length > 0) {
  console.error('❌  Check A FAILED — these managed files are missing from the repo:');
  missing.forEach((f) => console.error(`     • ${f}`));
  failed = true;
} else {
  console.log('✅  Check A passed — all managed files exist locally');
}

// ── Check B: scaffold generators are wired ────────────────────────────────────

const scaffoldSrc = readFileSync('src/scaffold/index.ts', 'utf-8');

// Strip the leading ".claude/" from each path because writeFile calls use
// relative paths like ".claude/CLAUDE.md" directly, but we want to match the
// filename segment to be resilient to minor path variations.
const unwired = MANAGED_FILES.filter((f) => {
  // Look for writeFile(p('<path>') or writeFile(p(".claude/...") patterns
  // We check for the path literal appearing after writeFile(p(
  const escaped = f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return !new RegExp(`writeFile\\(p\\(['"\`]${escaped}['"\`]\\)`).test(scaffoldSrc);
});

if (unwired.length > 0) {
  console.error('❌  Check B FAILED — these managed files have no writeFile call in src/scaffold/index.ts:');
  unwired.forEach((f) => console.error(`     • ${f}`));
  failed = true;
} else {
  console.log('✅  Check B passed — all managed files are wired in scaffold/index.ts');
}

// ── Result ────────────────────────────────────────────────────────────────────

if (failed) {
  console.error('\nPublish aborted. Fix the issues above before publishing.');
  process.exit(1);
} else {
  console.log('\nAll prepublish checks passed.');
}
