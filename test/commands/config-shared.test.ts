import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateTillerManifest, TILLER_VERSION, type TillerManifest } from '../../src/scaffold/tiller-manifest.js';
import type { ToolTarget } from '../../src/scaffold/types.js';
import {
  readConfig,
  getEffectiveConfig,
  isProjectNoOp,
  isLocalNoOp,
  hasManagedToolsChanged,
  arraysEqual,
  saveProjectConfig,
  saveLocalConfig,
} from '../../src/commands/config-shared.js';

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

function makeManifest(overrides: Partial<TillerManifest> = {}): TillerManifest {
  return {
    version: TILLER_VERSION,
    mode: 'detailed',
    workflow: 'solo',
    runCommand: 'npm test',
    tools: ['claude'],
    managedFiles: [],
    ...overrides,
  };
}

describe('readConfig', () => {
  let tmpDir: string;
  let originalCwd: () => string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'tiller-config-shared-test-'));
    originalCwd = process.cwd;
    process.cwd = () => tmpDir;
  });

  afterEach(async () => {
    process.cwd = originalCwd;
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('returns { ok: false, reason: "missing" } when no tiller.json', async () => {
    const result = await readConfig(tmpDir);
    expect(result).toMatchObject({
      ok: false,
      operation: 'read',
      scope: 'project',
      reason: 'missing',
    });
  });

  it('returns { ok: false, reason: "read-failed" } when tiller.json exists but cannot be read', async () => {
    await mkdir(join(tmpDir, '.tiller/tiller.json'), { recursive: true });

    const result = await readConfig(tmpDir);
    expect(result).toMatchObject({
      ok: false,
      operation: 'read',
      scope: 'project',
      reason: 'read-failed',
    });
    if (!result.ok && result.reason === 'read-failed') {
      expect(result.cause).toBeDefined();
    }
  });

  it('returns { ok: false, reason: "parse-error" } when tiller.json is invalid JSON', async () => {
    await mkdir(join(tmpDir, '.tiller'), { recursive: true });
    await writeFile(join(tmpDir, '.tiller/tiller.json'), 'not json', 'utf-8');

    const result = await readConfig(tmpDir);
    expect(result).toMatchObject({
      ok: false,
      operation: 'read',
      scope: 'project',
      reason: 'parse-error',
    });
    if (!result.ok && result.reason === 'parse-error') {
      expect(result.cause).toBeDefined();
    }
  });

  it('returns manifest and empty local when no local.json', async () => {
    await setupProject(tmpDir, { mode: 'simple', workflow: 'team' });

    const result = await readConfig(tmpDir);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.manifest.mode).toBe('simple');
      expect(result.manifest.workflow).toBe('team');
      expect(result.local).toEqual({});
    }
  });

  it('returns parsed local.json when present', async () => {
    await setupProject(tmpDir);
    await writeFile(join(tmpDir, '.tiller/local.json'), JSON.stringify({ mode: 'simple', someKey: 42 }), 'utf-8');

    const result = await readConfig(tmpDir);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.local).toMatchObject({ mode: 'simple', someKey: 42 });
    }
  });

  it('reports invalid local.json and returns empty local defaults', async () => {
    await setupProject(tmpDir);
    await writeFile(join(tmpDir, '.tiller/local.json'), 'bad json {{{', 'utf-8');

    const result = await readConfig(tmpDir);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.local).toEqual({});
      expect(result.localIssue).toMatchObject({
        operation: 'read',
        scope: 'local',
        reason: 'parse-error',
      });
    }
  });

  it('reports unreadable local.json and returns empty local defaults', async () => {
    await setupProject(tmpDir);
    await mkdir(join(tmpDir, '.tiller/local.json'), { recursive: true });

    const result = await readConfig(tmpDir);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.local).toEqual({});
      expect(result.localIssue).toMatchObject({
        operation: 'read',
        scope: 'local',
        reason: 'read-failed',
      });
    }
  });
});

