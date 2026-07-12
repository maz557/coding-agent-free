import { LSPManager } from './LSPManager';

export const lspManager = new LSPManager();

export const lspToolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'code_definition',
      description: 'Find where a symbol (function, class, variable) is defined at a specific file/line/column. Returns file path and line number.',
      parameters: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to the file (relative to workspace)' },
          line: { type: 'number', description: 'Line number (0-based)' },
          column: { type: 'number', description: 'Column number (0-based)' },
        },
        required: ['file', 'line', 'column'],
      } as Record<string, unknown>,
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'code_references',
      description: 'Find all references to a symbol throughout the project at a specific file/line/column. Returns file:line:column entries.',
      parameters: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to the file (relative to workspace)' },
          line: { type: 'number', description: 'Line number (0-based)' },
          column: { type: 'number', description: 'Column number (0-based)' },
        },
        required: ['file', 'line', 'column'],
      } as Record<string, unknown>,
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'code_hover',
      description: 'Get detailed information (type signature, documentation) about a symbol at a specific file/line/column.',
      parameters: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to the file (relative to workspace)' },
          line: { type: 'number', description: 'Line number (0-based)' },
          column: { type: 'number', description: 'Column number (0-based)' },
        },
        required: ['file', 'line', 'column'],
      } as Record<string, unknown>,
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'code_lookup_symbol',
      description: 'Search the project for a symbol (function, class, variable, interface, etc.) by name using the language server. Does NOT need file/line/column — just the symbol name. Use this when you need to find where a symbol is defined but do not know its exact location.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Symbol name to search for (partial match supported)' },
        },
        required: ['name'],
      } as Record<string, unknown>,
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'code_get_diagnostics',
      description: 'Get errors and warnings for a given file (works with any configured LSP language server: TypeScript, Python, etc.). Use this after editing code to check for type errors, missing imports, etc.',
      parameters: {
        type: 'object',
        properties: {
          file: { type: 'string', description: 'Path to the file (relative to workspace)' },
        },
        required: ['file'],
      } as Record<string, unknown>,
    },
  },
];

/** Auto-install LSP server for the given file if missing */
async function ensureLSPForFile(filePath: string): Promise<boolean> {
  if (lspManager.getClientForFile(filePath)) return true; // already available
  const cwd = process.cwd();
  const result = await lspManager.autoInstallAndStart(filePath, cwd);
  return result.startsWith('✅') || result.startsWith('LSP for');
}

export async function executeLSPServerTool(name: string, args: Record<string, unknown>): Promise<string> {
  const pathMod = require('path');
  const allowedDir = process.env.ALLOWED_DIR || './workspace';

  switch (name) {
    case 'code_definition': {
      const absFile = pathMod.resolve(allowedDir, args.file as string);
      await ensureLSPForFile(absFile);
      return lspManager.goToDefinition(absFile, args.line as number, args.column as number);
    }
    case 'code_references': {
      const absFile = pathMod.resolve(allowedDir, args.file as string);
      await ensureLSPForFile(absFile);
      return lspManager.findReferences(absFile, args.line as number, args.column as number);
    }
    case 'code_hover': {
      const absFile = pathMod.resolve(allowedDir, args.file as string);
      await ensureLSPForFile(absFile);
      return lspManager.hoverInfo(absFile, args.line as number, args.column as number);
    }
    case 'code_lookup_symbol':
      return lspManager.lookupSymbol(args.name as string);
    case 'code_get_diagnostics': {
      const absFile = pathMod.resolve(allowedDir, args.file as string);
      await ensureLSPForFile(absFile);
      return lspManager.getFileDiagnostics(absFile);
    }
    default:
      throw new Error(`Unknown LSP tool "${name}"`);
  }
}
