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
    command: 'npx',
    args: ['--yes', 'typescript-language-server', '--stdio'],
    languageId: 'typescript',
    filePatterns: ['**/*.ts', '**/*.tsx'],
  },
];

export interface KnownLSPServer {
  name: string;
  languageId: string;
  filePatterns: string[];
  /** npm package name to install */
  packageName: string;
  /** Binary/command to use — can be a relative path inside node_modules */
  command: string;
  args: string[];
}

/** Static registry of known LSP servers with their install info */
export const KNOWN_LSP_SERVERS: KnownLSPServer[] = [
  { name: 'TypeScript/JavaScript', languageId: 'typescript', filePatterns: ['**/*.ts', '**/*.tsx', '**/*.js'], packageName: 'typescript-language-server', command: 'node.exe', args: ['node_modules/typescript-language-server/lib/cli.mjs', '--stdio'] },
  { name: 'Python', languageId: 'python', filePatterns: ['**/*.py'], packageName: 'pyright', command: 'node.exe', args: ['node_modules/pyright/langserver.index.js', '--stdio'] },
  { name: 'JSON', languageId: 'json', filePatterns: ['**/*.json', '**/*.jsonc'], packageName: 'vscode-json-languageserver', command: 'node.exe', args: ['node_modules/vscode-json-languageserver/out/node/jsonServerMain.js', '--stdio'] },
  { name: 'HTML', languageId: 'html', filePatterns: ['**/*.html', '**/*.htm'], packageName: 'vscode-langservers-extracted', command: 'node.exe', args: ['node_modules/vscode-langservers-extracted/bin/vscode-html-language-server', '--stdio'] },
  { name: 'CSS', languageId: 'css', filePatterns: ['**/*.css', '**/*.scss', '**/*.less'], packageName: 'vscode-langservers-extracted', command: 'node.exe', args: ['node_modules/vscode-langservers-extracted/bin/vscode-css-language-server', '--stdio'] },
  { name: 'Rust', languageId: 'rust', filePatterns: ['**/*.rs'], packageName: 'rust-analyzer', command: 'rust-analyzer', args: [] },
  { name: 'Go', languageId: 'go', filePatterns: ['**/*.go'], packageName: 'gopls', command: 'gopls', args: [] },
  { name: 'SQL', languageId: 'sql', filePatterns: ['**/*.sql'], packageName: 'sql-language-server', command: 'node.exe', args: ['node_modules/sql-language-server/dist/bin.js', '--stdio'] },
];

interface ClientEntry {
  client: LSPClient;
  config: LSPServerConfig;
}

export class LSPManager {
  private entries: ClientEntry[] = [];
  private configs: LSPServerConfig[];

  constructor(configs?: LSPServerConfig[]) {
    this.configs = configs || DEFAULT_LSP_SERVERS;
  }

  addConfig(config: LSPServerConfig): void {
    const idx = this.configs.findIndex(c => c.languageId === config.languageId);
    if (idx >= 0) {
      this.configs[idx] = config; // user config overrides default
    } else {
      this.configs.push(config);
    }
  }

  async startForProject(projectRoot: string, quiet?: boolean): Promise<void> {
    const files = this.findProjectFiles(projectRoot);
    if (files.length === 0) return;

    for (const config of this.configs) {
      const matches = files.filter(f => this.matchesPattern(f, config.filePatterns));
      if (matches.length === 0) continue;
      const uri = pathToUri(projectRoot);
      try {
        const client = new LSPClient(config.command, config.args, uri);
        client.onDiagnostics = (docUri: string, diagnostics: any[]) => {
          if (diagnostics.length > 0) {
            if (!quiet) console.log(`  📋 LSP diagnostics for ${path.basename(uriToPath(docUri))}: ${diagnostics.length} issue(s)`);
          }
        };
        await client.start();
        this.entries.push({ client, config });

        for (const file of matches.slice(0, 50)) {
          const fileUri = pathToUri(file);
          try {
            const content = fs.readFileSync(file, 'utf-8');
            await client.openDocument(fileUri, config.languageId, content);
          } catch { /* skip unreadable */ }
        }
      } catch (err: any) {
        if (!quiet) console.log(`  ⚠️  LSP "${config.command}" failed: ${err.message}`);
      }
    }
  }

