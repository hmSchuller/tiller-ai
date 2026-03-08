import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm, readFile, access, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scaffold } from '../../src/scaffold/index.js';
import type { ProjectConfig } from '../../src/scaffold/types.js';

const config: ProjectConfig = {
  projectName: 'smoke-test',
  description: 'Integration test project',
  runCommand: 'echo ok',
  mode: 'simple',
  workflow: 'solo',
  tools: ['claude'],
};

const copilotConfig: ProjectConfig = {
  projectName: 'copilot-smoke-test',
  description: 'Integration test project for Copilot',
  runCommand: 'echo ok',
  mode: 'simple',
  workflow: 'solo',
  tools: ['copilot'],
};

let tmpDir: string;

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'tiller-integration-'));
  await scaffold(config, tmpDir);
});

afterAll(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

async function exists(rel: string): Promise<boolean> {
  try {
    await access(join(tmpDir, rel));
    return true;
  } catch {
    return false;
  }
}

async function read(rel: string): Promise<string> {
  return readFile(join(tmpDir, rel), 'utf-8');
}

describe('scaffold integration', () => {
  it('does not create root CLAUDE.md', async () => {
    expect(await exists('CLAUDE.md')).toBe(false);
  });

  it('creates .claude/CLAUDE.md with TILLER.md import', async () => {
    expect(await exists('.claude/CLAUDE.md')).toBe(true);
    const content = await read('.claude/CLAUDE.md');
    expect(content).toContain('@../.tiller/TILLER.md');
  });

  it('creates .tiller/TILLER.md with Tiller rules', async () => {
    expect(await exists('.tiller/TILLER.md')).toBe(true);
    const content = await read('.tiller/TILLER.md');
    expect(content).toContain('Vibe loop');
  });

  it('creates .claude/settings.json with valid JSON', async () => {
    expect(await exists('.claude/settings.json')).toBe(true);
    const content = await read('.claude/settings.json');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('creates .tiller/tiller.json', async () => {
    expect(await exists('.tiller/tiller.json')).toBe(true);
    const content = JSON.parse(await read('.tiller/tiller.json'));
    expect(content.mode).toBe('simple');
    expect(content.workflow).toBe('solo');
    expect(content.runCommand).toBe('echo ok');
  });

  it('creates changelog.md (shared done log)', async () => {
    expect(await exists('changelog.md')).toBe(true);
    const content = await read('changelog.md');
    expect(content).toContain('smoke-test');
    expect(content).toContain('v0 — initial scaffold');
  });

  it('.gitignore excludes .tiller/local.json', async () => {
    const content = await read('.gitignore');
    expect(content).toContain('.tiller/local.json');
  });

  it('.gitignore excludes .tiller/sessions/', async () => {
    const content = await read('.gitignore');
    expect(content).toContain('.tiller/sessions/');
  });

  it('creates .gitignore', async () => {
    expect(await exists('.gitignore')).toBe(true);
  });

  it('creates post-write.sh hook', async () => {
    expect(await exists('.claude/hooks/post-write.sh')).toBe(true);
  });

  it('creates secret-scan.sh hook', async () => {
    expect(await exists('.claude/hooks/secret-scan.sh')).toBe(true);
  });

  it('creates session-resume.sh hook', async () => {
    expect(await exists('.claude/hooks/session-resume.sh')).toBe(true);
  });

  it('creates plan-context.sh hook', async () => {
    expect(await exists('.claude/hooks/plan-context.sh')).toBe(true);
  });

  it('creates .tiller/tech-debt.json with correct defaults', async () => {
    expect(await exists('.tiller/tech-debt.json')).toBe(true);
    const content = JSON.parse(await read('.tiller/tech-debt.json'));
    expect(content.lastTechDebtAtFeature).toBe(0);
    expect(content.threshold).toBe(3);
  });

  it('creates all skills including tech-debt, scout, and repair-hull', async () => {
    expect(await exists('.claude/skills/setup/SKILL.md')).toBe(true);
    expect(await exists('.claude/skills/sail/SKILL.md')).toBe(true);
    expect(await exists('.claude/skills/anchor/SKILL.md')).toBe(true);
    expect(await exists('.claude/skills/recap/SKILL.md')).toBe(true);
    expect(await exists('.claude/skills/dock/SKILL.md')).toBe(true);
    expect(await exists('.claude/skills/tech-debt/SKILL.md')).toBe(true);
    expect(await exists('.claude/skills/scout/SKILL.md')).toBe(true);
    expect(await exists('.claude/skills/repair-hull/SKILL.md')).toBe(true);
    expect(await read('.claude/skills/repair-hull/SKILL.md')).toContain('repair-hull');
  });

  it('creates all agent files', async () => {
    expect(await exists('.claude/agents/quartermaster.md')).toBe(true);
    expect(await exists('.claude/agents/bosun.md')).toBe(true);
    expect(await exists('.claude/agents/captain.md')).toBe(true);
    expect(await exists('.claude/agents/cartographer.md')).toBe(true);
  });

  it('creates tech-backlog.md', async () => {
    expect(await exists('tech-backlog.md')).toBe(true);
    const content = await read('tech-backlog.md');
    expect(content).toContain('## Backlog');
    expect(content).toContain('## Done');
  });

  it('initializes a git repo with initial commit', async () => {
    expect(await exists('.git')).toBe(true);
  });

  it('creates .tiller/compass.md with blank template', async () => {
    expect(await exists('.tiller/compass.md')).toBe(true);
    const content = await read('.tiller/compass.md');
    expect(content).toContain('compass.md');
    expect(content).toContain('(none — on main)');
    expect(content).toContain('Orientation');
    expect(content).toContain('Milestones');
  });

  it('.gitignore excludes .tiller/compass.md', async () => {
    const content = await read('.gitignore');
    expect(content).toContain('.tiller/compass.md');
  });
});

describe('scaffold integration — existing .gitignore', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'tiller-existing-gitignore-'));
    // Write a pre-existing .gitignore with project-specific content
    await writeFile(join(dir, '.gitignore'), '# My project\nsecrets.txt\nbuild/\n', 'utf-8');
    await scaffold(config, dir);
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('preserves original .gitignore content', async () => {
    const content = await readFile(join(dir, '.gitignore'), 'utf-8');
    expect(content).toContain('# My project');
    expect(content).toContain('secrets.txt');
    expect(content).toContain('build/');
  });

  it('appends missing tiller entries under a # Tiller comment', async () => {
    const content = await readFile(join(dir, '.gitignore'), 'utf-8');
    expect(content).toContain('.tiller/local.json');
    expect(content).toContain('# Tiller');
  });

  it('does not duplicate tiller entries when already present', async () => {
    const content = await readFile(join(dir, '.gitignore'), 'utf-8');
    const count = (str: string, sub: string) => str.split(sub).length - 1;
    expect(count(content, '.tiller/local.json')).toBe(1);
  });

  it('appends .tiller/compass.md to existing .gitignore', async () => {
    const content = await readFile(join(dir, '.gitignore'), 'utf-8');
    expect(content).toContain('.tiller/compass.md');
  });
});

