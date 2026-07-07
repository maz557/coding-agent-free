import { OpenAITool } from '../types';
import { tools as builtinTools, executeTool as executeBuiltin, allowExtraPath, setSafeMode, isSafeModeEnabled } from './fileManager';
import { mcpManager } from '../mcp/MCPManager';
import { lspManager, lspToolDefinitions, executeLSPServerTool } from '../lsp/index';

let mcpEnabled = true;
let lspEnabled = true;

export function setMCPEnabled(enabled: boolean): void {
  mcpEnabled = enabled;
}

export function isMCPEnabled(): boolean {
  return mcpEnabled;
}

export function setLSPEnabled(enabled: boolean): void {
  lspEnabled = enabled;
}

export function isLSPEnabled(): boolean {
  return lspEnabled;
}

const lspToolNames = lspToolDefinitions.map(t => t.function.name);

export function getAllTools(): OpenAITool[] {
  const result: OpenAITool[] = builtinTools as OpenAITool[];
  if (mcpEnabled) {
    result.push(...mcpManager.getOpenAITools() as OpenAITool[]);
  }
  if (lspEnabled && lspManager.isAvailable()) {
    result.push(...lspToolDefinitions as OpenAITool[]);
  }
  return result;
}

export async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  const builtinNames = builtinTools.map(t => t.function.name);
  if (builtinNames.includes(name)) {
    return executeBuiltin(name, args);
  }

  if (lspEnabled && lspToolNames.includes(name)) {
    return executeLSPServerTool(name, args);
  }

  if (mcpEnabled) {
    const serverName = mcpManager.findServerForTool(name);
    if (serverName) {
      return mcpManager.callTool(serverName, name, args);
    }
  }

  throw new Error(`Unknown tool "${name}"`);
}

export { allowExtraPath, setSafeMode, isSafeModeEnabled };
