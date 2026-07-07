import { LSPManager } from './LSPManager';

export const lspManager = new LSPManager();

export const lspToolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'code_definition',
      description: 'Find where a symbol (function, class, variable) is defined. Returns file path and line number.',
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
      description: 'Find all references to a symbol throughout the project. Returns file:line:column entries.',
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
      description: 'Get detailed information (type signature, documentation) about a symbol at a position in a file.',
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
];

export async function executeLSPServerTool(name: string, args: Record<string, unknown>): Promise<string> {
  const allowedDir = process.env.ALLOWED_DIR || './workspace';
  const absFile = require('path').resolve(allowedDir, args.file as string);
  const line = args.line as number;
  const column = args.column as number;

  switch (name) {
    case 'code_definition':
      return lspManager.goToDefinition(absFile, line, column);
    case 'code_references':
      return lspManager.findReferences(absFile, line, column);
    case 'code_hover':
      return lspManager.hoverInfo(absFile, line, column);
    default:
      throw new Error(`Unknown LSP tool "${name}"`);
  }
}
