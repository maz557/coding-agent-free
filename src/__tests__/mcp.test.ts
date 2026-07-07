import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'path';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as os from 'os';
import * as http from 'http';
import { loadMCPConfig } from '../mcp/config';

function createTestDir(): string {
  const d = path.join(os.tmpdir(), `mcp-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  fs.mkdirSync(d, { recursive: true });
  return d;
}

async function startMCPServer(): Promise<number> {
  let sseRes: http.ServerResponse | null = null;
  return new Promise<number>((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.method === 'GET') {
        sseRes = res;
        const p = (server.address() as any).port;
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        });
        res.write(`event: endpoint\ndata: http://localhost:${p}/mcp/messages\n\n`);
      } else if (req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', () => {
          res.writeHead(202, { 'Content-Type': 'application/json' });
          res.end('{}');
          try {
            const msg = JSON.parse(body);
            if (msg.id && sseRes) {
              const resp = JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { ok: true } });
              sseRes.write(`data: ${resp}\n\n`);
            }
          } catch { /* ignore */ }
        });
      }
    });
    server.unref();
    server.listen(0, () => {
      const p = (server.address() as any).port;
      // Auto-close after 5s to prevent leaks
      setTimeout(() => { try { server.close(); } catch {} }, 5000);
      resolve(p);
    });
  });
}

describe('MCP types', () => {
  it('should export LATEST_PROTOCOL_VERSION', () => {
    const types = require('../mcp/types');
    assert.equal(types.LATEST_PROTOCOL_VERSION, '2025-11-25');
    assert.equal(types.JSONRPC_VERSION, '2.0');
  });

  it('should define JSONRPC constants', () => {
    const types = require('../mcp/types');
    assert.equal(typeof types.LATEST_PROTOCOL_VERSION, 'string');
    assert.equal(typeof types.JSONRPC_VERSION, 'string');
  });
});

describe('MCP config loader', () => {
  let origCwd: typeof process.cwd;
  let origHome: string | undefined;

  before(() => {
    origCwd = process.cwd;
    origHome = process.env.HOME;
    const homeDir = path.join(os.tmpdir(), `mcp-home-${Date.now()}`);
    fs.mkdirSync(homeDir, { recursive: true });
    fs.writeFileSync(path.join(homeDir, '.coding-agent.json'), JSON.stringify({
      mcpServers: {
        testServer: { command: 'node', args: ['test.js'] },
        apiServer: { url: 'http://localhost:3000/mcp' },
      },
    }));
    process.cwd = () => path.join(os.tmpdir(), `mcp-work-${Date.now()}`) as any;
    process.env.HOME = homeDir;
  });

  after(() => {
    process.cwd = origCwd;
    process.env.HOME = origHome;
  });

  it('should load MCP config from HOME/.coding-agent.json', () => {
    const config = loadMCPConfig();
    assert(config && typeof config === 'object');
    const keys = Object.keys(config);
    assert(keys.includes('testServer'), `expected 'testServer' in keys: ${JSON.stringify(keys)}`);
    assert('command' in (config.testServer as any));
    assert.equal((config.testServer as any).command, 'node');
    assert('url' in (config.apiServer as any));
    assert.equal((config.apiServer as any).url, 'http://localhost:3000/mcp');
  });

  it('should return empty for missing config', () => {
    const emptyHome = path.join(os.tmpdir(), `mcp-empty-${Date.now()}`);
    fs.mkdirSync(emptyHome, { recursive: true });
    process.env.HOME = emptyHome;
    const config = loadMCPConfig();
    assert.deepEqual(config, {});
  });

  it('should return empty for config without mcpServers', () => {
    const noMcpHome = path.join(os.tmpdir(), `mcp-nomcp-${Date.now()}`);
    fs.mkdirSync(noMcpHome, { recursive: true });
    fs.writeFileSync(path.join(noMcpHome, '.coding-agent.json'), JSON.stringify({ other: 'data' }));
    process.env.HOME = noMcpHome;
    const config = loadMCPConfig();
    assert.deepEqual(config, {});
  });

  it('should find config in cwd with project root', () => {
    const projDir = createTestDir();
    fs.writeFileSync(path.join(projDir, '.coding-agent.json'), JSON.stringify({
      mcpServers: { projServer: { command: 'echo', args: ['hello'] } },
    }));
    const subDir = path.join(projDir, 'sub');
    fs.mkdirSync(subDir, { recursive: true });
    const origCwd2 = process.cwd;
    process.cwd = () => subDir as any;
    const { loadMCPConfig: lmc } = require('../mcp/config');
    const config = lmc();
    assert(config.projServer);
    assert.equal((config.projServer as any).command, 'echo');
    process.cwd = origCwd2;
  });
});

