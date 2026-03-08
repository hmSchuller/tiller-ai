import type {
  JsonRpcId,
  JsonRpcMessage,
  JsonRpcRequest,
  McpInitializeParams,
  McpInitializeResult,
  McpServerCapabilities,
  McpToolCallParams,
  McpToolCallResult,
  McpToolDefinition,
  McpToolHandler,
} from './types.js';
import {
  INTERNAL_ERROR,
  INVALID_PARAMS,
  INVALID_REQUEST,
  METHOD_NOT_FOUND,
} from './types.js';
import { createStdioTransport, type McpTransport } from './transport.js';

const PROTOCOL_VERSION = '2025-03-26';
const SERVER_NAME = 'tiller-mcp';
const SERVER_VERSION = '0.6.0';

export class McpServer {
  private readonly tools: McpToolDefinition[];
  private readonly handlers: Map<string, McpToolHandler>;
  private readonly transport: McpTransport;
  private readonly capabilities: McpServerCapabilities;

  constructor(
    tools: McpToolDefinition[],
    handlers: Record<string, McpToolHandler>,
    transport?: McpTransport,
  ) {
    this.tools = tools;
    this.handlers = new Map(Object.entries(handlers));
    this.transport = transport ?? createStdioTransport();
    this.capabilities = {
      tools: {},
      resources: { subscribe: true },
    };
  }

  start(): void {
    this.transport.onMessage((msg) => this.handleMessage(msg));
    this.transport.start();
  }

  close(): void {
    this.transport.close();
  }

  private handleMessage(message: JsonRpcMessage): void {
    if (!isRequest(message) && !isNotification(message)) return;

    // Notifications have no id — no response expected
    if (isNotification(message)) {
      // "initialized" is the only notification we handle; silently ignore others
      return;
    }

    const request = message as JsonRpcRequest;

    switch (request.method) {
      case 'initialize':
        this.handleInitialize(request);
        break;
      case 'tools/list':
        this.handleToolsList(request);
        break;
      case 'tools/call':
        this.handleToolCall(request);
        break;
      default:
        this.sendError(request.id, METHOD_NOT_FOUND, `Method not found: ${request.method}`);
    }
  }

  private handleInitialize(request: JsonRpcRequest): void {
    const params = request.params as McpInitializeParams | undefined;
    if (!params?.protocolVersion) {
      this.sendError(request.id, INVALID_PARAMS, 'Missing protocolVersion');
      return;
    }

    const result: McpInitializeResult = {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: this.capabilities,
      serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
    };

    this.sendResult(request.id, result);
  }

  private handleToolsList(request: JsonRpcRequest): void {
    this.sendResult(request.id, { tools: this.tools });
  }

  private handleToolCall(request: JsonRpcRequest): void {
    const params = request.params as McpToolCallParams | undefined;
    if (!params?.name) {
      this.sendError(request.id, INVALID_PARAMS, 'Missing tool name');
      return;
    }

    const handler = this.handlers.get(params.name);
    if (!handler) {
      this.sendError(request.id, METHOD_NOT_FOUND, `Unknown tool: ${params.name}`);
      return;
    }

    handler(params.arguments ?? {})
      .then((result: McpToolCallResult) => {
        this.sendResult(request.id, result);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Internal error';
        this.sendError(request.id, INTERNAL_ERROR, message);
      });
  }

  private sendResult(id: JsonRpcId, result: unknown): void {
    this.transport.send({ jsonrpc: '2.0', id, result });
  }

  private sendError(id: JsonRpcId, code: number, message: string): void {
    this.transport.send({ jsonrpc: '2.0', id, error: { code, message } });
  }
}

function isRequest(msg: JsonRpcMessage): msg is JsonRpcRequest {
  return 'method' in msg && 'id' in msg;
}

function isNotification(msg: JsonRpcMessage): boolean {
  return 'method' in msg && !('id' in msg);
}

export function createServer(
  tools: McpToolDefinition[],
  handlers: Record<string, McpToolHandler>,
  transport?: McpTransport,
): McpServer {
  return new McpServer(tools, handlers, transport);
}
