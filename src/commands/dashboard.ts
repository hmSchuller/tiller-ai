import { spawn } from 'node:child_process';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { ToolTarget } from '../scaffold/types.js';
import {
  getEffectiveConfig,
  readConfig,
  saveLocalConfig,
  saveProjectConfig,
  type LocalConfigReadIssue,
  type ReadConfigResult,
  type SaveConfigResult,
} from './config-shared.js';

type ConfigMode = 'simple' | 'detailed';
type WorkflowMode = 'solo' | 'team';
type ConfigScope = 'local' | 'project';

type ConfigSnapshot = {
  mode: ConfigMode;
  workflow: WorkflowMode;
  tools: ToolTarget[];
};

type LocalOverrideSnapshot = {
  mode: ConfigMode | null;
  workflow: WorkflowMode | null;
  tools: ToolTarget[] | null;
};

type DashboardState = {
  project: ConfigSnapshot;
  local: LocalOverrideSnapshot;
  effective: ConfigSnapshot;
};

type DashboardIssue = {
  scope: 'project' | 'local' | 'request';
  reason: string;
  message: string;
};

type DashboardStateResponse =
  | { ok: true; state: DashboardState; localIssue?: DashboardIssue }
  | { ok: false; error: DashboardIssue };

type SaveRequest = {
  scope: ConfigScope;
  mode: ConfigMode;
  workflow: WorkflowMode;
  tools: ToolTarget[];
};

export type DashboardServerHandle = {
  url: string;
  close: () => Promise<void>;
};

type DashboardServerOptions = {
  host?: string;
  port?: number;
};

type DashboardCommandOptions = DashboardServerOptions & {
  cwd?: string;
  log?: (message: string) => void;
  openBrowser?: (url: string) => Promise<void>;
};

const DEFAULT_HOST = '127.0.0.1';

function isConfigMode(value: unknown): value is ConfigMode {
  return value === 'simple' || value === 'detailed';
}

function isWorkflowMode(value: unknown): value is WorkflowMode {
  return value === 'solo' || value === 'team';
}

function isToolTarget(value: unknown): value is ToolTarget {
  return value === 'claude' || value === 'copilot' || value === 'opencode';
}

function uniqueTools(tools: ToolTarget[]): ToolTarget[] {
  return [...new Set(tools)];
}

function normalizeTools(value: unknown): ToolTarget[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniqueTools(value.filter(isToolTarget));
}

function parseToolTargets(value: unknown): { ok: true; tools: ToolTarget[] } | { ok: false; error: DashboardIssue } {
  if (!Array.isArray(value)) {
    return { ok: false, error: getRequestIssue('Choose at least one CLI tool.') };
  }

  if (!value.every(isToolTarget)) {
    return { ok: false, error: getRequestIssue('Choose only supported CLI tools.') };
  }

  const tools = uniqueTools(value);
  if (tools.length === 0) {
    return { ok: false, error: getRequestIssue('Choose at least one CLI tool.') };
  }

  return { ok: true, tools };
}

function getProjectSnapshot(manifest: Extract<ReadConfigResult, { ok: true }>['manifest']): ConfigSnapshot {
  return {
    mode: isConfigMode(manifest.mode) ? manifest.mode : 'detailed',
    workflow: isWorkflowMode(manifest.workflow) ? manifest.workflow : 'solo',
    tools: normalizeTools(manifest.tools).length > 0 ? normalizeTools(manifest.tools) : ['claude'],
  };
}

function getLocalOverrideSnapshot(local: Record<string, unknown>): LocalOverrideSnapshot {
  return {
    mode: isConfigMode(local.mode) ? local.mode : null,
    workflow: isWorkflowMode(local.workflow) ? local.workflow : null,
    tools: Array.isArray(local.tools) ? normalizeTools(local.tools) : null,
  };
}

function getEffectiveSnapshot(
  manifest: Extract<ReadConfigResult, { ok: true }>['manifest'],
  local: Record<string, unknown>,
): ConfigSnapshot {
  const project = getProjectSnapshot(manifest);
  const effective = getEffectiveConfig(manifest, local);
  const tools = normalizeTools(effective.tools);

  return {
    mode: isConfigMode(effective.mode) ? effective.mode : project.mode,
    workflow: isWorkflowMode(effective.workflow) ? effective.workflow : project.workflow,
    tools: tools.length > 0 ? tools : project.tools,
  };
}

