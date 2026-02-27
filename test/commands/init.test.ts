import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

vi.mock('@clack/prompts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@clack/prompts')>();
  return {
    ...actual,
    intro: vi.fn(),
    outro: vi.fn(),
    spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
    select: vi.fn(),
    isCancel: vi.fn((val) => val === Symbol.for('clack/cancel')),
  };
});

vi.mock('../../src/scaffold/index.js', () => ({
  scaffold: vi.fn().mockResolvedValue(undefined),
}));

describe('initCommand', () => {
  let tmpDir: string;
  let originalCwd: () => string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'tiller-init-test-'));
    originalCwd = process.cwd;
    process.cwd = () => tmpDir;
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(async () => {
    process.cwd = originalCwd;
    vi.restoreAllMocks();
    vi.resetModules();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('calls scaffold with selected mode and workflow', async () => {
    const prompts = await import('@clack/prompts');
    vi.mocked(prompts.select)
      .mockResolvedValueOnce('detailed')
      .mockResolvedValueOnce('team');

    const { scaffold } = await import('../../src/scaffold/index.js');
    const { initCommand } = await import('../../src/commands/init.js');

    await initCommand();

    expect(scaffold).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'detailed', workflow: 'team' }),
      expect.any(String),
    );
  });

  it('calls scaffold with simple/solo defaults when selected', async () => {
    const prompts = await import('@clack/prompts');
    vi.mocked(prompts.select)
      .mockResolvedValueOnce('simple')
      .mockResolvedValueOnce('solo');

    const { scaffold } = await import('../../src/scaffold/index.js');
    const { initCommand } = await import('../../src/commands/init.js');

    await initCommand();

    expect(scaffold).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'simple', workflow: 'solo' }),
      expect.any(String),
    );
  });

  it('exits when user cancels mode selection', async () => {
    const prompts = await import('@clack/prompts');
    const cancelSymbol = Symbol.for('clack/cancel');
    vi.mocked(prompts.select).mockResolvedValueOnce(cancelSymbol as unknown as string);
    vi.mocked(prompts.isCancel).mockImplementation((val) => val === cancelSymbol);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);

    const { initCommand } = await import('../../src/commands/init.js');

    await expect(initCommand()).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('exits when user cancels workflow selection', async () => {
    const prompts = await import('@clack/prompts');
    const cancelSymbol = Symbol.for('clack/cancel');
    vi.mocked(prompts.select)
      .mockResolvedValueOnce('simple')
      .mockResolvedValueOnce(cancelSymbol as unknown as string);
    vi.mocked(prompts.isCancel).mockImplementation((val) => val === cancelSymbol);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);

    const { initCommand } = await import('../../src/commands/init.js');

    await expect(initCommand()).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
