import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getEffectiveConfig,
  readConfig,
  saveLocalConfig,
  saveProjectConfig,
  type LocalConfigReadIssue,
  type ReadConfigResult,
  type SaveConfigResult,
} from '../config-shared.js';
import {
  listSessions,
  readInbox,
  readLog,
  readSession,
  appendInboxMessage,
} from '../../sessions/fs.js';
import {
  CLIENT_ASSET_PATH,
  CLIENT_CSS_ASSET_PATH,
  type ConfigSnapshot,
  type DashboardIssue,
  type DashboardStateResponse,
  type LocalOverrideSnapshot,
  type SaveRequest,
  type SessionSummary,
  type SessionDetailResponse,
  type ToolTarget,
  isConfigMode,
  isToolTarget,
  isWorkflowMode,
  normalizeToolTargets,
  uniqueToolTargets,
} from './contracts.js';
import { DASHBOARD_HTML } from './page.js';

const DEFAULT_HOST = '127.0.0.1';
const PACKAGE_ROOT = findPackageRoot(dirname(fileURLToPath(import.meta.url)));
const DASHBOARD_ASSETS = [
  {
    path: CLIENT_ASSET_PATH,
    contentType: 'text/javascript; charset=utf-8',
    missingMessage: 'Client bundle not found. Run npm run build first.',
  },
  {
    path: CLIENT_CSS_ASSET_PATH,
    contentType: 'text/css; charset=utf-8',
    missingMessage: 'Client CSS bundle not found. Run npm run build first.',
  },
] as const;

type ReadConfigSuccess = Extract<ReadConfigResult, { ok: true }>;

function parseToolTargets(value: unknown): { ok: true; tools: ToolTarget[] } | { ok: false; error: DashboardIssue } {
  if (!Array.isArray(value)) {
    return { ok: false, error: getRequestIssue('Choose at least one CLI tool.') };
  }

  if (!value.every(isToolTarget)) {
    return { ok: false, error: getRequestIssue('Choose only supported CLI tools.') };
  }

  const tools = uniqueToolTargets(value);
  if (tools.length === 0) {
    return { ok: false, error: getRequestIssue('Choose at least one CLI tool.') };
  }

  return { ok: true, tools };
}

function getProjectSnapshot(manifest: ReadConfigSuccess['manifest']): ConfigSnapshot {
  const tools = normalizeToolTargets(manifest.tools);

  return {
    mode: isConfigMode(manifest.mode) ? manifest.mode : 'detailed',
    workflow: isWorkflowMode(manifest.workflow) ? manifest.workflow : 'solo',
    tools: tools.length > 0 ? tools : ['claude'],
  };
}

function getLocalOverrideSnapshot(local: Record<string, unknown>): LocalOverrideSnapshot {
  return {
    mode: isConfigMode(local.mode) ? local.mode : null,
    workflow: isWorkflowMode(local.workflow) ? local.workflow : null,
    tools: Array.isArray(local.tools) ? normalizeToolTargets(local.tools) : null,
  };
}