function getReadIssue(result: Exclude<ReadConfigResult, { ok: true }>): DashboardIssue {
  if (result.reason === 'missing') {
    return {
      scope: 'project',
      reason: result.reason,
      message: 'No .tiller/tiller.json found. Is this a Tiller project?',
    };
  }

  if (result.reason === 'parse-error') {
    return {
      scope: 'project',
      reason: result.reason,
      message: 'Failed to parse .tiller/tiller.json.',
    };
  }

  return {
    scope: 'project',
    reason: result.reason,
    message: 'Failed to read .tiller/tiller.json.',
  };
}

function getLocalIssue(issue: LocalConfigReadIssue): DashboardIssue {
  return {
    scope: 'local',
    reason: issue.reason,
    message:
      issue.reason === 'parse-error'
        ? 'Failed to parse .tiller/local.json. Falling back to project settings.'
        : 'Failed to read .tiller/local.json. Falling back to project settings.',
  };
}

function getSaveIssue(result: Extract<SaveConfigResult, { ok: false }>): DashboardIssue {
  return {
    scope: result.scope,
    reason: result.reason,
    message:
      result.reason === 'write-failed'
        ? `Failed to save ${result.scope} settings.`
        : `Failed to update ${result.scope} managed files.`,
  };
}

function toStateResponse(result: ReadConfigResult): DashboardStateResponse {
  if (!result.ok) {
    return { ok: false, error: getReadIssue(result) };
  }

  const response: Extract<DashboardStateResponse, { ok: true }> = {
    ok: true,
    state: {
      project: getProjectSnapshot(result.manifest),
      local: getLocalOverrideSnapshot(result.local),
      effective: getEffectiveSnapshot(result.manifest, result.local),
    },
  };

  if (result.localIssue) {
    response.localIssue = getLocalIssue(result.localIssue);
  }

  return response;
}

function getRequestIssue(message: string, reason = 'invalid-request'): DashboardIssue {
  return { scope: 'request', reason, message };
}

async function readRequestBody(req: IncomingMessage): Promise<unknown> {
  let body = '';

  for await (const chunk of req) {
    body += chunk;
    if (body.length > 100_000) {
      throw new Error('Request body is too large.');
    }
  }

  if (body.length === 0) {
    throw new Error('Request body is required.');
  }

  return JSON.parse(body) as unknown;
}

function parseSaveRequest(payload: unknown): { ok: true; value: SaveRequest } | { ok: false; error: DashboardIssue } {
  if (payload === null || typeof payload !== 'object') {
    return { ok: false, error: getRequestIssue('Request body must be a JSON object.') };
  }

  const candidate = payload as Record<string, unknown>;
  const parsedTools = parseToolTargets(candidate.tools);

  if (candidate.scope !== 'local' && candidate.scope !== 'project') {
    return { ok: false, error: getRequestIssue('Choose whether the change applies locally or to the whole project.') };
  }

  if (!isConfigMode(candidate.mode)) {
    return { ok: false, error: getRequestIssue('Choose a valid mode.') };
  }

  if (!isWorkflowMode(candidate.workflow)) {
    return { ok: false, error: getRequestIssue('Choose a valid workflow.') };
  }

  if (!parsedTools.ok) {
    return { ok: false, error: parsedTools.error };
  }

  return {
    ok: true,
    value: {
      scope: candidate.scope,
      mode: candidate.mode,
      workflow: candidate.workflow,
      tools: parsedTools.tools,
    },
  };
}

function sendHtml(res: ServerResponse, html: string): void {
  res.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(html);
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

async function handleSaveRequest(cwd: string, payload: unknown): Promise<{ statusCode: number; body: DashboardStateResponse }> {
  const parsed = parseSaveRequest(payload);
  if (!parsed.ok) {
    return { statusCode: 400, body: { ok: false, error: parsed.error } };
  }

  const current = await readConfig(cwd);
  if (!current.ok) {
    return { statusCode: 409, body: toStateResponse(current) };
  }

  const result =
    parsed.value.scope === 'project'
      ? await saveProjectConfig(current.manifest, parsed.value.mode, parsed.value.workflow, parsed.value.tools, cwd)
      : await saveLocalConfig(current.manifest, current.local, parsed.value.mode, parsed.value.workflow, parsed.value.tools, cwd);

  if (!result.ok) {
    return { statusCode: 500, body: { ok: false, error: getSaveIssue(result) } };
  }

  return { statusCode: 200, body: toStateResponse(await readConfig(cwd)) };
}

function getOpenCommand(url: string): { command: string; args: string[] } {
  switch (process.platform) {
    case 'darwin':
      return { command: 'open', args: [url] };
    case 'win32':
      return { command: 'cmd', args: ['/c', 'start', '', url] };
    default:
      return { command: 'xdg-open', args: [url] };
  }
}

export async function openBrowserUrl(url: string): Promise<void> {
  const { command, args } = getOpenCommand(url);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { detached: true, stdio: 'ignore' });

    child.once('error', reject);
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}

