import { StdioTransport } from './transport';
import { HTTPTransport } from './HTTPTransport';
import {
  Tool as MCPTool,
  InitializeResult,
  ListToolsResult,
  CallToolResult,
  JSONRPCResponse,
  LATEST_PROTOCOL_VERSION,
  Transport,
} from './types';

export interface MCPServerStdioDefinition {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface MCPServerHTTPDefinition {
  url: string;
}

export type MCPServerDefinition = MCPServerStdioDefinition | MCPServerHTTPDefinition;

function isStdioDef(def: MCPServerDefinition): def is MCPServerStdioDefinition {
  return 'command' in def;
}

interface ConnectedServer {
  name: string;
  transport: Transport;
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

    let transport: Transport;
    if (isStdioDef(def)) {
      const stdioTransport = new StdioTransport(def.command, def.args, def.env);
      transport = stdioTransport;
    } else {
      const httpTransport = new HTTPTransport(def.url);
      transport = httpTransport;
    }

    await transport.start();

    const result = await (transport as any).request('initialize', {
      protocolVersion: LATEST_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'coding-agent-free', version: '1.0.0' },
    }) as InitializeResult;

    await (transport as any).send({
      jsonrpc: '2.0' as const,
      method: 'notifications/initialized',
      params: {},
    });

    const toolsResult = await (transport as any).request('tools/list', {}) as ListToolsResult;

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

    const result = await (server.transport as any).request('tools/call', {
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
