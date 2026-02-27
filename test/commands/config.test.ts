import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateTillerManifest } from '../../src/scaffold/tiller-manifest.js';
import { generateRootClaudeMd } from '../../src/scaffold/claude-md.js';

vi.mock('@clack/prompts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@clack/prompts')>();
  return {
    ...actual,
    intro: vi.fn(),
    outro: vi.fn(),
    cancel: vi.fn(),
    spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
    select: vi.fn(),
    isCancel: vi.fn((val) => val === Symbol.for('clack/cancel')),
  };
});

const TILLER_VERSION = '0.1.0';

async function setupProject(
  tmpDir: string,
  opts: { mode?: 'simple' | 'detailed'; workflow?: 'solo' | 'team' } = {},
) {
  const mode = opts.mode ?? 'detailed';
  const workflow = opts.workflow ?? 'solo';
  await mkdir(join(tmpDir, '.claude'), { recursive: true });
  const config = { projectName: 'test-proj', description: 'desc', runCommand: 'npm test', mode, workflow };
  await writeFile(join(tmpDir, '.claude/.tiller.json'), generateTillerManifest(config, TILLER_VERSION), 'utf-8');
  await writeFile(join(tmpDir, 'CLAUDE.md'), generateRootClaudeMd(config), 'utf-8');
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
    expect(prompts.cancel).toHaveBeenCalledWith(expect.stringContaining('.tiller.json'));
  });

  it('writes mode and workflow to .tiller.local.json for local scope', async () => {
    await setupProject(tmpDir, { mode: 'detailed', workflow: 'solo' });

    const prompts = await import('@clack/prompts');
    vi.mocked(prompts.select)
      .mockResolvedValueOnce('simple')   // mode
      .mockResolvedValueOnce('team')     // workflow
      .mockResolvedValueOnce('local');   // scope

    const { configCommand } = await import('../../src/commands/config.js');
    await configCommand();

    const localPath = join(tmpDir, '.tiller.local.json');
    const content = JSON.parse(await readFile(localPath, 'utf-8'));
    expect(content.mode).toBe('simple');
    expect(content.workflow).toBe('team');
  });

  it('merges with existing .tiller.local.json on local scope', async () => {
    await setupProject(tmpDir);
    const localPath = join(tmpDir, '.tiller.local.json');
    await writeFile(localPath, JSON.stringify({ someOtherKey: true }, null, 2), 'utf-8');

    const prompts = await import('@clack/prompts');
    vi.mocked(prompts.select)
      .mockResolvedValueOnce('simple')
      .mockResolvedValueOnce('team')
      .mockResolvedValueOnce('local');

    const { configCommand } = await import('../../src/commands/config.js');
    await configCommand();

    const content = JSON.parse(await readFile(localPath, 'utf-8'));
    expect(content.mode).toBe('simple');
    expect(content.workflow).toBe('team');
    expect(content.someOtherKey).toBe(true); // existing key preserved
  });

  it('updates .tiller.json and CLAUDE.md for project scope', async () => {
    await setupProject(tmpDir, { mode: 'detailed', workflow: 'solo' });

    const prompts = await import('@clack/prompts');
    vi.mocked(prompts.select)
      .mockResolvedValueOnce('simple')
      .mockResolvedValueOnce('team')
      .mockResolvedValueOnce('project');

    const { configCommand } = await import('../../src/commands/config.js');
    await configCommand();

    const manifest = JSON.parse(await readFile(join(tmpDir, '.claude/.tiller.json'), 'utf-8'));
    expect(manifest.mode).toBe('simple');
    expect(manifest.workflow).toBe('team');

    const claudeMd = await readFile(join(tmpDir, 'CLAUDE.md'), 'utf-8');
    expect(claudeMd).toContain('simple');
    expect(claudeMd).toContain('team');
  });

  it('shows no-op message when local values already match', async () => {
    await setupProject(tmpDir);
    const localPath = join(tmpDir, '.tiller.local.json');
    await writeFile(localPath, JSON.stringify({ mode: 'simple', workflow: 'team' }, null, 2), 'utf-8');

    const prompts = await import('@clack/prompts');
    vi.mocked(prompts.select)
      .mockResolvedValueOnce('simple')
      .mockResolvedValueOnce('team')
      .mockResolvedValueOnce('local');

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

  it('exits on Ctrl+C at scope prompt', async () => {
    await setupProject(tmpDir);

    const prompts = await import('@clack/prompts');
    const cancelSymbol = Symbol.for('clack/cancel');
    vi.mocked(prompts.select)
      .mockResolvedValueOnce('simple')
      .mockResolvedValueOnce('team')
      .mockResolvedValueOnce(cancelSymbol as unknown as string);
    vi.mocked(prompts.isCancel).mockImplementation((val) => val === cancelSymbol);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);

    const { configCommand } = await import('../../src/commands/config.js');
    await expect(configCommand()).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
