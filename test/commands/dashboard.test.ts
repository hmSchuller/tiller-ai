import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateTillerManifest, TILLER_VERSION } from '../../src/scaffold/tiller-manifest.js';
import type { ToolTarget } from '../../src/scaffold/types.js';
import { dashboardCommand, startDashboardServer } from '../../src/commands/dashboard.js';

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

describe('dashboard server', () => {
  let tmpDir: string;
  const servers: Array<{ close: () => Promise<void> }> = [];

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'tiller-dashboard-test-'));
  });

  afterEach(async () => {
    while (servers.length > 0) {
      const server = servers.pop();
      if (server) {
        await server.close();
      }
    }
    vi.restoreAllMocks();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('serves the dashboard page and computed config state', async () => {
    await setupProject(tmpDir, { mode: 'detailed', workflow: 'solo', tools: ['claude'] });
    await writeFile(
      join(tmpDir, '.tiller/local.json'),
      JSON.stringify({ mode: 'simple', workflow: 'team', tools: ['claude', 'copilot'] }, null, 2),
      'utf-8',
    );

    const server = await startDashboardServer(tmpDir);
    servers.push(server);

    const html = await fetch(server.url).then((response) => response.text());
    expect(html).toContain('Tiller config dashboard');

    const payload = await fetch(`${server.url}/api/config`).then((response) => response.json());
    expect(payload).toMatchObject({
      ok: true,
      state: {
        project: { mode: 'detailed', workflow: 'solo', tools: ['claude'] },
        local: { mode: 'simple', workflow: 'team', tools: ['claude', 'copilot'] },
        effective: { mode: 'simple', workflow: 'team', tools: ['claude', 'copilot'] },
      },
    });
  });

  it('reports fatal project read failures through the API while keeping the server alive', async () => {
    const server = await startDashboardServer(tmpDir);
    servers.push(server);

    const payload = await fetch(`${server.url}/api/config`).then((response) => response.json());
    expect(payload).toMatchObject({
      ok: false,
      error: {
        scope: 'project',
        reason: 'missing',
      },
    });
    expect(payload.error.message).toContain('.tiller/tiller.json');
  });

  it('surfaces local parse failures while falling back to project settings', async () => {
    await setupProject(tmpDir, { mode: 'detailed', workflow: 'solo', tools: ['claude'] });
    await writeFile(join(tmpDir, '.tiller/local.json'), '{ invalid json', 'utf-8');

    const server = await startDashboardServer(tmpDir);
    servers.push(server);

    const payload = await fetch(`${server.url}/api/config`).then((response) => response.json());
    expect(payload).toMatchObject({
      ok: true,
      state: {
        effective: { mode: 'detailed', workflow: 'solo', tools: ['claude'] },
      },
      localIssue: {
        scope: 'local',
        reason: 'parse-error',
      },
    });
  });

  it('saves local scope changes through the API', async () => {
    await setupProject(tmpDir, { mode: 'detailed', workflow: 'solo', tools: ['claude'] });

    const server = await startDashboardServer(tmpDir);
    servers.push(server);

    const response = await fetch(`${server.url}/api/config`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scope: 'local',
        mode: 'simple',
        workflow: 'team',
        tools: ['copilot'],
      }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      state: {
        effective: { mode: 'simple', workflow: 'team', tools: ['copilot'] },
      },
    });

    const localConfig = JSON.parse(await readFile(join(tmpDir, '.tiller/local.json'), 'utf-8'));
    expect(localConfig).toMatchObject({
      mode: 'simple',
      workflow: 'team',
      tools: ['copilot'],
    });
  });

  it('reopens with the persisted local state after a save', async () => {
    await setupProject(tmpDir, { mode: 'detailed', workflow: 'solo', tools: ['claude'] });

    const firstServer = await startDashboardServer(tmpDir);
    servers.push(firstServer);

    await fetch(`${firstServer.url}/api/config`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scope: 'local',
        mode: 'simple',
        workflow: 'team',
        tools: ['copilot'],
      }),
    });

    await firstServer.close();
    servers.pop();

    const secondServer = await startDashboardServer(tmpDir);
    servers.push(secondServer);

    const payload = await fetch(`${secondServer.url}/api/config`).then((response) => response.json());
    expect(payload).toMatchObject({
      ok: true,
      state: {
        local: { mode: 'simple', workflow: 'team', tools: ['copilot'] },
        effective: { mode: 'simple', workflow: 'team', tools: ['copilot'] },
      },
    });
  });

  it('keeps shared project files when a local override disables a shared tool', async () => {
    await setupProject(tmpDir, { mode: 'detailed', workflow: 'solo', tools: ['claude', 'copilot'] });
    await mkdir(join(tmpDir, '.github'), { recursive: true });
    await writeFile(join(tmpDir, '.github/copilot-instructions.md'), 'shared copilot file', 'utf-8');

    const server = await startDashboardServer(tmpDir);
    servers.push(server);

    const response = await fetch(`${server.url}/api/config`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scope: 'local',
        mode: 'detailed',
        workflow: 'solo',
        tools: ['claude'],
      }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      state: {
        local: { tools: ['claude'] },
        effective: { tools: ['claude'] },
      },
    });
    expect(existsSync(join(tmpDir, '.github/copilot-instructions.md'))).toBe(true);
  });

  it('saves project scope changes and regenerates managed files when tools change', async () => {
    await setupProject(tmpDir, { mode: 'detailed', workflow: 'solo', tools: ['claude'] });

    const server = await startDashboardServer(tmpDir);
    servers.push(server);

    const response = await fetch(`${server.url}/api/config`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scope: 'project',
        mode: 'detailed',
        workflow: 'team',
        tools: ['claude', 'copilot'],
      }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      state: {
        project: { workflow: 'team', tools: ['claude', 'copilot'] },
      },
    });
    expect(existsSync(join(tmpDir, '.github/copilot-instructions.md'))).toBe(true);
  });

  it('rejects malformed tool payloads instead of silently normalizing them', async () => {
    await setupProject(tmpDir);

    const server = await startDashboardServer(tmpDir);
    servers.push(server);

    const response = await fetch(`${server.url}/api/config`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scope: 'local',
        mode: 'simple',
        workflow: 'solo',
        tools: ['copilot', 'unknown-tool'],
      }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      error: {
        scope: 'request',
        message: 'Choose only supported CLI tools.',
      },
    });
  });

  it('returns a JSON error for malformed POST bodies and still serves later requests', async () => {
    await setupProject(tmpDir);

    const server = await startDashboardServer(tmpDir);
    servers.push(server);

    const saveResponse = await fetch(`${server.url}/api/config`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{ invalid json',
    });
    const savePayload = await saveResponse.json();

    expect(saveResponse.status).toBe(400);
    expect(savePayload).toMatchObject({
      ok: false,
      error: {
        scope: 'request',
        message: expect.any(String),
      },
    });

    const readPayload = await fetch(`${server.url}/api/config`).then((response) => response.json());
    expect(readPayload).toMatchObject({
      ok: true,
      state: {
        effective: { mode: 'detailed', workflow: 'solo', tools: ['claude'] },
      },
    });
  });

  it('keeps the server available when automatic browser opening fails', async () => {
    await setupProject(tmpDir);
    const openBrowser = vi.fn().mockRejectedValue(new Error('no browser'));
    const log = vi.fn();

    const server = await dashboardCommand({ cwd: tmpDir, openBrowser, log });
    servers.push(server);

    const payload = await fetch(`${server.url}/api/config`).then((response) => response.json());
    expect(payload.ok).toBe(true);
    expect(openBrowser).toHaveBeenCalledWith(server.url);
    expect(log).toHaveBeenCalledWith(`Dashboard available at ${server.url}`);
    expect(log).toHaveBeenCalledWith(`Failed to open the browser automatically. Open this URL manually: ${server.url}`);
  });
});