  /** Start all configured LSP servers unconditionally (even if no matching files) */
  async startAllServers(projectRoot: string, quiet?: boolean): Promise<void> {
    for (const config of this.configs) {
      try {
        const existing = this.entries.find(e => e.config.languageId === config.languageId);
        if (existing?.client.ready) continue;
        const uri = pathToUri(projectRoot);
        const client = new LSPClient(config.command, config.args, uri);
        client.onDiagnostics = (docUri: string, diagnostics: any[]) => {
          if (diagnostics.length > 0) {
            if (!quiet) console.log(`  📋 LSP diagnostics for ${path.basename(uriToPath(docUri))}: ${diagnostics.length} issue(s)`);
          }
        };
        await client.start();
        this.entries.push({ client, config });
      } catch (err: any) {
        if (!quiet) console.log(`  ⚠️  LSP "${config.command}" failed: ${err.message}`);
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
    const normPath = filePath.replace(/\\/g, '/');
    for (const { client, config } of this.entries) {
      if (!client.ready) continue;
      if (this.matchesPattern(normPath, config.filePatterns)) return client;
    }
    // fallback: first ready client
    return this.entries.find(e => e.client.ready)?.client || null;
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

  async lookupSymbol(query: string): Promise<string> {
    const ready = this.entries.filter(e => e.client.ready);
    if (ready.length === 0) return 'LSP not available';

    let results: string[] = [];
    for (const { client, config } of ready) {
      try {
        const result = await client.workspaceSymbol(query);
        if (result && result.length > 0) {
          const lang = config.languageId;
          for (const s of result.slice(0, 10)) {
            const loc = s.location;
            const p = uriToPath(loc.uri);
            const start = loc.range?.start || { line: 0, character: 0 };
            const kind = s.kind !== undefined ? symbolKindLabel(s.kind) : 'unknown';
            results.push(`${s.name} (${kind}) [${lang}] — ${p}:${start.line + 1}:${start.character + 1}`);
          }
        }
      } catch { /* skip */ }
    }
    return results.length > 0 ? results.join('\n') : 'No symbols found';
  }

  async getFileDiagnostics(filePath: string): Promise<string> {
    const client = this.getClientForFile(filePath);
    if (!client) return 'LSP not available for this file';

    const uri = pathToUri(filePath);

    // Try pull-based diagnostics first (textDocument/diagnostic)
    try {
      const result = await client.getDiagnostics(uri);
      const items = this._extractDiagItems(result);
      if (items && items.length > 0) {
        return this._formatDiagnostics(items);
      }
    } catch { /* fall through to stored diagnostics */ }

    // Fallback to stored push diagnostics (textDocument/publishDiagnostics)
    const stored = client.getStoredDiagnostics(uri);
    if (stored && stored.length > 0) {
      return this._formatDiagnostics(stored);
    }

    return 'No diagnostics';
  }

  /** Extract diagnostic items from either an array or a DocumentDiagnosticReport object */
  private _extractDiagItems(result: any): any[] | null {
    if (!result) return null;
    if (Array.isArray(result)) return result;
    if (result.items && Array.isArray(result.items)) return result.items;
    return null;
  }

  private _formatDiagnostics(diags: any[]): string {
    return diags.map((d: any) => {
      const start = d.range?.start || { line: 0, character: 0 };
      const sev = d.severity === 1 ? 'Error' : d.severity === 2 ? 'Warning' : 'Info';
      return `  ${sev} at ${start.line + 1}:${start.character + 1} — ${d.message}`;
    }).join('\n');
  }

  getClientInfo(): { command: string; languageId: string; ready: boolean; openFiles: number }[] {
    return this.entries.map(e => ({
      command: e.client.serverCommand,
      languageId: e.config.languageId,
      ready: e.client.ready,
      openFiles: e.client.openDocCount,
    }));
  }

  isAvailable(): boolean {
    return this.entries.some(e => e.client.ready);
  }

  getActiveLanguages(): string[] {
    return this.entries.filter(e => e.client.ready).map(e => e.config.languageId);
  }

  /** Find a known LSP server config that matches the given file path */
  static getServerForFile(filePath: string): KnownLSPServer | null {
    const normPath = filePath.replace(/\\/g, '/');
    for (const srv of KNOWN_LSP_SERVERS) {
      for (const pattern of srv.filePatterns) {
        const regexStr = pattern.split('**').map(s => s.replace(/\*/g, '[^/]*').replace(/\?/g, '.')).join('.*');
        if (new RegExp('^' + regexStr + '$').test(normPath)) return srv;
      }
    }
    return null;
  }

  /** Check if a given known LSP server is already registered */
  hasLanguage(languageId: string): boolean {
    return this.configs.some(c => c.languageId === languageId);
  }

  /** Auto-install the npm package, register the LSP server config, and start it */
  async autoInstallAndStart(filePath: string, cwd: string): Promise<string> {
    const known = LSPManager.getServerForFile(filePath);
    if (!known) return `No known LSP server for ${path.extname(filePath)} files`;

    if (this.hasLanguage(known.languageId)) {
      // Already registered — just ensure it has a client for this file
      const existing = this.getClientForFile(filePath);
      if (existing?.ready) return `LSP for ${known.languageId} already running`;
    }

    // Check if the npm package is already installed
    const pkgPath = path.join(cwd, 'node_modules', known.packageName, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      const { execSync } = require('child_process');
      try {
        execSync(`npm install --save-dev ${known.packageName}`, { cwd, stdio: 'pipe', timeout: 120000 });
      } catch (err: any) {
        return `Failed to install ${known.packageName}: ${err.message}`;
      }
    }

    // Register the config
    const config: LSPServerConfig = {
      command: known.command,
      args: known.args,
      languageId: known.languageId,
      filePatterns: known.filePatterns,
    };
    this.addConfig(config);

    // Start the server for this project
    try {
      const uri = pathToUri(cwd);
      const client = new LSPClient(config.command, config.args, uri);
      client.onDiagnostics = (docUri: string, diagnostics: any[]) => {
        if (diagnostics.length > 0) {
          console.log(`  📋 LSP diagnostics for ${path.basename(uriToPath(docUri))}: ${diagnostics.length} issue(s)`);
        }
      };
      await client.start();
      this.entries.push({ client, config });

      // Open the file
      if (fs.existsSync(filePath)) {
        const fileUri = pathToUri(filePath);
        const content = fs.readFileSync(filePath, 'utf-8');
        await client.openDocument(fileUri, known.languageId, content);
      }
      return `✅ LSP ${known.name} installed and started`;
    } catch (err: any) {
      return `⚠️ LSP ${known.name} installed but failed to start: ${err.message}`;
    }
  }

  async shutdown(): Promise<void> {
    for (const { client } of this.entries) {
      await client.shutdown();
    }
    this.entries = [];
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

const SYMBOL_KINDS: Record<number, string> = {
  1: 'File', 2: 'Module', 3: 'Namespace', 4: 'Package', 5: 'Class',
  6: 'Method', 7: 'Property', 8: 'Field', 9: 'Constructor', 10: 'Enum',
  11: 'Interface', 12: 'Function', 13: 'Variable', 14: 'Constant',
  15: 'String', 16: 'Number', 17: 'Boolean', 18: 'Array',
  19: 'Object', 20: 'Key', 21: 'Null', 22: 'EnumMember',
  23: 'Struct', 24: 'Event', 25: 'Operator', 26: 'TypeParameter',
};

function symbolKindLabel(kind: number): string {
  return SYMBOL_KINDS[kind] || `kind_${kind}`;
}
