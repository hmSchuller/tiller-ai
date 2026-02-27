import { join } from 'node:path';
import { writeFile } from '../utils/fs.js';
import { isGitRepo, gitInit, gitAdd, gitCommit } from '../utils/git.js';
import type { ProjectConfig } from './types.js';
import { generateRootClaudeMd, generateDotClaudeMd } from './claude-md.js';
import { generateVibestate } from './vibestate.js';
import { generateChangelog } from './changelog.js';
import { generateSettingsJson } from './settings-json.js';
import { generateGitignore } from './gitignore.js';
import { generateTillerManifest } from './tiller-manifest.js';
import { generatePostWriteHook } from './hooks/post-write.js';
import { generateSecretScanHook } from './hooks/secret-scan.js';
import { generateSessionResumeHook } from './hooks/session-resume.js';
import { generateVibeSkill } from './skills/vibe.js';
import { generateSnapshotSkill } from './skills/snapshot.js';
import { generateRecapSkill } from './skills/recap.js';
import { generateLandSkill } from './skills/land.js';
import { generateSetupSkill } from './skills/setup.js';

const TILLER_VERSION = '0.1.0';

export async function scaffold(config: ProjectConfig, targetDir: string): Promise<void> {
  const p = (rel: string) => join(targetDir, rel);

  // Root files
  await writeFile(p('CLAUDE.md'), generateRootClaudeMd(config));
  await writeFile(p('.gitignore'), generateGitignore(config));
  await writeFile(p('changelog.md'), generateChangelog(config));
  await writeFile(p('vibestate.md'), generateVibestate(config));

  // .claude/ files
  await writeFile(p('.claude/CLAUDE.md'), generateDotClaudeMd(config));
  await writeFile(p('.claude/settings.json'), generateSettingsJson(config));
  await writeFile(p('.claude/.tiller.json'), generateTillerManifest(config, TILLER_VERSION));

  // Hooks
  await writeFile(p('.claude/hooks/post-write.sh'), generatePostWriteHook(config));
  await writeFile(p('.claude/hooks/secret-scan.sh'), generateSecretScanHook(config));
  await writeFile(p('.claude/hooks/session-resume.sh'), generateSessionResumeHook(config));

  // Skills
  await writeFile(p('.claude/skills/setup/SKILL.md'), generateSetupSkill(config));
  await writeFile(p('.claude/skills/vibe/SKILL.md'), generateVibeSkill(config));
  await writeFile(p('.claude/skills/snapshot/SKILL.md'), generateSnapshotSkill(config));
  await writeFile(p('.claude/skills/recap/SKILL.md'), generateRecapSkill(config));
  await writeFile(p('.claude/skills/land/SKILL.md'), generateLandSkill(config));

  // Git
  if (!isGitRepo(targetDir)) {
    gitInit(targetDir);
  }
  gitAdd(targetDir);
  gitCommit(targetDir, 'chore: initial tiller scaffold');
}