function attachSignalHandlers(handle: DashboardServerHandle): DashboardServerHandle {
  const listeners = (['SIGINT', 'SIGTERM'] as const).map((signal) => {
    const listener = () => {
      cleanup();
      void handle.close().finally(() => process.exit(0));
    };

    process.once(signal, listener);
    return { signal, listener };
  });

  const cleanup = () => {
    for (const { signal, listener } of listeners) {
      process.off(signal, listener);
    }
  };

  return {
    ...handle,
    close: async () => {
      cleanup();
      await handle.close();
    },
  };
}

export async function startDashboardServer(
  cwd: string,
  options: DashboardServerOptions = {},
): Promise<DashboardServerHandle> {
  const server = createServer(async (req, res) => {
    const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? DEFAULT_HOST}`);

    try {
      if ((req.method === 'GET' || req.method === 'HEAD') && requestUrl.pathname === '/') {
        sendHtml(res, DASHBOARD_HTML);
        return;
      }

      if (req.method === 'GET' && requestUrl.pathname === '/api/config') {
        sendJson(res, 200, toStateResponse(await readConfig(cwd)));
        return;
      }

      if (req.method === 'POST' && requestUrl.pathname === '/api/config') {
        let payload: unknown;
        try {
          payload = await readRequestBody(req);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to read request body.';
          sendJson(res, 400, { ok: false, error: getRequestIssue(message) });
          return;
        }

        const response = await handleSaveRequest(cwd, payload);
        sendJson(res, response.statusCode, response.body);
        return;
      }

      sendJson(res, 404, { ok: false, error: getRequestIssue('Not found.', 'not-found') });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected dashboard server failure.';
      sendJson(res, 500, { ok: false, error: getRequestIssue(message, 'unexpected-error') });
    }
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(options.port ?? 0, options.host ?? DEFAULT_HOST);
  });

  const address = server.address() as AddressInfo;
  const host = options.host ?? DEFAULT_HOST;

  return {
    url: `http://${host}:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
  };
}

export async function dashboardCommand(options: DashboardCommandOptions = {}): Promise<DashboardServerHandle> {
  const log = options.log ?? ((message: string) => console.log(message));
  const handle = attachSignalHandlers(await startDashboardServer(options.cwd ?? process.cwd(), options));

  log(`Dashboard available at ${handle.url}`);

  try {
    await (options.openBrowser ?? openBrowserUrl)(handle.url);
  } catch {
    log(`Failed to open the browser automatically. Open this URL manually: ${handle.url}`);
  }

  return handle;
}

