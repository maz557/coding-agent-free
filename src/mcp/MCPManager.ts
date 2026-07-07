import { StdioTransport } from './transport';
import {
  Tool as MCPTool,
  InitializeResult,
  ListToolsResult,
  CallToolResult,
  JSONRPCResponse,
  LATEST_PROTOCOL_VERSION,
} from './types';

export interface MCPServerDefinition {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

interface ConnectedServer {
  name: string;
  transport: StdioTransport;
  capabilities: InitializeResult;
  tools: MCPTool[];
}

function mcpToolToOpenAI(tool: MCPTool) {
  return {
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description || '',
      parameters: tool.inputSchema as unknown as Record<string, unknown>,
    },
  } as const;
}

export class MCPManager {
  private servers = new Map<string, ConnectedServer>();

  async connectServer(name: string, def: MCPServerDefinition): Promise<void> {
    if (this.servers.has(name)) {
      throw new Error(`MCP server "${name}" already connected`);
    }

    const transport = new StdioTransport(def.command, def.args, def.env);
    transport.onMessage = (msg) => {
      const resp = msg as JSONRPCResponse;
      if (resp.id !== undefined) {
        // handled by request pattern
      }
    };

    await transport.start();

    const result = await transport.request('initialize', {
      protocolVersion: LATEST_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'coding-agent-free', version: '1.0.0' },
    }) as InitializeResult;

    await transport.request('notifications/initialized', {});

    const toolsResult = await transport.request('tools/list', {}) as ListToolsResult;

    const server: ConnectedServer = {
      name,
      transport,
      capabilities: result,
      tools: toolsResult.tools || [],
    };

    this.servers.set(name, server);
  }

  async disconnectServer(name: string): Promise<void> {
    const server = this.servers.get(name);
    if (!server) return;
    await server.transport.close();
    this.servers.delete(name);
  }

  getOpenAITools(): Array<{ type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }> {
    const result: Array<{ type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }> = [];
    for (const [, server] of this.servers) {
      for (const tool of server.tools) {
        result.push(mcpToolToOpenAI(tool));
      }
    }
    return result;
  }

  getServerNames(): string[] {
    return Array.from(this.servers.keys());
  }

  getServerToolCount(name: string): number {
    return this.servers.get(name)?.tools.length ?? 0;
  }

  async callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<string> {
    const server = this.servers.get(serverName);
    if (!server) throw new Error(`MCP server "${serverName}" not connected`);

    const result = await server.transport.request('tools/call', {
      name: toolName,
      arguments: args,
    }) as CallToolResult;

    if (result.isError) {
      const texts = result.content
        .filter(c => c.type === 'text')
        .map(c => c.text)
        .join('\n');
      throw new Error(`MCP tool "${toolName}" error: ${texts || 'Unknown error'}`);
    }

    return result.content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('\n');
  }

  findServerForTool(toolName: string): string | null {
    for (const [name, server] of this.servers) {
      if (server.tools.some(t => t.name === toolName)) {
        return name;
      }
    }
    return null;
  }

  async shutdown(): Promise<void> {
    for (const [name] of this.servers) {
      await this.disconnectServer(name);
    }
  }
}

export const mcpManager = new MCPManager();