describe('getEffectiveConfig', () => {
  it('returns manifest values when local is empty', () => {
    const manifest = makeManifest({ mode: 'simple', workflow: 'team', tools: ['copilot'] });
    const eff = getEffectiveConfig(manifest, {});
    expect(eff.mode).toBe('simple');
    expect(eff.workflow).toBe('team');
    expect(eff.tools).toEqual(['copilot']);
  });

  it('local values override manifest values', () => {
    const manifest = makeManifest({ mode: 'detailed', workflow: 'solo', tools: ['claude'] });
    const local = { mode: 'simple', workflow: 'team', tools: ['claude', 'copilot'] };
    const eff = getEffectiveConfig(manifest, local);
    expect(eff.mode).toBe('simple');
    expect(eff.workflow).toBe('team');
    expect(eff.tools).toEqual(['claude', 'copilot']);
  });

  it('partial local override: only mode overridden', () => {
    const manifest = makeManifest({ mode: 'detailed', workflow: 'team', tools: ['opencode'] });
    const eff = getEffectiveConfig(manifest, { mode: 'simple' });
    expect(eff.mode).toBe('simple');
    expect(eff.workflow).toBe('team');
    expect(eff.tools).toEqual(['opencode']);
  });

  it('falls back to defaults when manifest has no values', () => {
    const manifest = makeManifest({ mode: undefined, workflow: undefined, tools: undefined });
    const eff = getEffectiveConfig(manifest, {});
    expect(eff.mode).toBe('detailed');
    expect(eff.workflow).toBe('solo');
    expect(eff.tools).toEqual(['claude']);
  });
});

describe('arraysEqual', () => {
  it('returns true for same elements regardless of order', () => {
    expect(arraysEqual(['b', 'a'], ['a', 'b'])).toBe(true);
  });

  it('returns false for different elements', () => {
    expect(arraysEqual(['a', 'b'], ['a', 'c'])).toBe(false);
  });

  it('returns false for different lengths', () => {
    expect(arraysEqual(['a'], ['a', 'b'])).toBe(false);
  });

  it('returns true for empty arrays', () => {
    expect(arraysEqual([], [])).toBe(true);
  });
});

describe('isProjectNoOp', () => {
  it('returns true when all values match manifest', () => {
    const manifest = makeManifest({ mode: 'simple', workflow: 'team', tools: ['claude'] });
    expect(isProjectNoOp(manifest, 'simple', 'team', ['claude'])).toBe(true);
  });

  it('returns false when mode differs', () => {
    const manifest = makeManifest({ mode: 'detailed', workflow: 'solo', tools: ['claude'] });
    expect(isProjectNoOp(manifest, 'simple', 'solo', ['claude'])).toBe(false);
  });

  it('returns false when workflow differs', () => {
    const manifest = makeManifest({ mode: 'simple', workflow: 'solo', tools: ['claude'] });
    expect(isProjectNoOp(manifest, 'simple', 'team', ['claude'])).toBe(false);
  });

  it('returns false when tools differ', () => {
    const manifest = makeManifest({ mode: 'simple', workflow: 'solo', tools: ['claude'] });
    expect(isProjectNoOp(manifest, 'simple', 'solo', ['claude', 'copilot'])).toBe(false);
  });

  it('uses "solo" default for manifest.workflow when undefined', () => {
    const manifest = makeManifest({ mode: 'simple', workflow: undefined, tools: ['claude'] });
    expect(isProjectNoOp(manifest, 'simple', 'solo', ['claude'])).toBe(true);
  });
});

describe('isLocalNoOp', () => {
  it('returns true when local mode/workflow/tools all match', () => {
    const local = { mode: 'simple', workflow: 'team', tools: ['claude', 'copilot'] };
    expect(isLocalNoOp(local, 'simple', 'team', ['copilot', 'claude'])).toBe(true);
  });

  it('returns false when local.tools is undefined', () => {
    const local = { mode: 'simple', workflow: 'team' };
    expect(isLocalNoOp(local, 'simple', 'team', ['claude'])).toBe(false);
  });

  it('returns false when mode does not match', () => {
    const local = { mode: 'detailed', workflow: 'solo', tools: ['claude'] };
    expect(isLocalNoOp(local, 'simple', 'solo', ['claude'])).toBe(false);
  });

  it('returns false when workflow does not match', () => {
    const local = { mode: 'simple', workflow: 'solo', tools: ['claude'] };
    expect(isLocalNoOp(local, 'simple', 'team', ['claude'])).toBe(false);
  });

  it('returns false when tools differ', () => {
    const local = { mode: 'simple', workflow: 'solo', tools: ['claude'] };
    expect(isLocalNoOp(local, 'simple', 'solo', ['claude', 'copilot'])).toBe(false);
  });

  it('returns false when local is empty', () => {
    expect(isLocalNoOp({}, 'simple', 'solo', ['claude'])).toBe(false);
  });
});