describe('scaffold integration — opencode only', () => {
  let dir: string;

  const openCodeConfig: ProjectConfig = {
    projectName: 'opencode-smoke-test',
    description: 'Integration test project for OpenCode',
    runCommand: 'echo ok',
    mode: 'simple',
    workflow: 'solo',
    tools: ['opencode'],
  };

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'tiller-opencode-'));
    await scaffold(openCodeConfig, dir);
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function ocExists(rel: string): Promise<boolean> {
    try {
      await access(join(dir, rel));
      return true;
    } catch {
      return false;
    }
  }

  it('creates AGENTS.md', async () => {
    expect(await ocExists('AGENTS.md')).toBe(true);
    const content = await readFile(join(dir, 'AGENTS.md'), 'utf-8');
    expect(content).toContain('Protocol enforcement');
  });

  it('creates opencode.json with valid JSON', async () => {
    expect(await ocExists('opencode.json')).toBe(true);
    const content = await readFile(join(dir, 'opencode.json'), 'utf-8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('creates all 4 agents in .opencode/agents/', async () => {
    for (const agent of ['quartermaster', 'bosun', 'captain', 'cartographer']) {
      expect(await ocExists(`.opencode/agents/${agent}.md`)).toBe(true);
    }
  });

  it('creates skills in .opencode/skills/ (no claude)', async () => {
    for (const skill of ['setup', 'sail', 'anchor', 'recap', 'dock', 'tech-debt', 'scout', 'repair-hull']) {
      expect(await ocExists(`.opencode/skills/${skill}/SKILL.md`)).toBe(true);
    }
  });

  it('does NOT create Claude-specific files', async () => {
    expect(await ocExists('.claude/settings.json')).toBe(false);
    expect(await ocExists('.claude/agents/quartermaster.md')).toBe(false);
  });

  it('does NOT create Copilot-specific files', async () => {
    expect(await ocExists('.github/copilot-instructions.md')).toBe(false);
    expect(await ocExists('.github/agents/quartermaster.agent.md')).toBe(false);
  });

  it('creates shared .tiller/ files', async () => {
    expect(await ocExists('.tiller/TILLER.md')).toBe(true);
    expect(await ocExists('.tiller/tiller.json')).toBe(true);
  });

  it('manifest lists opencode managed files', async () => {
    const manifest = JSON.parse(await readFile(join(dir, '.tiller/tiller.json'), 'utf-8'));
    expect(manifest.tools).toEqual(['opencode']);
    expect(manifest.managedFiles).toContain('AGENTS.md');
    expect(manifest.managedFiles).toContain('opencode.json');
    expect(manifest.managedFiles).toContain('.opencode/agents/quartermaster.md');
    expect(manifest.managedFiles).toContain('.opencode/skills/sail/SKILL.md');
  });
});

