import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { generateTillerManifest, TILLER_VERSION } from '../../src/scaffold/tiller-manifest.js';
import type { ToolTarget } from '../../src/scaffold/types.js';
import { dashboardCommand, startDashboardServer } from '../../src/commands/dashboard.js';
import { createSession, registerAgent } from '../../src/sessions/fs.js';

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
  const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

  beforeAll(async () => {
    // Remove any pre-existing bundles so the 404 tests run deterministically
    // before the controlled build inside the nested describe rebuilds them.
    await rm(join(repoRoot, 'dist/dashboard-client.js'), { force: true });
    await rm(join(repoRoot, 'dist/dashboard-client.css'), { force: true });
  });

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

  it('serves the dashboard page with client script tag referencing the asset path', async () => {
    await setupProject(tmpDir, { mode: 'detailed', workflow: 'solo', tools: ['claude'] });

    const server = await startDashboardServer(tmpDir);
    servers.push(server);

    const html = await fetch(server.url).then((response) => response.text());
    expect(html).toContain('Tiller Config Dashboard');
    expect(html).toContain('<script type="module" src="/dashboard-client.js">');
    expect(html).toContain('<link rel="stylesheet" href="/dashboard-client.css"');
    expect(html).toContain('<div id="app">');
  });

  it('returns 404 for the client asset when the bundle has not been built', async () => {
    await setupProject(tmpDir);

    const server = await startDashboardServer(tmpDir);
    servers.push(server);

    const response = await fetch(`${server.url}/dashboard-client.js`);
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({
      ok: false,
      error: { scope: 'request', reason: 'not-found' },
    });
  });

  it('returns 404 for the CSS asset when the bundle has not been built', async () => {
    await setupProject(tmpDir);

    const server = await startDashboardServer(tmpDir);
    servers.push(server);

    const response = await fetch(`${server.url}/dashboard-client.css`);
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({
      ok: false,
      error: { scope: 'request', reason: 'not-found' },
    });
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
    expect(html).toContain('Tiller Config Dashboard');

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

  it('deduplicates repeated tool selections before persisting local saves', async () => {
    await setupProject(tmpDir, { mode: 'detailed', workflow: 'solo', tools: ['claude'] });

    const server = await startDashboardServer(tmpDir);
    servers.push(server);

    const response = await fetch(`${server.url}/api/config`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scope: 'local',
        mode: 'simple',
        workflow: 'solo',
        tools: ['copilot', 'copilot', 'claude'],
      }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      state: {
        local: { tools: ['copilot', 'claude'] },
        effective: { tools: ['copilot', 'claude'] },
      },
    });

    const localConfig = JSON.parse(await readFile(join(tmpDir, '.tiller/local.json'), 'utf-8'));
    expect(localConfig.tools).toEqual(['copilot', 'claude']);
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

  it('GET /api/sessions returns an empty array when no sessions exist', async () => {
    await setupProject(tmpDir);

    const server = await startDashboardServer(tmpDir);
    servers.push(server);

    const response = await fetch(`${server.url}/api/sessions`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual([]);
  });

  it('GET /api/sessions returns session summaries after creating a session', async () => {
    await setupProject(tmpDir);
    const session = createSession(tmpDir, 'feature/auth');
    registerAgent(tmpDir, session.id, {
      name: 'quartermaster',
      type: 'fleet',
      status: 'active',
      startedAt: new Date().toISOString(),
    });
    registerAgent(tmpDir, session.id, {
      name: 'bosun',
      type: 'specialist',
      status: 'completed',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });

    const server = await startDashboardServer(tmpDir);
    servers.push(server);

    const response = await fetch(`${server.url}/api/sessions`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toHaveLength(1);
    expect(payload[0]).toMatchObject({
      id: session.id,
      branch: 'feature/auth',
      status: 'active',
      agentCount: 2,
      activeAgentCount: 1,
    });
  });

  it('GET /api/sessions/:slug returns session detail with agents', async () => {
    await setupProject(tmpDir);
    const session = createSession(tmpDir, 'feature/detail');
    registerAgent(tmpDir, session.id, {
      name: 'scout',
      type: 'ephemeral',
      status: 'active',
      startedAt: new Date().toISOString(),
    });

    const server = await startDashboardServer(tmpDir);
    servers.push(server);

    const response = await fetch(`${server.url}/api/sessions/${session.id}`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      id: session.id,
      branch: 'feature/detail',
      status: 'active',
      agents: [
        {
          name: 'scout',
          type: 'ephemeral',
          status: 'active',
          log: '',
          inbox: [],
        },
      ],
    });
  });

  it('GET /api/sessions/:slug returns 404 for a missing session', async () => {
    await setupProject(tmpDir);

    const server = await startDashboardServer(tmpDir);
    servers.push(server);

    const response = await fetch(`${server.url}/api/sessions/nonexistent`);
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({ error: 'Session not found' });
  });

  it('POST /api/sessions/:slug/inbox/:agent sends a message', async () => {
    await setupProject(tmpDir);
    const session = createSession(tmpDir, 'feature/inbox');
    registerAgent(tmpDir, session.id, {
      name: 'quartermaster',
      type: 'fleet',
      status: 'active',
      startedAt: new Date().toISOString(),
    });

    const server = await startDashboardServer(tmpDir);
    servers.push(server);

    const response = await fetch(`${server.url}/api/sessions/${session.id}/inbox/quartermaster`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'Hello agent' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ ok: true });

    const detailResponse = await fetch(`${server.url}/api/sessions/${session.id}`);
    const detail = await detailResponse.json();
    const agent = detail.agents.find((a: { name: string }) => a.name === 'quartermaster');
    expect(agent.inbox).toHaveLength(1);
    expect(agent.inbox[0]).toMatchObject({
      from: 'user',
      content: 'Hello agent',
      delivered: false,
    });
  });

  it('POST /api/sessions/:slug/inbox/:agent returns 404 for a missing session', async () => {
    await setupProject(tmpDir);

    const server = await startDashboardServer(tmpDir);
    servers.push(server);

    const response = await fetch(`${server.url}/api/sessions/nonexistent/inbox/quartermaster`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'Hello' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({ error: 'Session not found' });
  });

  it('POST /api/sessions/:slug/inbox/:agent returns 404 for unregistered agent', async () => {
    await setupProject(tmpDir);
    createSession(tmpDir, 'feature/auth');

    const server = await startDashboardServer(tmpDir);
    servers.push(server);

    const response = await fetch(`${server.url}/api/sessions/feature-auth/inbox/unknown-agent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'Hello' }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({ error: 'Agent not found' });
  });

  it('rejects path traversal in session slug', async () => {
    await setupProject(tmpDir);

    const server = await startDashboardServer(tmpDir);
    servers.push(server);

    const response = await fetch(`${server.url}/api/sessions/${encodeURIComponent('../../evil')}`, {
      method: 'GET',
    });

    expect(response.status).toBe(400);
  });

  it('rejects path traversal in agent name for inbox POST', async () => {
    await setupProject(tmpDir);
    createSession(tmpDir, 'feature/auth');

    const server = await startDashboardServer(tmpDir);
    servers.push(server);

    const response = await fetch(
      `${server.url}/api/sessions/feature-auth/inbox/${encodeURIComponent('../../evil')}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: 'Hello' }),
      },
    );

    expect(response.status).toBe(400);
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

  describe('with built client bundle', () => {
    beforeAll(() => {
      // Build only the dashboard-client entry (ESM, browser) into dist/.
      // The outer beforeAll already cleared any stale bundle.
      const result = spawnSync(
        join(repoRoot, 'node_modules/.bin/tsup'),
        [
          '--entry.dashboard-client', 'src/commands/dashboard/client/index.tsx',
          '--format', 'esm',
          '--platform', 'browser',
          '--target', 'es2022',
          '--out-dir', 'dist',
          '--no-clean',
          '--no-dts',
        ],
        { cwd: repoRoot, stdio: 'pipe', encoding: 'utf-8' },
      );
      if (result.status !== 0) {
        throw new Error(`Dashboard client build failed:\n${result.stderr}`);
      }
    }, 60_000);

    it('serves the built client bundle with 200 and correct content-type', async () => {
      await setupProject(tmpDir);

      const server = await startDashboardServer(tmpDir);
      servers.push(server);

      const response = await fetch(`${server.url}/dashboard-client.js`);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/javascript');

      const content = await response.text();
      expect(content.length).toBeGreaterThan(0);
    });

    it('serves the built CSS bundle with 200 and correct content-type', async () => {
      await setupProject(tmpDir);

      const server = await startDashboardServer(tmpDir);
      servers.push(server);

      const response = await fetch(`${server.url}/dashboard-client.css`);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/css');

      const content = await response.text();
      expect(content.length).toBeGreaterThan(0);
    });

    it('supports HEAD requests for built assets', async () => {
      await setupProject(tmpDir);

      const server = await startDashboardServer(tmpDir);
      servers.push(server);

      const response = await fetch(`${server.url}/dashboard-client.js`, { method: 'HEAD' });
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/javascript');
      expect(await response.text()).toBe('');
    });

    it('serves the page with a module script tag pointing at the bundle', async () => {
      await setupProject(tmpDir);

      const server = await startDashboardServer(tmpDir);
      servers.push(server);

      const html = await fetch(server.url).then((r) => r.text());
      expect(html).toContain('<script type="module" src="/dashboard-client.js">');
    });
  });
});
