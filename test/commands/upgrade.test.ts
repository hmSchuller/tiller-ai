import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateTillerManifest, MANAGED_FILES } from '../../src/scaffold/tiller-manifest.js';

vi.mock('@clack/prompts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@clack/prompts')>();
  return {
    ...actual,
    intro: vi.fn(),
    outro: vi.fn(),
    cancel: vi.fn(),
    spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
    confirm: vi.fn(),
    isCancel: vi.fn((val) => val === Symbol.for('clack/cancel')),
  };
});

const TILLER_VERSION = '0.2.0';

async function setupProject(tmpDir: string) {
  await mkdir(join(tmpDir, '.claude', 'hooks'), { recursive: true });
  await mkdir(join(tmpDir, '.claude', 'skills', 'setup'), { recursive: true });
  await mkdir(join(tmpDir, '.claude', 'skills', 'sail'), { recursive: true });
  await mkdir(join(tmpDir, '.claude', 'skills', 'anchor'), { recursive: true });
  await mkdir(join(tmpDir, '.claude', 'skills', 'recap'), { recursive: true });
  await mkdir(join(tmpDir, '.claude', 'skills', 'dock'), { recursive: true });
  await mkdir(join(tmpDir, '.claude', 'skills', 'tech-debt'), { recursive: true });
  const config = { projectName: 'test-proj', description: 'desc', runCommand: 'npm test', mode: 'detailed' as const, workflow: 'solo' as const };
  await writeFile(join(tmpDir, '.claude', '.tiller.json'), generateTillerManifest(config, TILLER_VERSION), 'utf-8');
}

describe('upgradeCommand', () => {
  let tmpDir: string;
  let originalCwd: () => string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'tiller-upgrade-test-'));
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

  it('exits with error if no .tiller.json found', async () => {
    const prompts = await import('@clack/prompts');
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);

    const { upgradeCommand } = await import('../../src/commands/upgrade.js');

    await expect(upgradeCommand()).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(prompts.cancel).toHaveBeenCalledWith(expect.stringContaining('.tiller.json'));
  });

  it('--yes skips confirmation and writes managed files', async () => {
    await setupProject(tmpDir);

    const { upgradeCommand } = await import('../../src/commands/upgrade.js');
    const prompts = await import('@clack/prompts');

    await upgradeCommand({ yes: true });

    expect(prompts.confirm).not.toHaveBeenCalled();

    const manifest = JSON.parse(await readFile(join(tmpDir, '.claude', '.tiller.json'), 'utf-8'));
    expect(manifest.version).toBe(TILLER_VERSION);
  });

  it('--yes preserves mode and workflow from existing manifest', async () => {
    await setupProject(tmpDir);

    const { upgradeCommand } = await import('../../src/commands/upgrade.js');

    await upgradeCommand({ yes: true });

    const manifest = JSON.parse(await readFile(join(tmpDir, '.claude', '.tiller.json'), 'utf-8'));
    expect(manifest.mode).toBe('detailed');
    expect(manifest.workflow).toBe('solo');
  });

  it('without --yes, shows confirmation prompt', async () => {
    await setupProject(tmpDir);

    const prompts = await import('@clack/prompts');
    vi.mocked(prompts.confirm).mockResolvedValueOnce(true);

    const { upgradeCommand } = await import('../../src/commands/upgrade.js');
    await upgradeCommand();

    expect(prompts.confirm).toHaveBeenCalledOnce();
  });

  it('without --yes, cancels when user declines', async () => {
    await setupProject(tmpDir);

    const prompts = await import('@clack/prompts');
    vi.mocked(prompts.confirm).mockResolvedValueOnce(false);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);

    const { upgradeCommand } = await import('../../src/commands/upgrade.js');
    await expect(upgradeCommand()).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('without --yes, cancels on Ctrl+C', async () => {
    await setupProject(tmpDir);

    const prompts = await import('@clack/prompts');
    const cancelSymbol = Symbol.for('clack/cancel');
    vi.mocked(prompts.confirm).mockResolvedValueOnce(cancelSymbol as unknown as boolean);
    vi.mocked(prompts.isCancel).mockImplementation((val) => val === cancelSymbol);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);

    const { upgradeCommand } = await import('../../src/commands/upgrade.js');
    await expect(upgradeCommand()).rejects.toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  describe('stale file removal', () => {
    it('deletes files that were managed before but are no longer managed', async () => {
      await setupProject(tmpDir);

      // Inject a stale managed file into the old manifest
      const staleFile = '.claude/skills/old-skill/SKILL.md';
      await mkdir(join(tmpDir, '.claude', 'skills', 'old-skill'), { recursive: true });
      await writeFile(join(tmpDir, staleFile), 'old content', 'utf-8');

      // Overwrite manifest to include the stale file
      const oldManifest = {
        version: '0.1.0',
        mode: 'detailed',
        workflow: 'solo',
        runCommand: 'npm test',
        managedFiles: [...MANAGED_FILES, staleFile],
      };
      await writeFile(join(tmpDir, '.claude', '.tiller.json'), JSON.stringify(oldManifest, null, 2), 'utf-8');

      const { upgradeCommand } = await import('../../src/commands/upgrade.js');
      await upgradeCommand({ yes: true });

      await expect(stat(join(tmpDir, staleFile))).rejects.toThrow();
    });

    it('silently skips stale files that do not exist on disk', async () => {
      await setupProject(tmpDir);

      // Manifest references a stale file that was never created
      const oldManifest = {
        version: '0.1.0',
        mode: 'detailed',
        workflow: 'solo',
        runCommand: 'npm test',
        managedFiles: [...MANAGED_FILES, '.claude/skills/ghost/SKILL.md'],
      };
      await writeFile(join(tmpDir, '.claude', '.tiller.json'), JSON.stringify(oldManifest, null, 2), 'utf-8');

      const { upgradeCommand } = await import('../../src/commands/upgrade.js');
      // Should not throw
      await expect(upgradeCommand({ yes: true })).resolves.toBeUndefined();
    });

    it('does not remove current managed files from the manifest', async () => {
      await setupProject(tmpDir);

      const { upgradeCommand } = await import('../../src/commands/upgrade.js');
      await upgradeCommand({ yes: true });

      // Current managed files should still be listed in the updated manifest
      const manifest = JSON.parse(await readFile(join(tmpDir, '.claude', '.tiller.json'), 'utf-8'));
      expect(manifest.managedFiles).toContain('.claude/CLAUDE.md');
    });
  });
});
