// JSON-RPC 2.0 base types

export type JsonRpcId = string | number;

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcSuccessResponse {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result: unknown;
}

export interface JsonRpcErrorResponse {
  jsonrpc: '2.0';
  id: JsonRpcId | null;
  error: JsonRpcError;
}

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

export type JsonRpcMessage = JsonRpcRequest | JsonRpcNotification | JsonRpcResponse;

// Standard JSON-RPC error codes
export const PARSE_ERROR = -32700;
export const INVALID_REQUEST = -32600;
export const METHOD_NOT_FOUND = -32601;
export const INVALID_PARAMS = -32602;
export const INTERNAL_ERROR = -32603;

// MCP protocol types

export interface McpClientInfo {
  name: string;
  version: string;
}

export interface McpServerInfo {
  name: string;
  version: string;
}

export interface McpClientCapabilities {
  roots?: { listChanged?: boolean };
  sampling?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface McpToolsCapability {
  listChanged?: boolean;
}

export interface McpResourcesCapability {
  subscribe?: boolean;
  listChanged?: boolean;
}

export interface McpServerCapabilities {
  tools?: McpToolsCapability;
  resources?: McpResourcesCapability;
}

export interface McpInitializeParams {
  protocolVersion: string;
  capabilities: McpClientCapabilities;
  clientInfo: McpClientInfo;
}

export interface McpInitializeResult {
  protocolVersion: string;
  capabilities: McpServerCapabilities;
  serverInfo: McpServerInfo;
}

export interface McpToolInputSchema {
  type: 'object';
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: McpToolInputSchema;
}

export interface McpToolCallParams {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface McpTextContent {
  type: 'text';
  text: string;
}

export interface McpToolCallResult {
  content: McpTextContent[];
  isError?: boolean;
}

// Tool handler function signature
export type McpToolHandler = (
  args: Record<string, unknown>,
) => Promise<McpToolCallResult>;
