import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createSession, registerAgent } from '../../src/sessions/fs.js';

const CLI_PATH = fileURLToPath(new URL('../../dist/index.js', import.meta.url));

describe('mcp-server command', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'tiller-mcp-test-'));
    await mkdir(join(tmpDir, '.tiller'), { recursive: true });
    await writeFile(
      join(tmpDir, '.tiller/tiller.json'),
      JSON.stringify({ version: '0.6.0', mode: 'simple', workflow: 'solo', tools: ['copilot'] }),
    );
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('responds to initialize handshake', async () => {
    const child = spawn('node', [CLI_PATH, 'mcp-server'], {
      cwd: tmpDir,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const initRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0' },
      },
    });

    child.stdin!.write(initRequest + '\n');

    const response = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
      child.stdout!.once('data', (data: Buffer) => {
        clearTimeout(timeout);
        resolve(data.toString());
      });
    });

    const parsed = JSON.parse(response.trim());
    expect(parsed.jsonrpc).toBe('2.0');
    expect(parsed.id).toBe(1);
    expect(parsed.result.protocolVersion).toBe('2025-03-26');
    expect(parsed.result.capabilities.tools).toBeDefined();
    expect(parsed.result.capabilities.resources).toBeDefined();
    expect(parsed.result.serverInfo.name).toBe('tiller-mcp');

    child.kill('SIGTERM');
  });

  it('lists tools via tools/list', async () => {
    const child = spawn('node', [CLI_PATH, 'mcp-server'], {
      cwd: tmpDir,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const messages = [
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' },
        },
      }),
      JSON.stringify({ jsonrpc: '2.0', method: 'initialized' }),
      JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
    ];

    child.stdin!.write(messages.join('\n') + '\n');

    const responses: string[] = [];
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
      child.stdout!.on('data', (data: Buffer) => {
        const lines = data.toString().trim().split('\n');
        responses.push(...lines);
        if (responses.length >= 2) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    const toolsResponse = JSON.parse(responses[1]);
    expect(toolsResponse.id).toBe(2);
    expect(toolsResponse.result.tools).toBeInstanceOf(Array);

    const toolNames = toolsResponse.result.tools.map((t: { name: string }) => t.name);
    expect(toolNames).toContain('register-agent');
    expect(toolNames).toContain('complete-agent');
    expect(toolNames).toContain('send-inbox-message');
    expect(toolNames).toContain('check-inbox');
    expect(toolNames).toContain('list-sessions');

    child.kill('SIGTERM');
  });

  it('calls a tool via tools/call', async () => {
    createSession(tmpDir, 'feature/test');

    const child = spawn('node', [CLI_PATH, 'mcp-server'], {
      cwd: tmpDir,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const messages = [
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' },
        },
      }),
      JSON.stringify({ jsonrpc: '2.0', method: 'initialized' }),
      JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'list-sessions',
          arguments: {},
        },
      }),
    ];

    child.stdin!.write(messages.join('\n') + '\n');

    const responses: string[] = [];
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
      child.stdout!.on('data', (data: Buffer) => {
        const lines = data.toString().trim().split('\n');
        responses.push(...lines);
        if (responses.length >= 2) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    const callResponse = JSON.parse(responses[1]);
    expect(callResponse.id).toBe(2);
    expect(callResponse.result.content).toBeDefined();
    const data = JSON.parse(callResponse.result.content[0].text);
    expect(data.sessions).toHaveLength(1);
    expect(data.sessions[0].branch).toBe('feature/test');

    child.kill('SIGTERM');
  });
});
