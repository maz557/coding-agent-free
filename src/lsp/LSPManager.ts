import * as path from 'path';
import * as fs from 'fs';
import { LSPClient } from './LSPClient';

export interface LSPServerConfig {
  command: string;
  args: string[];
  languageId: string;
  filePatterns: string[];
}

const DEFAULT_LSP_SERVERS: LSPServerConfig[] = [
  {
    command: 'typescript-language-server',
    args: ['--stdio'],
    languageId: 'typescript',
    filePatterns: ['**/*.ts', '**/*.tsx'],
  },
  {
    command: 'typescript-language-server',
    args: ['--stdio'],
    languageId: 'javascript',
    filePatterns: ['**/*.js', '**/*.jsx', '**/*.mjs'],
  },
  {
    command: 'pyright',
    args: ['--stdio'],
    languageId: 'python',
    filePatterns: ['**/*.py'],
  },
  {
    command: 'rust-analyzer',
    args: [],
    languageId: 'rust',
    filePatterns: ['**/*.rs'],
  },
  {
    command: 'gopls',
    args: [],
    languageId: 'go',
    filePatterns: ['**/*.go'],
  },
  {
    command: 'sql-language-server',
    args: ['up', '--method', 'stream'],
    languageId: 'sql',
    filePatterns: ['**/*.sql'],
  },
  {
    command: 'clangd',
    args: [],
    languageId: 'c',
    filePatterns: ['**/*.c', '**/*.h'],
  },
  {
    command: 'clangd',
    args: [],
    languageId: 'cpp',
    filePatterns: ['**/*.cpp', '**/*.hpp', '**/*.cc', '**/*.cxx'],
  },
];

export class LSPManager {
  private clients: LSPClient[] = [];
  private configs: LSPServerConfig[];

  constructor(configs?: LSPServerConfig[]) {
    this.configs = configs || DEFAULT_LSP_SERVERS;
  }

  addConfig(config: LSPServerConfig): void {
    this.configs.push(config);
  }

  async startForProject(projectRoot: string): Promise<void> {
    const files = this.findProjectFiles(projectRoot);
    if (files.length === 0) return;

    for (const config of this.configs) {
      const matches = files.filter(f => this.matchesPattern(f, config.filePatterns));
      if (matches.length > 0) {
        const uri = pathToUri(projectRoot);
        try {
          const client = new LSPClient(config.command, config.args, uri);
          client.onDiagnostics = (docUri: string, diagnostics: any[]) => {
            if (diagnostics.length > 0) {
              console.log(`  📋 LSP diagnostics for ${path.basename(uriToPath(docUri))}: ${diagnostics.length} issue(s)`);
            }
          };
          await client.start();
          this.clients.push(client);

          for (const file of matches.slice(0, 50)) {
            const fileUri = pathToUri(file);
            const ext = path.extname(file).slice(1);
            try {
              const content = fs.readFileSync(file, 'utf-8');
              await client.openDocument(fileUri, config.languageId, content);
            } catch { /* skip unreadable */ }
          }
        } catch (err: any) {
          console.log(`  ⚠️  LSP "${config.command}" failed: ${err.message}`);
        }
      }
    }
  }

  private findProjectFiles(root: string): string[] {
    const result: string[] = [];
    try {
      const entries = fs.readdirSync(root, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(root, entry.name);
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            result.push(...this.findProjectFiles(full));
          }
        } else {
          result.push(full);
        }
      }
    } catch { /* skip unreadable */ }
    return result;
  }

  private matchesPattern(filePath: string, patterns: string[]): boolean {
    const normalized = filePath.replace(/\\/g, '/');
    for (const p of patterns) {
      const regexStr = p.split('**').map(s => s.replace(/\*/g, '[^/]*').replace(/\?/g, '.')).join('.*');
      if (new RegExp('^' + regexStr + '$').test(normalized)) return true;
    }
    return false;
  }

  getClientForFile(filePath: string): LSPClient | null {
    const uri = pathToUri(filePath);
    for (const client of this.clients) {
      if (client.ready) return client;
    }
    return this.clients.find(c => c.ready) || null;
  }

  async goToDefinition(filePath: string, line: number, column: number): Promise<string> {
    const client = this.getClientForFile(filePath);
    if (!client) return 'LSP not available for this file';

    const uri = pathToUri(filePath);
    try {
      const result = await client.goToDefinition(uri, line, column);
      if (!result) return 'No definition found';

      const loc = Array.isArray(result) ? result[0] : result;
      if (!loc?.uri) return 'No definition found';

      const targetPath = uriToPath(loc.uri);
      const range = loc.range?.start || { line: 0, character: 0 };
      return `${targetPath}:${range.line + 1}:${range.character + 1}`;
    } catch (err: any) {
      return `LSP error: ${err.message}`;
    }
  }

  async findReferences(filePath: string, line: number, column: number): Promise<string> {
    const client = this.getClientForFile(filePath);
    if (!client) return 'LSP not available for this file';

    const uri = pathToUri(filePath);
    try {
      const result = await client.findReferences(uri, line, column);
      if (!result || result.length === 0) return 'No references found';

      return result.slice(0, 20).map((ref: any) => {
        const p = uriToPath(ref.uri);
        const start = ref.range?.start || { line: 0, character: 0 };
        return `${p}:${start.line + 1}:${start.character + 1}`;
      }).join('\n');
    } catch (err: any) {
      return `LSP error: ${err.message}`;
    }
  }

  async hoverInfo(filePath: string, line: number, column: number): Promise<string> {
    const client = this.getClientForFile(filePath);
    if (!client) return 'LSP not available for this file';

    const uri = pathToUri(filePath);
    try {
      const result = await client.hover(uri, line, column);
      if (!result?.contents) return 'No information available';

      const contents = result.contents;
      if (typeof contents === 'string') return contents;
      if (Array.isArray(contents)) {
        return contents.map((c: any) => typeof c === 'string' ? c : c.value || '').join('\n');
      }
      if (contents.value) return contents.value;
      return JSON.stringify(contents);
    } catch (err: any) {
      return `LSP error: ${err.message}`;
    }
  }

  getActiveLanguages(): string[] {
    return [...new Set(this.clients.map(c => c.ready ? 'active' : 'inactive'))];
  }

  isAvailable(): boolean {
    return this.clients.some(c => c.ready);
  }

  async shutdown(): Promise<void> {
    for (const client of this.clients) {
      await client.shutdown();
    }
    this.clients = [];
  }
}

function pathToUri(filePath: string): string {
  const abs = path.resolve(filePath);
  return 'file:///' + abs.replace(/\\/g, '/');
}

function uriToPath(uri: string): string {
  const decoded = decodeURIComponent(uri);
  return decoded.replace(/^file:\/\//, '').replace(/\//g, path.sep);
}
