import { spawn, ChildProcess } from 'child_process';
import { Transport, JSONRPCMessage, JSONRPCResponse } from './types';
import * as readline from 'readline';

export class StdioTransport implements Transport {
  private process: ChildProcess | null = null;
  private rl: readline.Interface | null = null;
  private _onMessage: ((message: JSONRPCMessage) => void) | null = null;
  private _onClose: (() => void) | null = null;
  private _onError: ((error: Error) => void) | null = null;
  private pending = new Map<string | number, { resolve: (value: unknown) => void; reject: (err: Error) => void }>();
  private msgId = 0;
  private stderrBuf = '';

  constructor(
    private readonly command: string,
    private readonly args: string[],
    private readonly env?: Record<string, string>,
  ) {}

  get onMessage() { return this._onMessage; }
  set onMessage(fn) { this._onMessage = fn; }

  get onClose() { return this._onClose; }
  set onClose(fn) { this._onClose = fn; }

  get onError() { return this._onError; }
  set onError(fn) { this._onError = fn; }

  async start(): Promise<void> {
    this.process = spawn(this.command, this.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...this.env },
    });

    this.rl = readline.createInterface({ input: this.process.stdout! });

    this.rl.on('line', (line: string) => {
      try {
        const msg = JSON.parse(line) as any;
        if (msg.id !== undefined && msg.id !== null) {
          const pending = this.pending.get(msg.id);
          if (pending) {
            this.pending.delete(msg.id);
            if (msg.error) {
              pending.reject(new Error(msg.error.message || 'MCP error'));
            } else {
              // Extract result field if present, otherwise return whole msg
              pending.resolve('result' in msg ? msg.result : msg);
            }
          }
        }
        if (this._onMessage) {
          this._onMessage(msg as JSONRPCMessage);
        }
      } catch {
        // ignore malformed lines
      }
    });

    this.process.on('close', (code) => {
      if (this._onClose) this._onClose();
      const reason = this.stderrBuf
        ? `MCP server closed (exit ${code}): ${this.stderrBuf.trim().slice(0, 200)}`
        : `MCP server closed (exit ${code})`;
      for (const [, p] of this.pending) {
        p.reject(new Error(reason));
      }
      this.pending.clear();
    });

    this.process.on('error', (err) => {
      if (this._onError) this._onError(err);
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      this.stderrBuf += data.toString();
    });
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.process?.stdin) throw new Error('MCP transport not connected');
    this.process.stdin.write(JSON.stringify(message) + '\n');
  }

  async request(method: string, params?: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = ++this.msgId;
      this.pending.set(id, { resolve, reject });
      this.send({
        jsonrpc: '2.0' as const,
        id,
        method,
        params,
      }).catch(reject);
    });
  }

  async close(): Promise<void> {
    this.rl?.close();
    this.rl = null;
    if (this.process) {
      this.process.kill();
      this.process.stdout?.destroy();
      this.process.stderr?.destroy();
      this.process.stdin?.end();
      // Wait briefly for process to exit (but don't block forever)
      await Promise.race([
        new Promise(resolve => this.process!.once('exit', resolve)),
        new Promise(resolve => setTimeout(resolve, 2000)),
      ]);
      this.process = null;
    }
  }
}