describe('hasManagedToolsChanged', () => {
  it('returns false when tools are the same', () => {
    const manifest = makeManifest({ tools: ['claude', 'copilot'] });
    expect(hasManagedToolsChanged(manifest, ['copilot', 'claude'])).toBe(false);
  });

  it('returns true when a tool is added', () => {
    const manifest = makeManifest({ tools: ['claude'] });
    expect(hasManagedToolsChanged(manifest, ['claude', 'copilot'])).toBe(true);
  });

  it('returns true when a tool is removed', () => {
    const manifest = makeManifest({ tools: ['claude', 'copilot'] });
    expect(hasManagedToolsChanged(manifest, ['claude'])).toBe(true);
  });

  it('falls back to ["claude"] when manifest.tools is undefined', () => {
    const manifest = makeManifest({ tools: undefined });
    expect(hasManagedToolsChanged(manifest, ['claude'])).toBe(false);
    expect(hasManagedToolsChanged(manifest, ['copilot'])).toBe(true);
  });
});

describe('saveProjectConfig', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'tiller-save-project-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('writes updated manifest when tools are unchanged', async () => {
    await setupProject(tmpDir, { mode: 'detailed', workflow: 'solo', tools: ['claude'] });
    const manifest = makeManifest({ mode: 'detailed', workflow: 'solo', tools: ['claude'], managedFiles: [] });

    const result = await saveProjectConfig(manifest, 'simple', 'team', ['claude'], tmpDir);
    expect(result.ok).toBe(true);

    const raw = JSON.parse(await readFile(join(tmpDir, '.tiller/tiller.json'), 'utf-8'));
    expect(raw.mode).toBe('simple');
    expect(raw.workflow).toBe('team');
    expect(raw.tools).toEqual(['claude']);
  });

  it('regenerates files when tools change (adds copilot)', async () => {
    await setupProject(tmpDir, { tools: ['claude'] });
    const manifest = JSON.parse(await readFile(join(tmpDir, '.tiller/tiller.json'), 'utf-8')) as TillerManifest;

    const result = await saveProjectConfig(manifest, 'detailed', 'solo', ['claude', 'copilot'], tmpDir);
    expect(result.ok).toBe(true);

    const { existsSync } = await import('node:fs');
    expect(existsSync(join(tmpDir, '.github/copilot-instructions.md'))).toBe(true);
  });

  it('returns { ok: false, cause } on write failure', async () => {
    // Use a read-only-simulated path: point to a non-existent root dir to force ENOENT/EACCES
    const manifest = makeManifest({ tools: ['claude'], managedFiles: [] });

    // Override writeFile via a path that cannot be created (root-owned directory)
    // We'll mock the fs module instead
    const fsMod = await import('../../src/utils/fs.js');
    const writeSpy = vi.spyOn(fsMod, 'writeFile').mockRejectedValueOnce(new Error('disk full'));

    const result = await saveProjectConfig(manifest, 'simple', 'solo', ['claude'], tmpDir);
    expect(result).toMatchObject({
      ok: false,
      operation: 'save',
      scope: 'project',
      reason: 'write-failed',
    });
    if (!result.ok) {
      expect((result.cause as Error).message).toBe('disk full');
    }

    writeSpy.mockRestore();
  });
});

