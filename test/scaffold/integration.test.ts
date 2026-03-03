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
    expect(content).toContain('@.claude/TILLER.md');
  });

  it('creates .claude/TILLER.md with Tiller rules', async () => {
    expect(await exists('.claude/TILLER.md')).toBe(true);
    const content = await read('.claude/TILLER.md');
    expect(content).toContain('Vibe loop');
  });

  it('creates .claude/settings.json with valid JSON', async () => {
    expect(await exists('.claude/settings.json')).toBe(true);
    const content = await read('.claude/settings.json');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('creates .claude/.tiller.json', async () => {
    expect(await exists('.claude/.tiller.json')).toBe(true);
    const content = JSON.parse(await read('.claude/.tiller.json'));
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

  it('.gitignore excludes .tiller.local.json', async () => {
    const content = await read('.gitignore');
    expect(content).toContain('.tiller.local.json');
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

  it('creates .claude/.tiller-tech-debt.json with correct defaults', async () => {
    expect(await exists('.claude/.tiller-tech-debt.json')).toBe(true);
    const content = JSON.parse(await read('.claude/.tiller-tech-debt.json'));
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

  it('creates compass.md with blank template', async () => {
    expect(await exists('compass.md')).toBe(true);
    const content = await read('compass.md');
    expect(content).toContain('compass.md');
    expect(content).toContain('(none — on main)');
    expect(content).toContain('Orientation');
    expect(content).toContain('Milestones');
  });

  it('.gitignore excludes compass.md', async () => {
    const content = await read('.gitignore');
    expect(content).toContain('compass.md');
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
    expect(content).toContain('.tiller.local.json');
    expect(content).toContain('# Tiller');
  });

  it('does not duplicate tiller entries when already present', async () => {
    const content = await readFile(join(dir, '.gitignore'), 'utf-8');
    const count = (str: string, sub: string) => str.split(sub).length - 1;
    expect(count(content, '.tiller.local.json')).toBe(1);
  });

  it('appends compass.md to existing .gitignore', async () => {
    const content = await readFile(join(dir, '.gitignore'), 'utf-8');
    expect(content).toContain('compass.md');
  });
});
