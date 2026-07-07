import { Transport, JSONRPCMessage, JSONRPCResponse } from './types';
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';

export class HTTPTransport implements Transport {
  private _onMessage: ((message: JSONRPCMessage) => void) | null = null;
  private _onClose: (() => void) | null = null;
  private _onError: ((error: Error) => void) | null = null;
  private sessionId: string | null = null;
  private baseUrl: string;
  private abortController: AbortController | null = null;
  private msgId = 0;
  private pending = new Map<string | number, { resolve: (value: unknown) => void; reject: (err: Error) => void }>();

  constructor(private readonly endpointUrl: string) {
    this.baseUrl = endpointUrl.replace(/\/+$/, '');
  }

  get onMessage() { return this._onMessage; }
  set onMessage(fn) { this._onMessage = fn; }

  get onClose() { return this._onClose; }
  set onClose(fn) { this._onClose = fn; }

  get onError() { return this._onError; }
  set onError(fn) { this._onError = fn; }

  async start(): Promise<void> {
    this.abortController = new AbortController();

    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(this.baseUrl);
      const httpModule = parsedUrl.protocol === 'https:' ? https : http;
      const options: http.RequestOptions = {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      };

      const req = httpModule.request(this.baseUrl, options, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} connecting to ${this.baseUrl}`));
          return;
        }

        let buffer = '';
        let resolved = false;

        res.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();

          const events = buffer.split('\n\n');
          buffer = events.pop() || '';

          for (const event of events) {
            const lines = event.split('\n');
            let eventType = '';
            let data = '';

            for (const line of lines) {
              if (line.startsWith('event: ')) eventType = line.slice(7);
              if (line.startsWith('data: ')) data = line.slice(6);
            }

            if (eventType === 'endpoint') {
              // New SSE session - data contains the POST endpoint
              this.sessionId = data.trim();
              if (!resolved) {
                resolved = true;
                resolve();
              }
            }

            if (data && eventType !== 'endpoint') {
              try {
                const msg = JSON.parse(data) as JSONRPCMessage;
                if (this._onMessage) {
                  this._onMessage(msg);
                }
                // Handle as response
                const resp = msg as JSONRPCResponse;
                if (resp.id !== undefined && this.pending.has(resp.id)) {
                  const p = this.pending.get(resp.id)!;
                  this.pending.delete(resp.id);
                  if (resp.error) {
                    p.reject(new Error(resp.error.message || 'MCP error'));
                  } else {
                    p.resolve(resp.result);
                  }
                }
              } catch { /* ignore */ }
            }
          }
        });

        res.on('end', () => {
          if (this._onClose) this._onClose();
        });

        res.on('error', (err) => {
          if (this._onError) this._onError(err);
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  async send(message: JSONRPCMessage): Promise<void> {
    const postUrl = this.sessionId ? this.sessionId : this.baseUrl;
    const parsedUrl = new URL(postUrl);
    const httpModule = parsedUrl.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      const data = JSON.stringify(message);
      const options: http.RequestOptions = {
        method: 'POST',
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      };

      const req = httpModule.request(options, (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  async request(method: string, params?: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = ++this.msgId;
      this.pending.set(id, { resolve, reject });
      this.send({
        jsonrpc: '2.0',
        id,
        method,
        params,
      }).catch(reject);
    });
  }

  async close(): Promise<void> {
    this.abortController?.abort();
  }
}
