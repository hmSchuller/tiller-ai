import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm, readFile, access } from 'node:fs/promises';
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
  it('creates root CLAUDE.md', async () => {
    expect(await exists('CLAUDE.md')).toBe(true);
    const content = await read('CLAUDE.md');
    expect(content).toContain('# smoke-test');
  });

  it('creates .claude/CLAUDE.md', async () => {
    expect(await exists('.claude/CLAUDE.md')).toBe(true);
    const content = await read('.claude/CLAUDE.md');
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

  it('creates vibestate.md (local active-feature state)', async () => {
    expect(await exists('vibestate.md')).toBe(true);
    const content = await read('vibestate.md');
    expect(content).toContain('Active feature');
  });

  it('creates changelog.md (shared done log)', async () => {
    expect(await exists('changelog.md')).toBe(true);
    const content = await read('changelog.md');
    expect(content).toContain('smoke-test');
    expect(content).toContain('v0 — initial scaffold');
  });

  it('.gitignore excludes vibestate.md and .tiller.local.json', async () => {
    const content = await read('.gitignore');
    expect(content).toContain('vibestate.md');
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

  it('creates all skills including tech-debt', async () => {
    expect(await exists('.claude/skills/setup/SKILL.md')).toBe(true);
    expect(await exists('.claude/skills/vibe/SKILL.md')).toBe(true);
    expect(await exists('.claude/skills/snapshot/SKILL.md')).toBe(true);
    expect(await exists('.claude/skills/recap/SKILL.md')).toBe(true);
    expect(await exists('.claude/skills/land/SKILL.md')).toBe(true);
    expect(await exists('.claude/skills/tech-debt/SKILL.md')).toBe(true);
  });

  it('initializes a git repo with initial commit', async () => {
    expect(await exists('.git')).toBe(true);
  });
});
