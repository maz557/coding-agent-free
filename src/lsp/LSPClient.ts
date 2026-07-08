import { spawn, ChildProcess } from 'child_process';

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
}

export class LSPClient {
  private process: ChildProcess | null = null;
  private msgId = 0;
  private pending = new Map<number, PendingRequest>();
  private buffer = '';
  private _ready = false;
  private capabilities: Record<string, unknown> = {};
  private _onDiagnostics: ((uri: string, diagnostics: any[]) => void) | null = null;

  get ready(): boolean { return this._ready; }
  get serverCommand(): string { return this.command; }
  openDocCount = 0;

  constructor(
    private readonly command: string,
    private readonly args: string[],
    private readonly rootUri: string,
  ) {}

  get onDiagnostics(): ((uri: string, diagnostics: any[]) => void) | null {
    return this._onDiagnostics;
  }

  set onDiagnostics(fn: ((uri: string, diagnostics: any[]) => void) | null) {
    this._onDiagnostics = fn;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const useShell = process.platform === 'win32';
      if (useShell) {
        const cmd = [this.command, ...this.args].map(a => a.includes(' ') ? `"${a}"` : a).join(' ');
        this.process = spawn(cmd, [], { stdio: ['pipe', 'pipe', 'pipe'], shell: true });
      } else {
        this.process = spawn(this.command, this.args, { stdio: ['pipe', 'pipe', 'pipe'] });
      }

      let initialized = false;
      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error(`LSP server timeout: ${this.command}`));
        }
      }, 15000);
      const finish = (err?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (err) reject(err);
        else resolve();
      };

      this.process.stdout!.on('data', (data: Buffer) => {
        this.buffer += data.toString();
        this.processBuffer();
      });

      this.process.on('error', (err: any) => {
        if (!useShell && process.platform === 'win32' && err.code === 'ENOENT') {
          const cmd = [this.command, ...this.args].map(a => a.includes(' ') ? `"${a}"` : a).join(' ');
          this.process = spawn(cmd, [], { stdio: ['pipe', 'pipe', 'pipe'], shell: true });
          this.process.stdout!.on('data', (data: Buffer) => {
            this.buffer += data.toString();
            this.processBuffer();
          });
          this.process.on('error', (e: any) => finish(e));
          this.process.on('close', () => {
            if (!initialized) finish(new Error(`LSP server exited: ${this.command}`));
          });
          return;
        }
        finish(err);
      });
      this.process.on('close', () => {
        if (!initialized) finish(new Error(`LSP server exited: ${this.command}`));
      });

      // Initialize LSP
      this.request('initialize', {
        processId: process.pid,
        rootUri: this.rootUri,
        capabilities: {
          textDocument: {
            hover: { contentFormat: ['markdown', 'plaintext'] },
            definition: { dynamicRegistration: false },
            references: { dynamicRegistration: false },
            completion: { completionItem: { snippetSupport: false } },
            diagnostic: { dynamicRegistration: false },
          },
        },
      }).then((result: any) => {
        initialized = true;
        this.capabilities = result?.capabilities || {};
        this._ready = true;
        this.notify('initialized', {});
        finish();
      }).catch((e: any) => finish(e));
    });
  }

  private processBuffer(): void {
    const headerMatch = /Content-Length: (\d+)\r\n\r\n/;
    while (true) {
      const m = this.buffer.match(headerMatch);
      if (!m) break;
      const headerEnd = m.index! + m[0].length;
      const bodyLen = parseInt(m[1], 10);
      if (this.buffer.length < headerEnd + bodyLen) break;
      const body = this.buffer.slice(headerEnd, headerEnd + bodyLen);
      this.buffer = this.buffer.slice(headerEnd + bodyLen);
      try {
        this.handleMessage(JSON.parse(body));
      } catch { /* ignore malformed */ }
    }
  }

  private handleMessage(msg: any): void {
    // Response to a request
    if (msg.id !== undefined && msg.id !== null) {
      const pending = this.pending.get(msg.id);
      if (pending) {
        this.pending.delete(msg.id);
        if (msg.error) {
          pending.reject(new Error(msg.error.message || 'LSP error'));
        } else {
          pending.resolve(msg.result);
        }
      }
      return;
    }

    // Notification
    if (msg.method === 'textDocument/publishDiagnostics') {
      this._onDiagnostics?.(msg.params.uri, msg.params.diagnostics);
    }
  }

  async request(method: string, params: unknown): Promise<unknown> {
    const id = ++this.msgId;
    const msg = { jsonrpc: '2.0', id, method, params };

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.send(msg);
    });
  }

  notify(method: string, params: unknown): void {
    this.send({ jsonrpc: '2.0', method, params });
  }

  private send(msg: unknown): void {
    if (!this.process?.stdin) throw new Error('LSP not connected');
    const header = `Content-Length: ${JSON.stringify(msg).length}\r\n\r\n`;
    this.process.stdin.write(header + JSON.stringify(msg));
  }

  async openDocument(uri: string, languageId: string, text: string): Promise<void> {
    await this.waitForReady();
    this.notify('textDocument/didOpen', {
      textDocument: { uri, languageId, version: 1, text },
    });
    this.openDocCount++;
  }

  async changeDocument(uri: string, text: string, version: number): Promise<void> {
    await this.waitForReady();
    this.notify('textDocument/didChange', {
      textDocument: { uri, version },
      contentChanges: [{ text }],
    });
  }

  async closeDocument(uri: string): Promise<void> {
    await this.waitForReady();
    this.notify('textDocument/didClose', { textDocument: { uri } });
  }

  async goToDefinition(uri: string, line: number, character: number): Promise<any> {
    await this.waitForReady();
    return this.request('textDocument/definition', {
      textDocument: { uri },
      position: { line, character },
    });
  }

  async findReferences(uri: string, line: number, character: number): Promise<any> {
    await this.waitForReady();
    return this.request('textDocument/references', {
      textDocument: { uri },
      position: { line, character },
      context: { includeDeclaration: true },
    });
  }

  async hover(uri: string, line: number, character: number): Promise<any> {
    await this.waitForReady();
    return this.request('textDocument/hover', {
      textDocument: { uri },
      position: { line, character },
    });
  }

  async getDiagnostics(uri: string): Promise<any> {
    await this.waitForReady();
    // Pull diagnostics (supported by some servers)
    return this.request('textDocument/diagnostic', {
      textDocument: { uri },
    }).catch(() => []); // fallback if not supported
  }

  async workspaceSymbol(query: string): Promise<any> {
    await this.waitForReady();
    return this.request('workspace/symbol', { query });
  }

  private async waitForReady(): Promise<void> {
    if (this._ready) return;
    await new Promise<void>(resolve => {
      const check = () => {
        if (this._ready) resolve();
        else setTimeout(check, 10);
      };
      check();
    });
  }

  async shutdown(): Promise<void> {
    try {
      await this.request('shutdown', null);
    } catch { /* ignore */ }
    this.notify('exit', null);
    if (this.process) {
      this.process.stdin?.end();
      this.process.stdout?.destroy();
      this.process.stderr?.destroy();
      this.process.kill();
    }
  }
}
