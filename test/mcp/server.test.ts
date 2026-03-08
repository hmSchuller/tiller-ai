import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type {
  JsonRpcMessage,
  JsonRpcSuccessResponse,
  JsonRpcErrorResponse,
  McpInitializeResult,
  McpResource,
  McpToolDefinition,
  McpToolHandler,
} from '../../src/mcp/types.js';
import {
  METHOD_NOT_FOUND,
  INVALID_PARAMS,
  INTERNAL_ERROR,
  PARSE_ERROR,
} from '../../src/mcp/types.js';
import type { McpTransport } from '../../src/mcp/transport.js';
import { createServer } from '../../src/mcp/server.js';

// Mock transport that captures messages in a buffer
function createMockTransport(): McpTransport & { responses: JsonRpcMessage[]; inject: (msg: JsonRpcMessage) => void } {
  let messageHandler: ((message: JsonRpcMessage) => void) | null = null;
  const responses: JsonRpcMessage[] = [];

  return {
    responses,
    onMessage(handler: (message: JsonRpcMessage) => void): void {
      messageHandler = handler;
    },
    send(message: JsonRpcMessage): void {
      responses.push(message);
    },
    start(): void {
      // no-op for mock
    },
    close(): void {
      // no-op for mock
    },
    inject(msg: JsonRpcMessage): void {
      messageHandler?.(msg);
    },
  };
}

// Test fixtures
const echoTool: McpToolDefinition = {
  name: 'echo',
  description: 'Echoes back the input',
  inputSchema: {
    type: 'object',
    properties: { message: { type: 'string' } },
    required: ['message'],
  },
};

const failTool: McpToolDefinition = {
  name: 'fail',
  description: 'Always fails',
  inputSchema: { type: 'object' },
};

const echoHandler: McpToolHandler = async (args) => ({
  content: [{ type: 'text', text: String(args.message ?? '') }],
});

const failHandler: McpToolHandler = async () => {
  throw new Error('Intentional failure');
};

function initializeRequest(id: number | string = 1): JsonRpcMessage {
  return {
    jsonrpc: '2.0',
    id,
    method: 'initialize',
    params: {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0' },
    },
  };
}