describe('MCP Manager - standalone operations', () => {
  it('should manage empty server state', () => {
    const { MCPManager } = require('../mcp/MCPManager');
    const manager = new MCPManager();
    assert.equal(manager.getServerNames().length, 0);
    assert.deepEqual(manager.getOpenAITools(), []);
    assert.equal(manager.findServerForTool('any'), null);
    assert.equal(manager.getServerToolCount('nonexistent'), 0);
  });

const ECHO_HANDLER = `
const rl = require('readline').createInterface({ input: process.stdin });
rl.on('line', (line) => {
  const msg = JSON.parse(line);
  if (msg.method === 'initialize') {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2025-11-25', capabilities: { tools: {} }, serverInfo: { name: 'test', version: '1.0.0' } } }) + '\\n');
  } else if (msg.method === 'tools/list') {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { tools: [{ name: 'echo', description: 'Echo test', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } }] } }) + '\\n');
  } else if (msg.method === 'tools/call' && msg.params.name === 'echo') {
    const txt = msg.params.arguments?.text || '';
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: 'Echo: ' + txt }] } }) + '\\n');
  } else if (msg.id != null) {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: {} }) + '\\n');
  }
});
`;

  it('should connect and disconnect a server via echo process', async () => {
    const { MCPManager } = require('../mcp/MCPManager');
    const manager = new MCPManager();
    await manager.connectServer('echo-server', {
      command: process.execPath,
      args: ['-e', ECHO_HANDLER],
    });
    assert.equal(manager.getServerNames().length, 1);
    assert.equal(manager.getServerNames()[0], 'echo-server');
    assert.equal(manager.getServerToolCount('echo-server'), 1);
    assert(manager.findServerForTool('echo') === 'echo-server');

    const tools = manager.getOpenAITools();
    assert.equal(tools.length, 1);
    assert.equal(tools[0].function.name, 'echo');

    const result = await manager.callTool('echo-server', 'echo', { text: 'hello' });
    assert.equal(result, 'Echo: hello');

    await manager.disconnectServer('echo-server');
    assert.equal(manager.getServerNames().length, 0);
  });

  it('should throw on duplicate server connect', async () => {
    const { MCPManager } = require('../mcp/MCPManager');
    const manager = new MCPManager();
    await manager.connectServer('dup', {
      command: process.execPath,
      args: ['-e', ECHO_HANDLER],
    });
    await assert.rejects(
      manager.connectServer('dup', { command: process.execPath, args: ['-e', ''] }),
      /already connected/
    );
    await manager.shutdown();
  });

  it('should error on callTool for unknown server', async () => {
    const { MCPManager } = require('../mcp/MCPManager');
    const manager = new MCPManager();
    await assert.rejects(
      manager.callTool('ghost', 'any', {}),
      /not connected/
    );
  });

  it('should shutdown all servers', async () => {
    const { MCPManager } = require('../mcp/MCPManager');
    const manager = new MCPManager();
    await manager.connectServer('s1', {
      command: process.execPath,
      args: ['-e', ECHO_HANDLER],
    });
    assert.equal(manager.getServerNames().length, 1);
    await manager.shutdown();
    assert.equal(manager.getServerNames().length, 0);
  });

  it('should connect to a real MCP echo server and call tools', async () => {
    const { MCPManager } = require('../mcp/MCPManager');
    const manager = new MCPManager();
    const echoServerPath = path.resolve(__dirname, '../../examples/mcp-echo-server.js');
    await manager.connectServer('echo-server', {
      command: process.execPath,
      args: [echoServerPath],
    });

    assert.equal(manager.getServerNames().length, 1);
    assert.equal(manager.getServerNames()[0], 'echo-server');
    assert.equal(manager.getServerToolCount('echo-server'), 1);
    assert.equal(manager.findServerForTool('echo'), 'echo-server');

    const tools = manager.getOpenAITools();
    assert.equal(tools.length, 1);
    assert.equal(tools[0].function.name, 'echo');
    assert(tools[0].function.description?.includes('Echoes'));
    assert(tools[0].function.parameters?.properties?.text);

    const result = await manager.callTool('echo-server', 'echo', { text: 'integration test' });
    assert.equal(result, 'Echo: integration test');

    await manager.shutdown();
    assert.equal(manager.getServerNames().length, 0);
  });
});

