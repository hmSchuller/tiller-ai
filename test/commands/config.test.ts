import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateTillerManifest, TILLER_VERSION } from '../../src/scaffold/tiller-manifest.js';

vi.mock('@clack/prompts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@clack/prompts')>();
  return {
    ...actual,
    intro: vi.fn(),
    outro: vi.fn(),
    cancel: vi.fn(),
    spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
    select: vi.fn(),
    multiselect: vi.fn(),
    isCancel: vi.fn((val) => val === Symbol.for('clack/cancel')),
  };
});

import type { ToolTarget } from '../../src/scaffold/types.js';
import { existsSync } from 'node:fs';
import { getManagedFiles } from '../../src/scaffold/tiller-manifest.js';

async function setupProject(
  tmpDir: string,
  opts: { mode?: 'simple' | 'detailed'; workflow?: 'solo' | 'team'; tools?: ToolTarget[] } = {},
) {
  const mode = opts.mode ?? 'detailed';
  const workflow = opts.workflow ?? 'solo';
  const tools = opts.tools ?? ['claude'];
  await mkdir(join(tmpDir, '.tiller'), { recursive: true });
  const config = { projectName: 'test-proj', description: 'desc', runCommand: 'npm test', mode, workflow, tools };
  await writeFile(join(tmpDir, '.tiller/tiller.json'), generateTillerManifest(config, TILLER_VERSION), 'utf-8');
}

