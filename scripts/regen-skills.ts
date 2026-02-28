import { writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { generateSailSkill } from '../src/scaffold/skills/sail.ts';
import { generateAnchorSkill } from '../src/scaffold/skills/anchor.ts';
import { generateRecapSkill } from '../src/scaffold/skills/recap.ts';
import { generateDockSkill } from '../src/scaffold/skills/dock.ts';
import type { ProjectConfig } from '../src/scaffold/types.ts';

// Read config from .tiller.json + .tiller.local.json
const manifest = JSON.parse(await readFile('.claude/.tiller.json', 'utf-8'));
const local = existsSync('.tiller.local.json')
  ? JSON.parse(await readFile('.tiller.local.json', 'utf-8'))
  : {};

const config: ProjectConfig = {
  projectName: manifest.projectName ?? '',
  description: manifest.description ?? '',
  runCommand: manifest.runCommand ?? '',
  mode: local.mode ?? manifest.mode ?? 'detailed',
  workflow: local.workflow ?? manifest.workflow ?? 'solo',
};

await writeFile('.claude/skills/sail/SKILL.md', generateSailSkill(config));
await writeFile('.claude/skills/anchor/SKILL.md', generateAnchorSkill(config));
await writeFile('.claude/skills/recap/SKILL.md', generateRecapSkill(config));
await writeFile('.claude/skills/dock/SKILL.md', generateDockSkill(config));

console.log(`Skills regenerated (mode: ${config.mode}, workflow: ${config.workflow})`);