describe('StdioTransport - construction and lifecycle', () => {
  it('should construct with command and args', () => {
    const { StdioTransport } = require('../mcp/transport');
    const t = new StdioTransport('node', ['--version']);
    assert(t);
    assert.equal(typeof t.start, 'function');
    assert.equal(typeof t.close, 'function');
    assert.equal(typeof t.request, 'function');
  });

  it('should start, send a request, and close', async () => {
    const { StdioTransport } = require('../mcp/transport');
    const t = new StdioTransport(process.execPath, ['-e', `
const rl = require('readline').createInterface({ input: process.stdin });
rl.on('line', (line) => {
  const msg = JSON.parse(line);
  if (msg.id) {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { echoed: msg } }) + '\\n');
  }
});
setTimeout(() => process.exit(0), 5000);
`]);
    await t.start();
    const result = await t.request('test/method', { foo: 'bar' });
    assert(result);
    assert(typeof result === 'object' && result !== null);
    assert.equal((result as any).echoed.method, 'test/method');
    assert.equal((result as any).echoed.params.foo, 'bar');
    await t.close();
  });

  it('should handle stderr capture on close', async () => {
    const { StdioTransport } = require('../mcp/transport');
    const t = new StdioTransport(process.execPath, ['-e', `
const rl = require('readline').createInterface({ input: process.stdin });
process.stderr.write('error output test\\n');
rl.on('line', () => {
  // never respond, just exit
  process.exit(1);
});
setTimeout(() => process.exit(1), 100);
`]);
    await t.start();
    // request should be rejected with stderr message
    await assert.rejects(
      t.request('some/method', {}),
      /MCP server closed/
    );
  });

  it('should support onMessage callback', async () => {
    const { StdioTransport } = require('../mcp/transport');
    let msgReceived: any = null;
    const t = new StdioTransport(process.execPath, ['-e', `
const rl = require('readline').createInterface({ input: process.stdin });
rl.on('line', (line) => {
  const msg = JSON.parse(line);
  if (msg.id) {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: 'ok' }) + '\\n');
  }
});
`]);
    t.onMessage = (msg: any) => { msgReceived = msg; };
    await t.start();
    const result = await t.request('test/echo', {});
    assert.equal(result, 'ok');
    assert(msgReceived);
    assert.equal(msgReceived.id, 1);
    await t.close();
  });

  it('should fire onClose when process exits', async () => {
    const { StdioTransport } = require('../mcp/transport');
    let closed = false;
    const t = new StdioTransport(process.execPath, ['-e', `
const rl = require('readline').createInterface({ input: process.stdin });
rl.on('line', () => { process.exit(0); });
`]);
    t.onClose = () => { closed = true; };
    await t.start();
    // Send a request that will trigger exit
    await assert.rejects(t.request('test', {}));
    assert.equal(closed, true);
  });
});