function getEffectiveSnapshot(manifest: ReadConfigSuccess['manifest'], local: Record<string, unknown>): ConfigSnapshot {
  const project = getProjectSnapshot(manifest);
  const effective = getEffectiveConfig(manifest, local);
  const tools = normalizeToolTargets(effective.tools);

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

async function readDistAsset(assetPath: string): Promise<Buffer> {
  if (!PACKAGE_ROOT) {
    throw new Error(`Asset not found: ${assetPath}`);
  }

  return readFile(resolve(PACKAGE_ROOT, 'dist', assetPath.replace(/^\//, '')));
}

async function sendDashboardAsset(
  res: ServerResponse,
  asset: (typeof DASHBOARD_ASSETS)[number],
): Promise<void> {
  try {
    const content = await readDistAsset(asset.path);
    res.writeHead(200, {
      'content-type': asset.contentType,
      'cache-control': 'no-store',
    });
    res.end(content);
  } catch {
    sendJson(res, 404, { ok: false, error: getRequestIssue(asset.missingMessage, 'not-found') });
  }
}

function getDashboardAsset(pathname: string): (typeof DASHBOARD_ASSETS)[number] | null {
  return DASHBOARD_ASSETS.find((asset) => asset.path === pathname) ?? null;
}

function findPackageRoot(startDir: string): string | null {
  let current = startDir;

  while (true) {
    if (existsSync(resolve(current, 'package.json'))) {
      return current;
    }

    const parent = resolve(current, '..');
    if (parent === current) {
      return null;
    }

    current = parent;
  }
}

export function createDashboardRequestHandler(cwd: string) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? DEFAULT_HOST}`);
    const asset = (req.method === 'GET' || req.method === 'HEAD') ? getDashboardAsset(requestUrl.pathname) : null;

    try {
      if (asset) {
        await sendDashboardAsset(res, asset);
        return;
      }

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

      if (req.method === 'GET' && requestUrl.pathname === '/api/sessions') {
        const sessions = listSessions(cwd);
        const summaries: SessionSummary[] = sessions.map((s) => ({
          id: s.id,
          branch: s.branch,
          startedAt: s.startedAt,
          status: s.status,
          agentCount: s.agents.length,
          activeAgentCount: s.agents.filter((a) => a.status === 'active').length,
        }));
        sendJson(res, 200, summaries);
        return;
      }

      const sessionDetailMatch = req.method === 'GET' && requestUrl.pathname.match(/^\/api\/sessions\/([^/]+)$/);
      if (sessionDetailMatch) {
        const slug = decodeURIComponent(sessionDetailMatch[1]);
        if (slug.includes('..')) {
          sendJson(res, 400, { ok: false, error: getRequestIssue('Invalid path segment.') });
          return;
        }
        const session = readSession(cwd, slug);
        if (!session) {
          sendJson(res, 404, { error: 'Session not found' });
          return;
        }

        const detail: SessionDetailResponse = {
          id: session.id,
          branch: session.branch,
          startedAt: session.startedAt,
          status: session.status,
          agents: session.agents.map((a) => ({
            name: a.name,
            type: a.type,
            status: a.status,
            startedAt: a.startedAt,
            completedAt: a.completedAt,
            log: readLog(cwd, slug, a.name),
            inbox: readInbox(cwd, slug, a.name),
          })),
        };
        sendJson(res, 200, detail);
        return;
      }

      const inboxPostMatch = req.method === 'POST' && requestUrl.pathname.match(/^\/api\/sessions\/([^/]+)\/inbox\/([^/]+)$/);
      if (inboxPostMatch) {
        const slug = decodeURIComponent(inboxPostMatch[1]);
        const agentName = decodeURIComponent(inboxPostMatch[2]);

        if (slug.includes('..') || agentName.includes('..')) {
          sendJson(res, 400, { ok: false, error: getRequestIssue('Invalid path segment.') });
          return;
        }

        const session = readSession(cwd, slug);
        if (!session) {
          sendJson(res, 404, { error: 'Session not found' });
          return;
        }

        if (!session.agents.some((a) => a.name === agentName)) {
          sendJson(res, 404, { error: 'Agent not found' });
          return;
        }

        let payload: unknown;
        try {
          payload = await readRequestBody(req);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to read request body.';
          sendJson(res, 400, { ok: false, error: getRequestIssue(message) });
          return;
        }

        const body = payload as Record<string, unknown>;
        appendInboxMessage(cwd, slug, agentName, {
          timestamp: new Date().toISOString(),
          from: 'user',
          content: String(body.content ?? ''),
        });
        sendJson(res, 200, { ok: true });
        return;
      }

      sendJson(res, 404, { ok: false, error: getRequestIssue('Not found.', 'not-found') });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected dashboard server failure.';
      sendJson(res, 500, { ok: false, error: getRequestIssue(message, 'unexpected-error') });
    }
  };
}