describe('configCommand', () => {
  let tmpDir: string;
  let originalCwd: () => string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'tiller-config-test-'));
    originalCwd = process.cwd;
    process.cwd = () => tmpDir;
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.resetModules();
    process.cwd = originalCwd;
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('exits with error if no .tiller.json found', async () => {
    const prompts = await import('@clack/prompts');
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);

    const { configCommand } = await import('../../src/commands/config.js');

    await expect(configCommand()).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(prompts.cancel).toHaveBeenCalledWith(expect.stringContaining('.tiller/tiller.json'));
  });

  it('writes mode and workflow to .tiller/local.json for local scope', async () => {
    await setupProject(tmpDir, { mode: 'detailed', workflow: 'solo' });

    const prompts = await import('@clack/prompts');
    vi.mocked(prompts.select)
      .mockResolvedValueOnce('simple')   // mode
      .mockResolvedValueOnce('team')     // workflow
      .mockResolvedValueOnce('local');   // scope
    vi.mocked(prompts.multiselect).mockResolvedValueOnce(['claude']);

    const { configCommand } = await import('../../src/commands/config.js');
    await configCommand();

    const localPath = join(tmpDir, '.tiller/local.json');
    const content = JSON.parse(await readFile(localPath, 'utf-8'));
    expect(content.mode).toBe('simple');
    expect(content.workflow).toBe('team');
  });

  it('merges with existing .tiller/local.json on local scope', async () => {
    await setupProject(tmpDir);
    const localPath = join(tmpDir, '.tiller/local.json');
    await writeFile(localPath, JSON.stringify({ someOtherKey: true }, null, 2), 'utf-8');

    const prompts = await import('@clack/prompts');
    vi.mocked(prompts.select)
      .mockResolvedValueOnce('simple')
      .mockResolvedValueOnce('team')
      .mockResolvedValueOnce('local');
    vi.mocked(prompts.multiselect).mockResolvedValueOnce(['claude']);

    const { configCommand } = await import('../../src/commands/config.js');
    await configCommand();

    const content = JSON.parse(await readFile(localPath, 'utf-8'));
    expect(content.mode).toBe('simple');
    expect(content.workflow).toBe('team');
    expect(content.someOtherKey).toBe(true); // existing key preserved
  });

  it('updates .tiller.json for project scope (not CLAUDE.md)', async () => {
    await setupProject(tmpDir, { mode: 'detailed', workflow: 'solo' });

    const prompts = await import('@clack/prompts');
    vi.mocked(prompts.select)
      .mockResolvedValueOnce('simple')
      .mockResolvedValueOnce('team')
      .mockResolvedValueOnce('project');
    vi.mocked(prompts.multiselect).mockResolvedValueOnce(['claude']);

    const { configCommand } = await import('../../src/commands/config.js');
    await configCommand();

    const manifest = JSON.parse(await readFile(join(tmpDir, '.tiller/tiller.json'), 'utf-8'));
    expect(manifest.mode).toBe('simple');
    expect(manifest.workflow).toBe('team');
  });

  it('shows no-op message when local values already match', async () => {
    await setupProject(tmpDir);
    const localPath = join(tmpDir, '.tiller/local.json');
    await writeFile(localPath, JSON.stringify({ mode: 'simple', workflow: 'team', tools: ['claude'] }, null, 2), 'utf-8');

    const prompts = await import('@clack/prompts');
    vi.mocked(prompts.select)
      .mockResolvedValueOnce('simple')
      .mockResolvedValueOnce('team')
      .mockResolvedValueOnce('local');
    vi.mocked(prompts.multiselect).mockResolvedValueOnce(['claude']);

    const { configCommand } = await import('../../src/commands/config.js');
    await configCommand();

    expect(prompts.outro).toHaveBeenCalledWith(expect.stringContaining('No changes'));
  });

  it('shows no-op message when project values already match', async () => {
    await setupProject(tmpDir, { mode: 'simple', workflow: 'team' });

    const prompts = await import('@clack/prompts');
    vi.mocked(prompts.select)
      .mockResolvedValueOnce('simple')
      .mockResolvedValueOnce('team')
      .mockResolvedValueOnce('project');
    vi.mocked(prompts.multiselect).mockResolvedValueOnce(['claude']);

    const { configCommand } = await import('../../src/commands/config.js');
    await configCommand();

    expect(prompts.outro).toHaveBeenCalledWith(expect.stringContaining('No changes'));
  });

  it('exits on Ctrl+C at mode prompt', async () => {
    await setupProject(tmpDir);

    const prompts = await import('@clack/prompts');
    const cancelSymbol = Symbol.for('clack/cancel');
    vi.mocked(prompts.select).mockResolvedValueOnce(cancelSymbol as unknown as string);
    vi.mocked(prompts.isCancel).mockImplementation((val) => val === cancelSymbol);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);

    const { configCommand } = await import('../../src/commands/config.js');
    await expect(configCommand()).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('exits on Ctrl+C at workflow prompt', async () => {
    await setupProject(tmpDir);

    const prompts = await import('@clack/prompts');
    const cancelSymbol = Symbol.for('clack/cancel');
    vi.mocked(prompts.select)
      .mockResolvedValueOnce('simple')
      .mockResolvedValueOnce(cancelSymbol as unknown as string);
    vi.mocked(prompts.isCancel).mockImplementation((val) => val === cancelSymbol);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);

    const { configCommand } = await import('../../src/commands/config.js');
    await expect(configCommand()).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('exits on Ctrl+C at tools prompt', async () => {
    await setupProject(tmpDir);

    const prompts = await import('@clack/prompts');
    const cancelSymbol = Symbol.for('clack/cancel');
    vi.mocked(prompts.select)
      .mockResolvedValueOnce('simple')
      .mockResolvedValueOnce('team');
    vi.mocked(prompts.multiselect).mockResolvedValueOnce(cancelSymbol as unknown as string[]);
    vi.mocked(prompts.isCancel).mockImplementation((val) => val === cancelSymbol);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);

    const { configCommand } = await import('../../src/commands/config.js');
    await expect(configCommand()).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('exits on Ctrl+C at scope prompt', async () => {
    await setupProject(tmpDir);

    const prompts = await import('@clack/prompts');
    const cancelSymbol = Symbol.for('clack/cancel');
    vi.mocked(prompts.select)
      .mockResolvedValueOnce('simple')
      .mockResolvedValueOnce('team')
      .mockResolvedValueOnce(cancelSymbol as unknown as string);
    vi.mocked(prompts.multiselect).mockResolvedValueOnce(['claude']);
    vi.mocked(prompts.isCancel).mockImplementation((val) => val === cancelSymbol);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);

    const { configCommand } = await import('../../src/commands/config.js');
    await expect(configCommand()).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('saves tools to local.json without modifying tiller.json', async () => {
    await setupProject(tmpDir);

    const prompts = await import('@clack/prompts');
    vi.mocked(prompts.select)
      .mockResolvedValueOnce('detailed')
      .mockResolvedValueOnce('solo')
      .mockResolvedValueOnce('local');
    vi.mocked(prompts.multiselect).mockResolvedValueOnce(['claude', 'copilot']);

    const { configCommand } = await import('../../src/commands/config.js');
    await configCommand();

    const localPath = join(tmpDir, '.tiller/local.json');
    const content = JSON.parse(await readFile(localPath, 'utf-8'));
    expect(content.tools).toEqual(['claude', 'copilot']);

    // tiller.json should NOT have been modified — tools stay as project default
    const manifest = JSON.parse(await readFile(join(tmpDir, '.tiller/tiller.json'), 'utf-8'));
    expect(manifest.tools).toEqual(['claude']);
  });

  it('saves tools to tiller.json for project scope', async () => {
    await setupProject(tmpDir);

    const prompts = await import('@clack/prompts');
    vi.mocked(prompts.select)
      .mockResolvedValueOnce('detailed')
      .mockResolvedValueOnce('solo')
      .mockResolvedValueOnce('project');
    vi.mocked(prompts.multiselect).mockResolvedValueOnce(['claude', 'opencode']);

    const { configCommand } = await import('../../src/commands/config.js');
    await configCommand();

    const manifest = JSON.parse(await readFile(join(tmpDir, '.tiller/tiller.json'), 'utf-8'));
    expect(manifest.tools).toEqual(['claude', 'opencode']);
  });

  it('regenerates files when tools change (project scope)', async () => {
    await setupProject(tmpDir);

    const prompts = await import('@clack/prompts');
    vi.mocked(prompts.select)
      .mockResolvedValueOnce('detailed')
      .mockResolvedValueOnce('solo')
      .mockResolvedValueOnce('project');
    vi.mocked(prompts.multiselect).mockResolvedValueOnce(['claude', 'copilot']);

    const { configCommand } = await import('../../src/commands/config.js');
    await configCommand();

    // Copilot files should now exist
    expect(existsSync(join(tmpDir, '.github/copilot-instructions.md'))).toBe(true);
    // Claude files should still exist
    expect(existsSync(join(tmpDir, '.claude/settings.json'))).toBe(true);
  });

  it('deletes stale files when tool is removed (project scope)', async () => {
    // Start with claude + copilot
    await setupProject(tmpDir, { tools: ['claude', 'copilot'] });
    // Write a copilot file so we can check it gets deleted
    await mkdir(join(tmpDir, '.github'), { recursive: true });
    await writeFile(join(tmpDir, '.github/copilot-instructions.md'), 'test', 'utf-8');

    const prompts = await import('@clack/prompts');
    vi.mocked(prompts.select)
      .mockResolvedValueOnce('detailed')
      .mockResolvedValueOnce('solo')
      .mockResolvedValueOnce('project');
    vi.mocked(prompts.multiselect).mockResolvedValueOnce(['claude']); // remove copilot

    const { configCommand } = await import('../../src/commands/config.js');
    await configCommand();

    // Copilot file should be deleted
    expect(existsSync(join(tmpDir, '.github/copilot-instructions.md'))).toBe(false);
  });
});
