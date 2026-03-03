import { readFile } from 'node:fs/promises';
import { writeFile } from '../src/utils/fs.ts';
import { existsSync } from 'node:fs';
import { generateSailSkill } from '../src/scaffold/skills/sail.ts';
import { generateAnchorSkill } from '../src/scaffold/skills/anchor.ts';
import { generateRecapSkill } from '../src/scaffold/skills/recap.ts';
import { generateDockSkill } from '../src/scaffold/skills/dock.ts';
import { generateTechDebtSkill } from '../src/scaffold/skills/tech-debt.ts';
import { generateScoutSkill } from '../src/scaffold/skills/scout.ts';
import { generateCartographerAgent } from '../src/scaffold/agents/cartographer.ts';
import { generateQuartermasterAgent } from '../src/scaffold/agents/quartermaster.ts';
import { generateBosunAgent } from '../src/scaffold/agents/bosun.ts';
import { generateCaptainAgent } from '../src/scaffold/agents/captain.ts';
import type { ProjectConfig } from '../src/scaffold/types.ts';

// Read config from .tiller/tiller.json + .tiller/local.json
const manifest = JSON.parse(await readFile('.tiller/tiller.json', 'utf-8'));
const local = existsSync('.tiller/local.json')
  ? JSON.parse(await readFile('.tiller/local.json', 'utf-8'))
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
await writeFile('.claude/skills/tech-debt/SKILL.md', generateTechDebtSkill(config));
await writeFile('.claude/skills/scout/SKILL.md', generateScoutSkill(config));
await writeFile('.claude/agents/cartographer.md', generateCartographerAgent(config));
await writeFile('.claude/agents/quartermaster.md', generateQuartermasterAgent(config));
await writeFile('.claude/agents/bosun.md', generateBosunAgent(config));
await writeFile('.claude/agents/captain.md', generateCaptainAgent(config));

console.log(`Skills regenerated (mode: ${config.mode}, workflow: ${config.workflow})`);