describe('McpServer', () => {
  let transport: ReturnType<typeof createMockTransport>;

  beforeEach(() => {
    transport = createMockTransport();
  });

  describe('initialize', () => {
    it('returns server capabilities with tools and resources', () => {
      const server = createServer([echoTool], { echo: echoHandler }, transport);
      server.start();

      transport.inject(initializeRequest());

      expect(transport.responses).toHaveLength(1);
      const response = transport.responses[0] as JsonRpcSuccessResponse;
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);

      const result = response.result as McpInitializeResult;
      expect(result.protocolVersion).toBe('2025-03-26');
      expect(result.serverInfo.name).toBe('tiller-mcp');
      expect(result.serverInfo.version).toBe('0.6.0');
      expect(result.capabilities.tools).toEqual({});
      expect(result.capabilities.resources).toEqual({ subscribe: true });
    });

    it('returns error when protocolVersion is missing', () => {
      const server = createServer([], {}, transport);
      server.start();

      transport.inject({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { capabilities: {}, clientInfo: { name: 'test', version: '1.0' } },
      });

      expect(transport.responses).toHaveLength(1);
      const response = transport.responses[0] as JsonRpcErrorResponse;
      expect(response.error.code).toBe(INVALID_PARAMS);
      expect(response.error.message).toBe('Missing protocolVersion');
    });
  });

  describe('initialized notification', () => {
    it('silently accepts the initialized notification', () => {
      const server = createServer([], {}, transport);
      server.start();

      transport.inject({ jsonrpc: '2.0', method: 'initialized' });

      // No response expected for notifications
      expect(transport.responses).toHaveLength(0);
    });
  });

  describe('tools/list', () => {
    it('returns registered tools', () => {
      const server = createServer([echoTool, failTool], { echo: echoHandler, fail: failHandler }, transport);
      server.start();

      transport.inject({ jsonrpc: '2.0', id: 2, method: 'tools/list' });

      expect(transport.responses).toHaveLength(1);
      const response = transport.responses[0] as JsonRpcSuccessResponse;
      const result = response.result as { tools: McpToolDefinition[] };
      expect(result.tools).toHaveLength(2);
      expect(result.tools[0].name).toBe('echo');
      expect(result.tools[1].name).toBe('fail');
    });

    it('returns empty tools array when no tools registered', () => {
      const server = createServer([], {}, transport);
      server.start();

      transport.inject({ jsonrpc: '2.0', id: 1, method: 'tools/list' });

      const response = transport.responses[0] as JsonRpcSuccessResponse;
      const result = response.result as { tools: McpToolDefinition[] };
      expect(result.tools).toEqual([]);
    });
  });

  describe('tools/call', () => {
    it('dispatches to the correct handler', async () => {
      const server = createServer([echoTool], { echo: echoHandler }, transport);
      server.start();

      transport.inject({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'echo', arguments: { message: 'hello world' } },
      });

      // Handler is async — wait for microtask
      await new Promise((r) => setTimeout(r, 10));

      expect(transport.responses).toHaveLength(1);
      const response = transport.responses[0] as JsonRpcSuccessResponse;
      expect(response.id).toBe(3);
      const result = response.result as { content: Array<{ type: string; text: string }> };
      expect(result.content).toEqual([{ type: 'text', text: 'hello world' }]);
    });

    it('returns error for unknown tool', () => {
      const server = createServer([echoTool], { echo: echoHandler }, transport);
      server.start();

      transport.inject({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: { name: 'nonexistent', arguments: {} },
      });

      const response = transport.responses[0] as JsonRpcErrorResponse;
      expect(response.error.code).toBe(METHOD_NOT_FOUND);
      expect(response.error.message).toBe('Unknown tool: nonexistent');
    });

    it('returns error when tool name is missing', () => {
      const server = createServer([], {}, transport);
      server.start();

      transport.inject({
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {},
      });

      const response = transport.responses[0] as JsonRpcErrorResponse;
      expect(response.error.code).toBe(INVALID_PARAMS);
      expect(response.error.message).toBe('Missing tool name');
    });

    it('returns internal error when handler throws', async () => {
      const server = createServer([failTool], { fail: failHandler }, transport);
      server.start();

      transport.inject({
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: { name: 'fail', arguments: {} },
      });

      await new Promise((r) => setTimeout(r, 10));

      const response = transport.responses[0] as JsonRpcErrorResponse;
      expect(response.error.code).toBe(INTERNAL_ERROR);
      expect(response.error.message).toBe('Intentional failure');
    });

    it('defaults to empty arguments when none provided', async () => {
      const server = createServer([echoTool], { echo: echoHandler }, transport);
      server.start();

      transport.inject({
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: { name: 'echo' },
      });

      await new Promise((r) => setTimeout(r, 10));

      const response = transport.responses[0] as JsonRpcSuccessResponse;
      const result = response.result as { content: Array<{ type: string; text: string }> };
      expect(result.content[0].text).toBe('');
    });
  });

  describe('unknown method', () => {
    it('returns method-not-found error', () => {
      const server = createServer([], {}, transport);
      server.start();

      transport.inject({ jsonrpc: '2.0', id: 10, method: 'unknown/method' });

      const response = transport.responses[0] as JsonRpcErrorResponse;
      expect(response.error.code).toBe(METHOD_NOT_FOUND);
      expect(response.error.message).toContain('unknown/method');
    });
  });

  describe('malformed messages', () => {
    it('ignores messages that are neither requests nor notifications', () => {
      const server = createServer([], {}, transport);
      server.start();

      // A response message (has result but no method) should be ignored
      transport.inject({ jsonrpc: '2.0', id: 1, result: {} } as unknown as JsonRpcMessage);

      expect(transport.responses).toHaveLength(0);
    });

    it('ignores unknown notifications without responding', () => {
      const server = createServer([], {}, transport);
      server.start();

      transport.inject({ jsonrpc: '2.0', method: 'some/unknown-notification' });

      expect(transport.responses).toHaveLength(0);
    });
  });

  describe('full handshake flow', () => {
    it('completes initialize → initialized → tools/list → tools/call', async () => {
      const server = createServer([echoTool], { echo: echoHandler }, transport);
      server.start();

      // Step 1: initialize
      transport.inject(initializeRequest(1));
      expect(transport.responses).toHaveLength(1);
      const initResult = (transport.responses[0] as JsonRpcSuccessResponse).result as McpInitializeResult;
      expect(initResult.serverInfo.name).toBe('tiller-mcp');

      // Step 2: initialized notification
      transport.inject({ jsonrpc: '2.0', method: 'initialized' });
      expect(transport.responses).toHaveLength(1); // no new response

      // Step 3: tools/list
      transport.inject({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
      expect(transport.responses).toHaveLength(2);
      const listResult = (transport.responses[1] as JsonRpcSuccessResponse).result as { tools: McpToolDefinition[] };
      expect(listResult.tools[0].name).toBe('echo');

      // Step 4: tools/call
      transport.inject({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'echo', arguments: { message: 'ping' } },
      });

      await new Promise((r) => setTimeout(r, 10));

      expect(transport.responses).toHaveLength(3);
      const callResult = (transport.responses[2] as JsonRpcSuccessResponse).result as { content: Array<{ type: string; text: string }> };
      expect(callResult.content[0].text).toBe('ping');
    });
  });

  describe('resources/list', () => {
    let tmpRoot: string;

    afterEach(() => {
      rmSync(tmpRoot, { recursive: true, force: true });
    });

    it('returns resources when projectRoot is provided', () => {
      tmpRoot = join(tmpdir(), `tiller-srv-res-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      const sessDir = join(tmpRoot, '.tiller', 'sessions', 'test-sess');
      mkdirSync(sessDir, { recursive: true });
      writeFileSync(join(sessDir, 'agent-1.inbox.md'), '', 'utf-8');

      const server = createServer([], {}, transport, tmpRoot);
      server.start();

      transport.inject({ jsonrpc: '2.0', id: 1, method: 'resources/list' });

      expect(transport.responses).toHaveLength(1);
      const response = transport.responses[0] as JsonRpcSuccessResponse;
      const result = response.result as { resources: McpResource[] };
      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].uri).toBe('inbox://test-sess/agent-1');

      server.close();
    });

    it('returns empty resources when no projectRoot', () => {
      tmpRoot = join(tmpdir(), `tiller-srv-noop-${Date.now()}`);
      mkdirSync(tmpRoot, { recursive: true });

      const server = createServer([], {}, transport);
      server.start();

      transport.inject({ jsonrpc: '2.0', id: 1, method: 'resources/list' });

      const response = transport.responses[0] as JsonRpcSuccessResponse;
      const result = response.result as { resources: McpResource[] };
      expect(result.resources).toEqual([]);
    });
  });

  describe('resources/read', () => {
    let tmpRoot: string;

    afterEach(() => {
      rmSync(tmpRoot, { recursive: true, force: true });
    });

    it('returns inbox content for a valid resource', () => {
      tmpRoot = join(tmpdir(), `tiller-srv-read-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      const sessDir = join(tmpRoot, '.tiller', 'sessions', 'read-sess');
      mkdirSync(sessDir, { recursive: true });
      writeFileSync(join(sessDir, 'session.json'), JSON.stringify({
        id: 'read-sess', branch: 'read-sess', startedAt: new Date().toISOString(),
        status: 'active', agents: [],
      }), 'utf-8');
      writeFileSync(join(sessDir, 'bot.inbox.md'), [
        '<!-- TILLER-MSG -->',
        'timestamp: 2025-01-01T00:00:00Z',
        'from: orchestrator',
        'delivered: false',
        '<!-- /TILLER-MSG-HEAD -->',
        'Test message',
        '<!-- /TILLER-MSG -->',
        '',
      ].join('\n'), 'utf-8');

      const server = createServer([], {}, transport, tmpRoot);
      server.start();

      transport.inject({
        jsonrpc: '2.0', id: 1, method: 'resources/read',
        params: { uri: 'inbox://read-sess/bot' },
      });

      const response = transport.responses[0] as JsonRpcSuccessResponse;
      const result = response.result as { contents: Array<{ uri: string; text: string }> };
      expect(result.contents).toHaveLength(1);
      const messages = JSON.parse(result.contents[0].text);
      expect(messages[0].content).toBe('Test message');

      server.close();
    });

    it('returns error when URI is missing', () => {
      tmpRoot = join(tmpdir(), `tiller-srv-noparams-${Date.now()}`);
      mkdirSync(tmpRoot, { recursive: true });

      const server = createServer([], {}, transport, tmpRoot);
      server.start();

      transport.inject({ jsonrpc: '2.0', id: 1, method: 'resources/read', params: {} });

      const response = transport.responses[0] as JsonRpcErrorResponse;
      expect(response.error.code).toBe(INVALID_PARAMS);

      server.close();
    });
  });

  describe('resources/subscribe', () => {
    let tmpRoot: string;

    afterEach(() => {
      rmSync(tmpRoot, { recursive: true, force: true });
    });

    it('acknowledges a valid subscription', () => {
      tmpRoot = join(tmpdir(), `tiller-srv-sub-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      const sessDir = join(tmpRoot, '.tiller', 'sessions', 'sub-sess');
      mkdirSync(sessDir, { recursive: true });
      writeFileSync(join(sessDir, 'agent.inbox.md'), '', 'utf-8');

      const server = createServer([], {}, transport, tmpRoot);
      server.start();

      transport.inject({
        jsonrpc: '2.0', id: 1, method: 'resources/subscribe',
        params: { uri: 'inbox://sub-sess/agent' },
      });

      const response = transport.responses[0] as JsonRpcSuccessResponse;
      expect(response.id).toBe(1);
      expect(response.result).toEqual({});

      server.close();
    });

    it('returns error when URI is missing', () => {
      tmpRoot = join(tmpdir(), `tiller-srv-sub-err-${Date.now()}`);
      mkdirSync(tmpRoot, { recursive: true });

      const server = createServer([], {}, transport, tmpRoot);
      server.start();

      transport.inject({ jsonrpc: '2.0', id: 1, method: 'resources/subscribe', params: {} });

      const response = transport.responses[0] as JsonRpcErrorResponse;
      expect(response.error.code).toBe(INVALID_PARAMS);

      server.close();
    });
  });
});
