import { OpenAITool } from '../types';
import { tools as builtinTools, executeTool as executeBuiltin, allowExtraPath, setSafeMode, isSafeModeEnabled } from './fileManager';
import { mcpManager } from '../mcp/MCPManager';
import { lspManager, lspToolDefinitions, executeLSPServerTool } from '../lsp/index';
import { getToolSafetyLevel, ToolSafetyLevel, ApprovalStore } from './governance';

let mcpEnabled = true;
let lspEnabled = true;
const approvalStore = new ApprovalStore();

type ApprovalCallback = (toolName: string, args: Record<string, unknown>, level: ToolSafetyLevel) => Promise<boolean>;
let approvalCallback: ApprovalCallback | null = null;

function setApprovalCallback(cb: ApprovalCallback | null): void {
  approvalCallback = cb;
}

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
  const result: OpenAITool[] = [...builtinTools] as OpenAITool[];
  if (mcpEnabled) {
    result.push(...mcpManager.getOpenAITools() as OpenAITool[]);
  }
  if (lspEnabled && lspManager.isAvailable()) {
    result.push(...lspToolDefinitions as OpenAITool[]);
  }
  return result;
}

let governanceEnabled = true;

function setGovernanceEnabled(enabled: boolean): void {
  governanceEnabled = enabled;
}

function isGovernanceEnabled(): boolean {
  return governanceEnabled;
}

export async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  if (governanceEnabled) {
    const level = getToolSafetyLevel(name);
    if (level !== 'safe' && !approvalStore.isPermanentlyAllowed(name, args)) {
      if (approvalCallback) {
        const ok = await approvalCallback(name, args, level);
        if (!ok) {
          return `⚠️ Execution rejected by user: tool "${name}" requires approval.`;
        }
      }
    }
  }

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

export { allowExtraPath, setSafeMode, isSafeModeEnabled, approvalStore, setApprovalCallback, setGovernanceEnabled, isGovernanceEnabled };