describe('saveLocalConfig', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'tiller-save-local-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('writes local.json with new mode/workflow/tools', async () => {
    await setupProject(tmpDir);
    const manifest = makeManifest({ tools: ['claude'], managedFiles: [] });

    const result = await saveLocalConfig(manifest, {}, 'simple', 'team', ['claude'], tmpDir);
    expect(result.ok).toBe(true);

    const raw = JSON.parse(await readFile(join(tmpDir, '.tiller/local.json'), 'utf-8'));
    expect(raw.mode).toBe('simple');
    expect(raw.workflow).toBe('team');
    expect(raw.tools).toEqual(['claude']);
  });

  it('preserves unrelated keys in existing local.json', async () => {
    await setupProject(tmpDir);
    await writeFile(join(tmpDir, '.tiller/local.json'), JSON.stringify({ someOtherKey: true, nested: { x: 1 } }), 'utf-8');

    const manifest = makeManifest({ tools: ['claude'], managedFiles: [] });
    const existing = { someOtherKey: true, nested: { x: 1 } };

    const result = await saveLocalConfig(manifest, existing, 'simple', 'team', ['claude'], tmpDir);
    expect(result.ok).toBe(true);

    const raw = JSON.parse(await readFile(join(tmpDir, '.tiller/local.json'), 'utf-8'));
    expect(raw.someOtherKey).toBe(true);
    expect(raw.nested).toEqual({ x: 1 });
    expect(raw.mode).toBe('simple');
  });

  it('uses skipManifest: true when tools change (tiller.json not overwritten)', async () => {
    await setupProject(tmpDir, { tools: ['claude'] });
    const manifest = JSON.parse(await readFile(join(tmpDir, '.tiller/tiller.json'), 'utf-8')) as TillerManifest;
    const originalManifestContent = await readFile(join(tmpDir, '.tiller/tiller.json'), 'utf-8');

    const result = await saveLocalConfig(manifest, {}, 'detailed', 'solo', ['claude', 'copilot'], tmpDir);
    expect(result.ok).toBe(true);

    // tiller.json must not change when saving locally
    const afterManifestContent = await readFile(join(tmpDir, '.tiller/tiller.json'), 'utf-8');
    expect(afterManifestContent).toBe(originalManifestContent);

    // But copilot files should have been generated
    const { existsSync } = await import('node:fs');
    expect(existsSync(join(tmpDir, '.github/copilot-instructions.md'))).toBe(true);
  });

  it('deletes stale local-only tool files when switching back to project defaults', async () => {
    await setupProject(tmpDir, { tools: ['claude'] });
    const manifest = JSON.parse(await readFile(join(tmpDir, '.tiller/tiller.json'), 'utf-8')) as TillerManifest;

    const addLocalOverride = await saveLocalConfig(manifest, {}, 'detailed', 'solo', ['claude', 'copilot'], tmpDir);
    expect(addLocalOverride.ok).toBe(true);
    expect(existsSync(join(tmpDir, '.github/copilot-instructions.md'))).toBe(true);

    const result = await saveLocalConfig(
      manifest,
      { mode: 'detailed', workflow: 'solo', tools: ['claude', 'copilot'] },
      'detailed',
      'solo',
      ['claude'],
      tmpDir,
    );

    expect(result.ok).toBe(true);
    expect(existsSync(join(tmpDir, '.github/copilot-instructions.md'))).toBe(false);

    const raw = JSON.parse(await readFile(join(tmpDir, '.tiller/local.json'), 'utf-8'));
    expect(raw.tools).toEqual(['claude']);
  });

  it('keeps project-managed files when a local override removes one shared tool', async () => {
    await setupProject(tmpDir, { tools: ['claude', 'copilot'] });
    await mkdir(join(tmpDir, '.github'), { recursive: true });
    await writeFile(join(tmpDir, '.github/copilot-instructions.md'), 'shared copilot file', 'utf-8');
    const manifest = JSON.parse(await readFile(join(tmpDir, '.tiller/tiller.json'), 'utf-8')) as TillerManifest;

    const result = await saveLocalConfig(
      manifest,
      { mode: 'detailed', workflow: 'solo', tools: ['claude', 'copilot'] },
      'detailed',
      'solo',
      ['claude'],
      tmpDir,
    );

    expect(result.ok).toBe(true);
    expect(existsSync(join(tmpDir, '.github/copilot-instructions.md'))).toBe(true);

    const raw = JSON.parse(await readFile(join(tmpDir, '.tiller/local.json'), 'utf-8'));
    expect(raw.tools).toEqual(['claude']);
  });

  it('returns { ok: false, cause } on write failure', async () => {
    await setupProject(tmpDir);
    const manifest = makeManifest({ tools: ['claude'], managedFiles: [] });

    const fsMod = await import('../../src/utils/fs.js');
    const writeSpy = vi.spyOn(fsMod, 'writeFile').mockRejectedValueOnce(new Error('permission denied'));

    const result = await saveLocalConfig(manifest, {}, 'simple', 'solo', ['claude'], tmpDir);
    expect(result).toMatchObject({
      ok: false,
      operation: 'save',
      scope: 'local',
      reason: 'write-failed',
    });
    if (!result.ok) {
      expect((result.cause as Error).message).toBe('permission denied');
    }

    writeSpy.mockRestore();
  });
});
