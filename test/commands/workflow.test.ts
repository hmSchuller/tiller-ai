import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateTillerManifest } from '../../src/scaffold/tiller-manifest.js';
import { generateRootClaudeMd } from '../../src/scaffold/claude-md.js';

// We test the command by setting up a real tmp dir, patching process.cwd(),
// and calling workflowCommand directly.

const TILLER_VERSION = '0.1.0';

async function setupProject(tmpDir: string, workflow: 'solo' | 'team' = 'solo', mode: 'simple' | 'detailed' = 'detailed') {
  await mkdir(join(tmpDir, '.claude'), { recursive: true });
  const config = { projectName: 'test-proj', description: 'desc', runCommand: 'npm test', mode, workflow };
  await writeFile(join(tmpDir, '.claude/.tiller.json'), generateTillerManifest(config, TILLER_VERSION), 'utf-8');
  await writeFile(join(tmpDir, 'CLAUDE.md'), generateRootClaudeMd(config), 'utf-8');
}

describe('workflowCommand', () => {
  let tmpDir: string;
  let originalCwd: () => string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'tiller-workflow-test-'));
    originalCwd = process.cwd;
    process.cwd = () => tmpDir;

    // Suppress @clack/prompts output in tests
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(async () => {
    process.cwd = originalCwd;
    vi.restoreAllMocks();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('rejects invalid workflow values', async () => {
    await setupProject(tmpDir);
    const { workflowCommand } = await import('../../src/commands/workflow.js');

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);

    await expect(workflowCommand('invalid', {})).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits with error if no .tiller.json found', async () => {
    const { workflowCommand } = await import('../../src/commands/workflow.js');

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);

    await expect(workflowCommand('team', {})).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('writes workflow to .tiller.local.json for local scope', async () => {
    await setupProject(tmpDir, 'solo');
    const { workflowCommand } = await import('../../src/commands/workflow.js');

    await workflowCommand('team', {});

    const localPath = join(tmpDir, '.tiller.local.json');
    const content = JSON.parse(await readFile(localPath, 'utf-8'));
    expect(content.workflow).toBe('team');
  });

  it('merges with existing .tiller.local.json on local scope', async () => {
    await setupProject(tmpDir, 'solo');
    const localPath = join(tmpDir, '.tiller.local.json');
    await writeFile(localPath, JSON.stringify({ mode: 'simple' }, null, 2), 'utf-8');

    const { workflowCommand } = await import('../../src/commands/workflow.js');
    await workflowCommand('team', {});

    const content = JSON.parse(await readFile(localPath, 'utf-8'));
    expect(content.workflow).toBe('team');
    expect(content.mode).toBe('simple'); // existing key preserved
  });

  it('is idempotent for local scope (already the requested workflow)', async () => {
    await setupProject(tmpDir, 'solo');
    const localPath = join(tmpDir, '.tiller.local.json');
    await writeFile(localPath, JSON.stringify({ workflow: 'team' }, null, 2), 'utf-8');

    const { workflowCommand } = await import('../../src/commands/workflow.js');
    // Should not throw and should not change the file
    await workflowCommand('team', {});

    const content = JSON.parse(await readFile(localPath, 'utf-8'));
    expect(content.workflow).toBe('team');
  });

  it('updates CLAUDE.md and .tiller.json for project scope', async () => {
    await setupProject(tmpDir, 'solo');
    const { workflowCommand } = await import('../../src/commands/workflow.js');

    await workflowCommand('team', { project: true });

    const manifest = JSON.parse(await readFile(join(tmpDir, '.claude/.tiller.json'), 'utf-8'));
    expect(manifest.workflow).toBe('team');

    const claudeMd = await readFile(join(tmpDir, 'CLAUDE.md'), 'utf-8');
    expect(claudeMd).toContain('team');
  });

  it('is idempotent for project scope (already the requested workflow)', async () => {
    await setupProject(tmpDir, 'team');
    const { workflowCommand } = await import('../../src/commands/workflow.js');

    // Should not throw — already on team
    await workflowCommand('team', { project: true });

    const manifest = JSON.parse(await readFile(join(tmpDir, '.claude/.tiller.json'), 'utf-8'));
    expect(manifest.workflow).toBe('team');
  });
});