describe('scaffold integration — copilot only', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'tiller-copilot-'));
    await scaffold(copilotConfig, dir);
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function cpExists(rel: string): Promise<boolean> {
    try {
      await access(join(dir, rel));
      return true;
    } catch {
      return false;
    }
  }

  it('creates .github/copilot-instructions.md', async () => {
    expect(await cpExists('.github/copilot-instructions.md')).toBe(true);
  });

  it('creates all 8 skills in .github/skills/', async () => {
    for (const skill of ['setup', 'sail', 'anchor', 'recap', 'dock', 'tech-debt', 'scout', 'repair-hull']) {
      expect(await cpExists(`.github/skills/${skill}/SKILL.md`)).toBe(true);
    }
  });

  it('scaffolds the Copilot dock loop template', async () => {
    const content = await readFile(join(dir, '.github/skills/dock/SKILL.md'), 'utf-8');
    expect(content).toContain('After the dock completes successfully');
    expect(content).toContain('"Start new sail"');
    expect(content).toContain('"Finish"');
    expect(content).toContain('What should we work on next?');
    expect(content).toContain('Do NOT auto-run `/sail`');
    expect(content).not.toContain('Run `/clear` to reset context before starting your next feature, then `/sail` to continue.');
  });

  it('creates all 4 agents as .agent.md files', async () => {
    for (const agent of ['quartermaster', 'bosun', 'captain', 'cartographer']) {
      expect(await cpExists(`.github/agents/${agent}.agent.md`)).toBe(true);
    }
  });

  it('creates hooks.json', async () => {
    expect(await cpExists('.github/hooks/hooks.json')).toBe(true);
    const content = await readFile(join(dir, '.github/hooks/hooks.json'), 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed.version).toBe(1);
  });

  it('creates hook shell scripts', async () => {
    expect(await cpExists('.github/hooks/post-write.sh')).toBe(true);
    expect(await cpExists('.github/hooks/secret-scan.sh')).toBe(true);
    expect(await cpExists('.github/hooks/session-resume.sh')).toBe(true);
  });

  it('does NOT create Claude-specific files', async () => {
    expect(await cpExists('.claude/settings.json')).toBe(false);
    expect(await cpExists('.claude/hooks/post-write.sh')).toBe(false);
    expect(await cpExists('.claude/skills/sail/SKILL.md')).toBe(false);
    expect(await cpExists('.claude/agents/quartermaster.md')).toBe(false);
  });

  it('creates shared .tiller/ files', async () => {
    expect(await cpExists('.tiller/TILLER.md')).toBe(true);
    expect(await cpExists('.tiller/tiller.json')).toBe(true);
  });

  it('manifest lists copilot managed files', async () => {
    const manifest = JSON.parse(await readFile(join(dir, '.tiller/tiller.json'), 'utf-8'));
    expect(manifest.tools).toEqual(['copilot']);
    expect(manifest.managedFiles).toContain('.github/copilot-instructions.md');
    expect(manifest.managedFiles).toContain('.github/skills/sail/SKILL.md');
    expect(manifest.managedFiles).toContain('.github/agents/quartermaster.agent.md');
    expect(manifest.managedFiles).toContain('.github/hooks/hooks.json');
  });
});