describe('HTTPTransport', () => {
  it('should construct and expose methods', () => {
    const { HTTPTransport } = require('../mcp/HTTPTransport');
    const t = new HTTPTransport('http://localhost:9999/mcp');
    assert(t);
    assert.equal(typeof t.start, 'function');
    assert.equal(typeof t.send, 'function');
    assert.equal(typeof t.request, 'function');
    assert.equal(typeof t.close, 'function');
  });

  it('should connect to SSE, send, request, and close', async () => {
    const p = await startMCPServer();
    const { HTTPTransport } = require('../mcp/HTTPTransport');
    const t = new HTTPTransport(`http://localhost:${p}/mcp`);
    await t.start();
    await t.send({ jsonrpc: '2.0', method: 'test', id: 99 });
    const result = await t.request('test/method', { data: 1 });
    assert(result);
    assert.equal((result as any).ok, true);
    await t.close();
  });

  it('should handle multiple requests', async () => {
    const p = await startMCPServer();
    const { HTTPTransport } = require('../mcp/HTTPTransport');
    const t = new HTTPTransport(`http://localhost:${p}/mcp`);
    await t.start();
    const r1 = await t.request('m1', { a: 1 });
    const r2 = await t.request('m2', { b: 2 });
    assert(r1);
    assert(r2);
    await t.close();
  });

  it('should handle onMessage callback', async () => {
    const p = await startMCPServer();
    const { HTTPTransport } = require('../mcp/HTTPTransport');
    const t = new HTTPTransport(`http://localhost:${p}/mcp`);
    let received: any = null;
    t.onMessage = (msg: any) => { received = msg; };
    await t.start();
    await t.request('test', {});
    assert(received);
    assert(received.jsonrpc === '2.0');
    await t.close();
  });

  it('should handle onClose callback', async () => {
    // Use a server where we control the SSE response lifecycle
    let localSSE: http.ServerResponse | null = null;
    const server = http.createServer((req, res) => {
      if (req.method === 'GET') {
        localSSE = res;
        const p = (server.address() as any).port;
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        res.write(`event: endpoint\ndata: http://localhost:${p}/mcp/messages\n\n`);
      } else if (req.method === 'POST') {
        let body = '';
        req.on('data', (c: Buffer) => { body += c.toString(); });
        req.on('end', () => {
          res.writeHead(202, { 'Content-Type': 'application/json' });
          res.end('{}');
          try {
            const msg = JSON.parse(body);
            if (msg.id && localSSE) {
              const resp = JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { ok: true } });
              localSSE.write(`data: ${resp}\n\n`);
            }
          } catch { /* ignore */ }
        });
      }
    });
    const port = await new Promise<number>(r => server.listen(0, () => r((server.address() as any).port)));

    const { HTTPTransport } = require('../mcp/HTTPTransport');
    const t = new HTTPTransport(`http://localhost:${port}/mcp`);
    let closed = false;
    t.onClose = () => { closed = true; };
    await t.start();
    if (localSSE) (localSSE as any).end();
    // Allow the 'end' event to propagate
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(closed, true);
    server.close();
  });

  it('should handle onError callback', async () => {
    let localSSE: http.ServerResponse | null = null;
    const server = http.createServer((req, res) => {
      if (req.method === 'GET') {
        localSSE = res;
        const p = (server.address() as any).port;
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        res.write(`event: endpoint\ndata: http://localhost:${p}/mcp/messages\n\n`);
      } else if (req.method === 'POST') {
        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end('{}');
      }
    });
    const port = await new Promise<number>(r => server.listen(0, () => r((server.address() as any).port)));

    const { HTTPTransport } = require('../mcp/HTTPTransport');
    const t = new HTTPTransport(`http://localhost:${port}/mcp`);
    let errReceived: Error | null = null;
    t.onError = (err: Error) => { errReceived = err; };
    await t.start();
    if (localSSE) (localSSE as any).destroy(new Error('simulated'));
    await new Promise(resolve => setTimeout(resolve, 100));
    assert(errReceived);
    server.close();
  });

  it('should reject connection to unreachable URL', async () => {
    const { HTTPTransport } = require('../mcp/HTTPTransport');
    const t = new HTTPTransport('http://localhost:1');
    await assert.rejects(t.start());
  });

  it('should not crash on send before start', async () => {
    const { HTTPTransport } = require('../mcp/HTTPTransport');
    const t = new HTTPTransport('http://localhost:1');
    await assert.rejects(
      t.send({ jsonrpc: '2.0', method: 'pre', id: 0 }),
      (err: any) => err != null
    );
  });

  it('should not crash request before start', async () => {
    const { HTTPTransport } = require('../mcp/HTTPTransport');
    const t = new HTTPTransport('http://localhost:1');
    await assert.rejects(
      t.request('pre', {}),
      (err: any) => err != null
    );
  });

  it('should parse SSE buffer correctly', async () => {
    const p = await startMCPServer();
    const { HTTPTransport } = require('../mcp/HTTPTransport');
    const t = new HTTPTransport(`http://localhost:${p}/mcp`);
    let msgCount = 0;
    t.onMessage = () => { msgCount++; };
    await t.start();
    await t.request('test', {});
    assert(msgCount >= 1);
    await t.close();
  });
});
