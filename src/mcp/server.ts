import type {
  JsonRpcId,
  JsonRpcMessage,
  JsonRpcRequest,
  McpInitializeParams,
  McpInitializeResult,
  McpResourceReadParams,
  McpResourceSubscribeParams,
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
import { createResourceManager, type ResourceManager } from './resources.js';
import { TILLER_VERSION } from '../scaffold/tiller-manifest.js';

const PROTOCOL_VERSION = '2025-03-26';
const SERVER_NAME = 'tiller-mcp';
const SERVER_VERSION = TILLER_VERSION;

export class McpServer {
  private readonly tools: McpToolDefinition[];
  private readonly handlers: Map<string, McpToolHandler>;
  private readonly transport: McpTransport;
  private readonly capabilities: McpServerCapabilities;
  private readonly resourceManager?: ResourceManager;

  constructor(
    tools: McpToolDefinition[],
    handlers: Record<string, McpToolHandler>,
    transport?: McpTransport,
    projectRoot?: string,
  ) {
    this.tools = tools;
    this.handlers = new Map(Object.entries(handlers));
    this.transport = transport ?? createStdioTransport();
    this.capabilities = {
      tools: {},
      resources: { subscribe: true },
    };

    if (projectRoot) {
      this.resourceManager = createResourceManager(projectRoot, (uri) => {
        this.sendNotification('notifications/resources/updated', { uri });
      });
    }
  }

  start(): void {
    this.transport.onMessage((msg) => this.handleMessage(msg));
    this.transport.start();
  }

  close(): void {
    this.resourceManager?.close();
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
      case 'resources/list':
        this.handleResourcesList(request);
        break;
      case 'resources/read':
        this.handleResourceRead(request);
        break;
      case 'resources/subscribe':
        this.handleResourceSubscribe(request);
        break;
      case 'resources/unsubscribe':
        this.handleResourceUnsubscribe(request);
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

  private handleResourcesList(request: JsonRpcRequest): void {
    if (!this.resourceManager) {
      this.sendResult(request.id, { resources: [] });
      return;
    }
    this.sendResult(request.id, { resources: this.resourceManager.listResources() });
  }

  private handleResourceRead(request: JsonRpcRequest): void {
    const params = request.params as McpResourceReadParams | undefined;
    if (!params?.uri) {
      this.sendError(request.id, INVALID_PARAMS, 'Missing resource URI');
      return;
    }
    if (!this.resourceManager) {
      this.sendError(request.id, INVALID_PARAMS, 'Resources not available');
      return;
    }
    try {
      const contents = this.resourceManager.readResource(params.uri);
      this.sendResult(request.id, { contents });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Resource read failed';
      this.sendError(request.id, INVALID_PARAMS, message);
    }
  }

  private handleResourceSubscribe(request: JsonRpcRequest): void {
    const params = request.params as McpResourceSubscribeParams | undefined;
    if (!params?.uri) {
      this.sendError(request.id, INVALID_PARAMS, 'Missing resource URI');
      return;
    }
    if (!this.resourceManager) {
      this.sendError(request.id, INVALID_PARAMS, 'Resources not available');
      return;
    }
    try {
      this.resourceManager.subscribe(params.uri);
      this.sendResult(request.id, {});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Subscribe failed';
      this.sendError(request.id, INVALID_PARAMS, message);
    }
  }

  private handleResourceUnsubscribe(request: JsonRpcRequest): void {
    const params = request.params as McpResourceSubscribeParams | undefined;
    if (!params?.uri) {
      this.sendError(request.id, INVALID_PARAMS, 'Missing resource URI');
      return;
    }
    if (!this.resourceManager) {
      this.sendError(request.id, INVALID_PARAMS, 'Resources not available');
      return;
    }
    this.resourceManager.unsubscribe(params.uri);
    this.sendResult(request.id, {});
  }

  private sendResult(id: JsonRpcId, result: unknown): void {
    this.transport.send({ jsonrpc: '2.0', id, result });
  }

  private sendError(id: JsonRpcId, code: number, message: string): void {
    this.transport.send({ jsonrpc: '2.0', id, error: { code, message } });
  }

  private sendNotification(method: string, params: Record<string, unknown>): void {
    this.transport.send({ jsonrpc: '2.0', method, params } as JsonRpcMessage);
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
  projectRoot?: string,
): McpServer {
  return new McpServer(tools, handlers, transport, projectRoot);
}
