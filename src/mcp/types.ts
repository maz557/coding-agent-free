export const LATEST_PROTOCOL_VERSION = '2025-11-25';
export const JSONRPC_VERSION = '2.0';

export type ProgressToken = string | number;
export type Cursor = string;

export interface JSONRPCRequest {
  jsonrpc: typeof JSONRPC_VERSION;
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JSONRPCNotification {
  jsonrpc: typeof JSONRPC_VERSION;
  method: string;
  params?: Record<string, unknown>;
}

export interface JSONRPCResponse {
  jsonrpc: typeof JSONRPC_VERSION;
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export type JSONRPCMessage = JSONRPCRequest | JSONRPCNotification | JSONRPCResponse;

export interface InitializeRequestParams {
  protocolVersion: string;
  capabilities: ClientCapabilities;
  clientInfo: Implementation;
}

export interface ClientCapabilities {
  roots?: { listChanged?: boolean };
  sampling?: Record<string, unknown>;
  experimental?: Record<string, unknown>;
}

export interface Implementation {
  name: string;
  version: string;
}

export interface ServerCapabilities {
  experimental?: Record<string, unknown>;
  logging?: Record<string, unknown>;
  prompts?: { listChanged?: boolean };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  tools?: { listChanged?: boolean };
}

export interface InitializeResult {
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: Implementation;
}

export interface Tool {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
    [key: string]: unknown;
  };
}

export interface ListToolsResult {
  tools: Tool[];
  nextCursor?: Cursor;
}

export interface CallToolParams {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface CallToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    mimeType?: string;
    data?: string;
    resource?: unknown;
  }>;
  isError?: boolean;
}

export type Transport = {
  send(message: JSONRPCMessage): Promise<void>;
  onMessage: ((message: JSONRPCMessage) => void) | null;
  onClose: (() => void) | null;
  onError: ((error: Error) => void) | null;
  start(): Promise<void>;
  close(): Promise<void>;
};