const DASHBOARD_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tiller Config Dashboard</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #0f172a;
        color: #e2e8f0;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background: linear-gradient(180deg, #0f172a 0%, #111827 100%);
      }

      .shell {
        max-width: 1180px;
        margin: 0 auto;
        padding: 32px 20px 48px;
      }

      .hero {
        margin-bottom: 24px;
      }

      h1, h2, h3 {
        margin: 0 0 12px;
      }

      p {
        margin: 0;
        color: #cbd5e1;
        line-height: 1.5;
      }

      .layout {
        display: grid;
        gap: 20px;
      }

      .card {
        background: rgba(15, 23, 42, 0.84);
        border: 1px solid rgba(148, 163, 184, 0.25);
        border-radius: 18px;
        padding: 20px;
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.28);
      }

      .status {
        margin: 0 0 20px;
        padding: 14px 16px;
        border-radius: 14px;
        border: 1px solid transparent;
        font-size: 0.95rem;
      }

      .status.hidden {
        display: none;
      }

      .status.info {
        background: rgba(59, 130, 246, 0.14);
        border-color: rgba(96, 165, 250, 0.4);
      }

      .status.success {
        background: rgba(34, 197, 94, 0.14);
        border-color: rgba(74, 222, 128, 0.45);
      }

      .status.warn {
        background: rgba(234, 179, 8, 0.14);
        border-color: rgba(250, 204, 21, 0.45);
      }

      .status.error {
        background: rgba(239, 68, 68, 0.14);
        border-color: rgba(248, 113, 113, 0.5);
      }

      .form-grid,
      .panel-grid {
        display: grid;
        gap: 18px;
      }

      .panel-grid {
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }

      label,
      legend {
        display: block;
        font-weight: 600;
        margin-bottom: 8px;
      }

      select,
      button {
        width: 100%;
        border-radius: 12px;
        border: 1px solid rgba(148, 163, 184, 0.35);
        background: rgba(15, 23, 42, 0.88);
        color: inherit;
        padding: 12px 14px;
        font: inherit;
      }

      fieldset {
        border: 1px solid rgba(148, 163, 184, 0.25);
        border-radius: 14px;
        padding: 16px;
        margin: 0;
      }

      .choice-row {
        display: grid;
        gap: 10px;
      }

      .inline-choice {
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 10px 12px;
        border-radius: 12px;
        background: rgba(30, 41, 59, 0.65);
      }

      input[type="radio"],
      input[type="checkbox"] {
        accent-color: #38bdf8;
        inline-size: 18px;
        block-size: 18px;
      }

      button {
        cursor: pointer;
        background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
        border: none;
        font-weight: 700;
      }

      button:disabled,
      select:disabled,
      input:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }

      .panel {
        display: grid;
        gap: 12px;
      }

      .panel-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 0.95rem;
      }

      .panel-row dt {
        color: #94a3b8;
      }

      .panel-row dd {
        margin: 0;
        text-align: right;
      }

      .help {
        font-size: 0.92rem;
        color: #94a3b8;
      }

      @media (min-width: 980px) {
        .layout {
          grid-template-columns: minmax(340px, 380px) 1fr;
          align-items: start;
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <h1>Tiller config dashboard</h1>
        <p>Review project defaults, local overrides, and the effective configuration side by side. Changes reuse the same save logic as <code>tiller-ai config</code>.</p>
      </section>

      <div id="status" class="status hidden" role="status" aria-live="polite"></div>

      <div class="layout">
        <section class="card">
          <h2>Update settings</h2>
          <p class="help">Local saves write <code>.tiller/local.json</code>. Project saves update <code>.tiller/tiller.json</code> and will regenerate managed files when tool selection changes.</p>
          <form id="config-form" class="form-grid">
            <fieldset>
              <legend>Apply changes to</legend>
              <div class="choice-row">
                <label class="inline-choice"><input type="radio" name="scope" value="local" checked /> Just me</label>
                <label class="inline-choice"><input type="radio" name="scope" value="project" /> Whole project</label>
              </div>
            </fieldset>

            <div>
              <label for="mode">Mode</label>
              <select id="mode" name="mode">
                <option value="simple">simple</option>
                <option value="detailed">detailed</option>
              </select>
            </div>

            <div>
              <label for="workflow">Workflow</label>
              <select id="workflow" name="workflow">
                <option value="solo">solo</option>
                <option value="team">team</option>
              </select>
            </div>

            <fieldset>
              <legend>CLI tools</legend>
              <div class="choice-row">
                <label class="inline-choice"><input type="checkbox" name="tools" value="claude" /> Claude Code</label>
                <label class="inline-choice"><input type="checkbox" name="tools" value="copilot" /> GitHub Copilot</label>
                <label class="inline-choice"><input type="checkbox" name="tools" value="opencode" /> OpenCode</label>
              </div>
            </fieldset>

            <button type="submit">Save settings</button>
          </form>
        </section>

        <section class="panel-grid">
          <article class="card">
            <h3>Project values</h3>
            <dl id="project-panel" class="panel"></dl>
          </article>
          <article class="card">
            <h3>Local overrides</h3>
            <dl id="local-panel" class="panel"></dl>
          </article>
          <article class="card">
            <h3>Effective config</h3>
            <dl id="effective-panel" class="panel"></dl>
          </article>
        </section>
      </div>
    </main>

    <script>
      const form = document.getElementById('config-form');
      const statusElement = document.getElementById('status');
      const modeElement = document.getElementById('mode');
      const workflowElement = document.getElementById('workflow');
      const toolInputs = Array.from(document.querySelectorAll('input[name="tools"]'));
      let hasState = false;

      function escapeHtml(value) {
        return String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function setStatus(message, tone) {
        statusElement.textContent = message;
        statusElement.className = 'status ' + tone;
      }

      function clearStatus() {
        statusElement.textContent = '';
        statusElement.className = 'status hidden';
      }

      function setFormDisabled(disabled) {
        modeElement.disabled = disabled;
        workflowElement.disabled = disabled;
        for (const input of toolInputs) {
          input.disabled = disabled;
        }
        for (const input of form.querySelectorAll('input[name="scope"]')) {
          input.disabled = disabled;
        }
        form.querySelector('button').disabled = disabled;
      }

      function renderRows(targetId, rows) {
        const target = document.getElementById(targetId);
        target.innerHTML = rows
          .map(function (row) {
            return '<div class="panel-row"><dt>' + escapeHtml(row.label) + '</dt><dd>' + escapeHtml(row.value) + '</dd></div>';
          })
          .join('');
      }

      function renderState(state) {
        renderRows('project-panel', [
          { label: 'Mode', value: state.project.mode },
          { label: 'Workflow', value: state.project.workflow },
          { label: 'Tools', value: state.project.tools.join(', ') },
        ]);

        renderRows('local-panel', [
          { label: 'Mode', value: state.local.mode === null ? 'Not set' : state.local.mode },
          { label: 'Workflow', value: state.local.workflow === null ? 'Not set' : state.local.workflow },
          { label: 'Tools', value: state.local.tools === null ? 'Not set' : (state.local.tools.length === 0 ? 'None' : state.local.tools.join(', ')) },
        ]);

        renderRows('effective-panel', [
          { label: 'Mode', value: state.effective.mode },
          { label: 'Workflow', value: state.effective.workflow },
          { label: 'Tools', value: state.effective.tools.join(', ') },
        ]);

        modeElement.value = state.effective.mode;
        workflowElement.value = state.effective.workflow;
        for (const input of toolInputs) {
          input.checked = state.effective.tools.includes(input.value);
        }
      }

      async function readJson(response) {
        const text = await response.text();
        return text ? JSON.parse(text) : {};
      }

      async function loadState() {
        setStatus('Loading dashboard…', 'info');
        const response = await fetch('/api/config', { cache: 'no-store' });
        const payload = await readJson(response);

        if (!payload.ok) {
          hasState = false;
          setFormDisabled(true);
          setStatus(payload.error.message, 'error');
          return;
        }

        hasState = true;
        renderState(payload.state);
        setFormDisabled(false);

        if (payload.localIssue) {
          setStatus(payload.localIssue.message, 'warn');
        } else {
          clearStatus();
        }
      }

      function selectedScope() {
        return form.querySelector('input[name="scope"]:checked').value;
      }

      function selectedTools() {
        return toolInputs.filter(function (input) { return input.checked; }).map(function (input) { return input.value; });
      }

      form.addEventListener('submit', async function (event) {
        event.preventDefault();

        const tools = selectedTools();
        if (tools.length === 0) {
          setStatus('Choose at least one CLI tool.', 'error');
          return;
        }

        setStatus('Saving settings…', 'info');

        try {
          const response = await fetch('/api/config', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              scope: selectedScope(),
              mode: modeElement.value,
              workflow: workflowElement.value,
              tools,
            }),
          });
          const payload = await readJson(response);

          if (!payload.ok) {
            setStatus(payload.error.message, 'error');
            if (!hasState) {
              setFormDisabled(true);
            }
            return;
          }

          hasState = true;
          renderState(payload.state);
          setFormDisabled(false);
          if (payload.localIssue) {
            setStatus(payload.localIssue.message, 'warn');
          } else {
            setStatus('Settings saved.', 'success');
          }
        } catch (error) {
          setStatus(
            error instanceof Error
              ? error.message
              : 'Failed to save settings. Try again while the local server is still running.',
            'error',
          );
          setFormDisabled(!hasState);
        }
      });

      loadState().catch(function (error) {
        setStatus(error instanceof Error ? error.message : 'Failed to load the dashboard.', 'error');
        setFormDisabled(true);
      });
    </script>
  </body>
</html>`;
