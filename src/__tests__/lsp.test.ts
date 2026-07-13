import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'path';
import * as os from 'os';
import * as fsp from 'fs/promises';
import * as fs from 'fs';

// Helper: minimal LSP server script that speaks Content-Length JSON-RPC
const LSP_SERVER_SCRIPT = `
let buf = '';
process.stdin.on('data', (chunk) => {
  buf += chunk.toString();
  while (true) {
    const m = buf.match(/Content-Length: (\\d+)\\r\\n\\r\\n/);
    if (!m) break;
    const headerEnd = m.index + m[0].length;
    const len = parseInt(m[1]);
    if (buf.length < headerEnd + len) break;
    const content = buf.slice(headerEnd, headerEnd + len);
    buf = buf.slice(headerEnd + len);
    const msg = JSON.parse(content);
    handle(msg);
  }
});

function handle(msg) {
  if (msg.method === 'initialize') {
    send(msg.id, { capabilities: { textDocument: { definition: true, references: true, hover: true, diagnostic: true } }, serverInfo: { name: 'test-lsp', version: '1.0.0' } });
  } else if (msg.method === 'textDocument/definition') {
    send(msg.id, [{ uri: msg.params.textDocument.uri, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } } }]);
  } else if (msg.method === 'textDocument/references') {
    send(msg.id, [{ uri: msg.params.textDocument.uri, range: { start: { line: 1, character: 2 }, end: { line: 1, character: 6 } } }]);
  } else if (msg.method === 'textDocument/hover') {
    send(msg.id, { contents: { kind: 'plaintext', value: 'Test hover info' } });
  } else if (msg.method === 'textDocument/diagnostic') {
    send(msg.id, { kind: 'full', items: [{ message: 'test diagnostic', range: { start: { line:0,character:0 }, end: { line:0,character:1 } } }] });
  } else if (msg.method === 'shutdown') {
    send(msg.id, null);
    setTimeout(() => process.exit(0), 10);
  } else if (msg.id != null) {
    send(msg.id, null);
  }
}

function send(id, result) {
  const resp = JSON.stringify({ jsonrpc: '2.0', id, result });
  process.stdout.write('Content-Length: ' + resp.length + '\\r\\n\\r\\n' + resp + '\\n');
}
`;

async function withLSPServer<T>(fn: (client: any) => Promise<T>): Promise<T> {
  // Use require inside function so it's fresh each call
  const { LSPClient } = require('../lsp/LSPClient');
  const client = new LSPClient(process.execPath, ['-e', LSP_SERVER_SCRIPT], 'file:///test');
  try {
    await client.start();
    return await fn(client);
  } finally {
    await client.shutdown().catch(() => {});
  }
}

describe('LSP tool definitions', () => {
  it('should export lspToolDefinitions with 5 tools', () => {
    const { lspToolDefinitions } = require('../lsp/index');
    assert.equal(lspToolDefinitions.length, 5);

    const names = lspToolDefinitions.map((t: any) => t.function.name);
    assert(names.includes('code_definition'));
    assert(names.includes('code_references'));
    assert(names.includes('code_hover'));
    assert(names.includes('code_lookup_symbol'));
    assert(names.includes('code_get_diagnostics'));

    const desc = lspToolDefinitions[0].function.description;
    assert(typeof desc === 'string' && desc.length > 0);
  });
});

describe('LSP tool execution without server', () => {
  it('should return fallback message when LSP not available', async () => {
    const { executeLSPServerTool, lspManager } = require('../lsp/index');
    await lspManager.shutdown();

    const result = await executeLSPServerTool('code_definition', {
      file: 'test.ts',
      line: 0,
      column: 0,
    });

    assert(result.includes('LSP not available') || result.includes('failed'));
  });
});

describe('executeLSPServerTool — argPath normalization', () => {
  let origDir: string | undefined;

  before(() => {
    origDir = process.env.ALLOWED_DIR;
    process.env.ALLOWED_DIR = '/tmp';
  });

  after(() => {
    process.env.ALLOWED_DIR = origDir;
  });

  it('should return error when no file or path provided', async () => {
    const { lspManager, executeLSPServerTool } = require('../lsp/index');
    await lspManager.shutdown();

    for (const tool of ['code_definition', 'code_references', 'code_hover', 'code_get_diagnostics']) {
      const r = await executeLSPServerTool(tool, {});
      assert(r.includes('Missing required path'), `${tool} should complain about missing path, got: ${r}`);
    }
  });

  it('should accept "path" as alias for "file"', async () => {
    const { lspManager, executeLSPServerTool } = require('../lsp/index');
    await lspManager.shutdown();

    const r = await executeLSPServerTool('code_get_diagnostics', { path: '/some/file.ts' });
    // Should try to use the path (LSP not available since we shut it down, but no crash)
    assert(!r.includes('paths['), `should not crash with paths[] error, got: ${r}`);
    assert(r.includes('LSP not available') || r.includes('No diagnostics') || r.includes('Failed'));
  });

  it('should prefer "file" over "path" when both given', async () => {
    const { lspManager, executeLSPServerTool } = require('../lsp/index');
    await lspManager.shutdown();

    const r = await executeLSPServerTool('code_get_diagnostics', { file: '/primary.ts', path: '/secondary.ts' });
    assert(!r.includes('paths['), `should not crash, got: ${r}`);
  });
});

describe('LSPManager - pattern matching', () => {
  let lspManager: any;

  before(async () => {
    const { LSPManager } = require('../lsp/LSPManager');
    lspManager = new LSPManager([]);
  });

  it('should return isAvailable=false when no clients', () => {
    assert.equal(lspManager.isAvailable(), false);
  });

  it('should return getClientForFile=null when no clients', () => {
    assert.equal(lspManager.getClientForFile('test.ts'), null);
  });

  it('should handle shutdown gracefully when no clients', async () => {
    await lspManager.shutdown();
    assert.equal(lspManager.isAvailable(), false);
  });
});

describe('LSPManager - file pattern matching', () => {
  it('should match .ts files for typescript pattern', () => {
    const { LSPManager } = require('../lsp/LSPManager');
    const lsp = new LSPManager([
      { command: 'test', args: [], languageId: 'typescript', filePatterns: ['**/*.ts'] },
    ]);
    const matches = (lsp as any).matchesPattern('src/foo.ts', ['**/*.ts']);
    assert.equal(matches, true);
  });

  it('should not match .js for .ts pattern', () => {
    const { LSPManager } = require('../lsp/LSPManager');
    const lsp = new LSPManager();
    const matches = (lsp as any).matchesPattern('src/foo.js', ['**/*.ts']);
    assert.equal(matches, false);
  });

  it('should match typescript patterns', () => {
    const { LSPManager } = require('../lsp/LSPManager');
    const lsp = new LSPManager();
    assert((lsp as any).matchesPattern('src/app.tsx', ['**/*.tsx']));
  });

  it('should match .rb files for ruby pattern', () => {
    const { LSPManager } = require('../lsp/LSPManager');
    const lsp = new LSPManager();
    assert((lsp as any).matchesPattern('app/models/user.rb', ['**/*.rb']));
  });

  it('should match .lua files for lua pattern', () => {
    const { LSPManager } = require('../lsp/LSPManager');
    const lsp = new LSPManager();
    assert((lsp as any).matchesPattern('src/main.lua', ['**/*.lua']));
  });

  it('should match .c and .h files for C pattern', () => {
    const { LSPManager } = require('../lsp/LSPManager');
    const lsp = new LSPManager();
    assert((lsp as any).matchesPattern('src/main.c', ['**/*.c', '**/*.h']));
    assert((lsp as any).matchesPattern('include/header.h', ['**/*.c', '**/*.h']));
  });

  it('should match .cpp, .hpp, .cc, .cxx files for C++ pattern', () => {
    const { LSPManager } = require('../lsp/LSPManager');
    const lsp = new LSPManager();
    assert((lsp as any).matchesPattern('src/main.cpp', ['**/*.cpp', '**/*.hpp', '**/*.cc', '**/*.cxx']));
    assert((lsp as any).matchesPattern('include/header.hpp', ['**/*.cpp', '**/*.hpp', '**/*.cc', '**/*.cxx']));
    assert((lsp as any).matchesPattern('src/util.cc', ['**/*.cpp', '**/*.hpp', '**/*.cc', '**/*.cxx']));
    assert((lsp as any).matchesPattern('src/util.cxx', ['**/*.cpp', '**/*.hpp', '**/*.cc', '**/*.cxx']));
  });

  it('should match .sql files for SQL pattern', () => {
    const { LSPManager } = require('../lsp/LSPManager');
    const lsp = new LSPManager();
    assert((lsp as any).matchesPattern('db/query.sql', ['**/*.sql']));
  });
});

describe('LSP config loader', () => {
  let origCwd: typeof process.cwd;
  let origHome: string | undefined;

  before(() => {
    origCwd = process.cwd;
    origHome = process.env.HOME;
    const homeDir = path.join(os.tmpdir(), `lsp-config-home-${Date.now()}`);
    fs.mkdirSync(homeDir, { recursive: true });
    fs.writeFileSync(path.join(homeDir, '.coding-agent.json'), JSON.stringify({
      lspServers: [
        { command: 'mylsp', args: ['--stdio'], languageId: 'mylang', filePatterns: ['**/*.my'] },
      ],
    }));
    process.cwd = () => homeDir as any;
    process.env.HOME = homeDir;
  });

  after(() => {
    process.cwd = origCwd;
    process.env.HOME = origHome;
  });

  it('should load LSP config from .coding-agent.json', () => {
    const { loadLSPConfig } = require('../lsp/config');
    const configs = loadLSPConfig();
    assert.equal(configs.length, 1);
    assert.equal(configs[0].command, 'mylsp');
    assert.equal(configs[0].languageId, 'mylang');
    assert.deepEqual(configs[0].filePatterns, ['**/*.my']);
  });

  it('should return empty for missing lspServers', () => {
    fs.writeFileSync(path.join(process.env.HOME!, '.coding-agent.json'), JSON.stringify({}));
    const { loadLSPConfig } = require('../lsp/config');
    const configs = loadLSPConfig();
    assert.equal(configs.length, 0);
  });

  it('should return empty for invalid entries', () => {
    fs.writeFileSync(path.join(process.env.HOME!, '.coding-agent.json'), JSON.stringify({
      lspServers: [{ bad: 'data' }],
    }));
    const { loadLSPConfig } = require('../lsp/config');
    const configs = loadLSPConfig();
    assert.equal(configs.length, 0);
  });

  it('should find config in subdirectory via project root walk', () => {
    const projDir = path.join(os.tmpdir(), `lsp-proj-${Date.now()}`);
    fs.mkdirSync(projDir, { recursive: true });
    fs.writeFileSync(path.join(projDir, '.coding-agent.json'), JSON.stringify({
      lspServers: [{ command: 'found', args: [], languageId: 'ok', filePatterns: ['**/*.ok'] }],
    }));
    const subDir = path.join(projDir, 'deep', 'nested');
    fs.mkdirSync(subDir, { recursive: true });
    const origCwd2 = process.cwd;
    process.cwd = () => subDir as any;
    process.env.HOME = os.tmpdir();
    const { loadLSPConfig: llc } = require('../lsp/config');
    const configs = llc();
    assert.equal(configs.length, 1);
    assert.equal(configs[0].command, 'found');
    process.cwd = origCwd2;
  });
});

describe('LSPManager - startForProject on empty dir', () => {
  let tmpDir: string;

  before(async () => {
    tmpDir = path.join(os.tmpdir(), `lsp-test-${Date.now()}`);
    await fsp.mkdir(tmpDir, { recursive: true });
  });

  after(async () => {
    await fsp.rm(tmpDir, { recursive: true, force: true });
  });

  it('should skip when no matching files', async () => {
    const { LSPManager } = require('../lsp/LSPManager');
    const lsp = new LSPManager();
    await lsp.startForProject(tmpDir);
    assert.equal(lsp.isAvailable(), false);
    await lsp.shutdown();
  });

  it('should start server for matching files', async () => {
    await fsp.writeFile(path.join(tmpDir, 'test.ts'), 'const x = 1;\n');
    const { LSPManager } = require('../lsp/LSPManager');
    // Use minimal config that won't fail
    const lsp = new LSPManager([
      { command: process.execPath, args: ['-e', LSP_SERVER_SCRIPT], languageId: 'typescript', filePatterns: ['**/*.ts'] },
    ]);
    await lsp.startForProject(tmpDir);
    assert.equal(lsp.isAvailable(), true);
    assert(lsp.getClientForFile(path.join(tmpDir, 'test.ts')));
    await lsp.shutdown();
  });
});

describe('LSPClient', () => {
  it('should construct and expose initial state', () => {
    const { LSPClient } = require('../lsp/LSPClient');
    const client = new LSPClient('node', [], 'file:///test');
    assert(client);
    assert.equal(client.ready, false);
    assert.equal(typeof client.onDiagnostics, 'object');
    client.onDiagnostics = (uri: string, diags: any[]) => {};
    assert(typeof client.onDiagnostics === 'function');
  });

  it('should start and connect to LSP server', async () => {
    const { LSPClient } = require('../lsp/LSPClient');
    const client = new LSPClient(process.execPath, ['-e', LSP_SERVER_SCRIPT], 'file:///test');
    await client.start();
    assert.equal(client.ready, true);
    await client.shutdown();
  });

  it('should send notifications', async () => {
    await withLSPServer(async (client) => {
      client.notify('test/notification', { data: 1 });
    });
  });

  it('should make requests and receive responses', async () => {
    await withLSPServer(async (client) => {
      const result = await client.request('test/request', {});
      assert(result !== undefined);
    });
  });

  it('should open, change, and close documents', async () => {
    await withLSPServer(async (client) => {
      await client.openDocument('file:///test.ts', 'typescript', 'const x = 1;');
      await client.changeDocument('file:///test.ts', 'const x = 2;', 2);
      await client.closeDocument('file:///test.ts');
    });
  });

  it('should go to definition', async () => {
    await withLSPServer(async (client) => {
      await client.openDocument('file:///test.ts', 'typescript', 'const x = 1;');
      const result = await client.goToDefinition('file:///test.ts', 0, 6);
      assert(result);
      assert(Array.isArray(result));
      assert(result[0].uri);
    });
  });

  it('should find references', async () => {
    await withLSPServer(async (client) => {
      await client.openDocument('file:///test.ts', 'typescript', 'const x = 1;');
      const result = await client.findReferences('file:///test.ts', 0, 6);
      assert(result);
      assert(Array.isArray(result));
    });
  });

  it('should get hover info', async () => {
    await withLSPServer(async (client) => {
      await client.openDocument('file:///test.ts', 'typescript', 'const x = 1;');
      const result = await client.hover('file:///test.ts', 0, 6);
      assert(result);
      assert(result.contents);
    });
  });

  it('should get diagnostics', async () => {
    await withLSPServer(async (client) => {
      await client.openDocument('file:///test.ts', 'typescript', 'const x = 1;');
      const result = await client.getDiagnostics('file:///test.ts');
      // May be empty if server doesn't support pull diagnostics
      assert(Array.isArray(result) || typeof result === 'object');
    });
  });

  it('should store and return push diagnostics', async () => {
    const { LSPClient } = require('../lsp/LSPClient');
    const client = new LSPClient(process.execPath, ['-e', `
let buf = '';
process.stdin.on('data', (chunk) => {
  buf += chunk.toString();
  while (true) {
    const m = buf.match(/Content-Length: (\\d+)\\r\\n\\r\\n/);
    if (!m) break;
    const headerEnd = m.index + m[0].length;
    const len = parseInt(m[1]);
    if (buf.length < headerEnd + len) break;
    const content = buf.slice(headerEnd, headerEnd + len);
    buf = buf.slice(headerEnd + len);
    const msg = JSON.parse(content);
    if (msg.method === 'initialize') {
      const resp = JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { capabilities: {} } });
      process.stdout.write('Content-Length: ' + resp.length + '\\r\\n\\r\\n' + resp + '\\n');
    } else {
      // Always push diagnostics after any request
      const diag = JSON.stringify({ jsonrpc: '2.0', method: 'textDocument/publishDiagnostics', params: { uri: 'file:///stored.ts', diagnostics: [{ message: 'stored diag', range: { start: {line:0,character:0}, end: {line:0,character:1} }, severity: 1 }] } });
      process.stdout.write('Content-Length: ' + diag.length + '\\r\\n\\r\\n' + diag + '\\n');
      const resp = JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: null });
      process.stdout.write('Content-Length: ' + resp.length + '\\r\\n\\r\\n' + resp + '\\n');
    }
  }
});
`], 'file:///test');
    await client.start();
    await client.request('test', {});
    await new Promise(r => setTimeout(r, 50));

    // getStoredDiagnostics should return the pushed diagnostics
    const stored = client.getStoredDiagnostics('file:///stored.ts');
    assert(stored, 'should have stored diagnostics');
    assert.equal(stored.length, 1);
    assert.equal(stored[0].message, 'stored diag');

    // Unknown URI should return null
    const missing = client.getStoredDiagnostics('file:///unknown.ts');
    assert.equal(missing, null);

    await client.shutdown();
  });

  it('should handle diagnostics notification', async () => {
    const { LSPClient } = require('../lsp/LSPClient');
    let diagCalled = false;
    const client = new LSPClient(process.execPath, ['-e', `
let buf = '';
process.stdin.on('data', (chunk) => {
  buf += chunk.toString();
  while (true) {
    const m = buf.match(/Content-Length: (\\d+)\\r\\n\\r\\n/);
    if (!m) break;
    const headerEnd = m.index + m[0].length;
    const len = parseInt(m[1]);
    if (buf.length < headerEnd + len) break;
    const content = buf.slice(headerEnd, headerEnd + len);
    buf = buf.slice(headerEnd + len);
    const msg = JSON.parse(content);
    if (msg.method === 'initialize') {
      const resp = JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { capabilities: {} } });
      process.stdout.write('Content-Length: ' + resp.length + '\\r\\n\\r\\n' + resp + '\\n');
    } else {
      const notif = JSON.stringify({ jsonrpc: '2.0', method: 'textDocument/publishDiagnostics', params: { uri: 'file:///test.ts', diagnostics: [{ message: 'test', range: { start: {line:0,character:0}, end: {line:0,character:1} } }] } });
      process.stdout.write('Content-Length: ' + notif.length + '\\r\\n\\r\\n' + notif + '\\n');
      const resp = JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: null });
      process.stdout.write('Content-Length: ' + resp.length + '\\r\\n\\r\\n' + resp + '\\n');
    }
  }
});
`], 'file:///test');
    client.onDiagnostics = (uri: string, diags: any[]) => {
      if (diags.length > 0) diagCalled = true;
    };
    await client.start();
    await client.request('test', {});
    await new Promise(r => setTimeout(r, 100));
    assert.equal(diagCalled, true);
    await client.shutdown();
  });

  it('should error on request before start', async () => {
    const { LSPClient } = require('../lsp/LSPClient');
    const client = new LSPClient('nonexistent-binary', [], 'file:///test');
    await assert.rejects(client.start());
    assert.equal(client.ready, false);
  });

  it('should handle malformed JSON in process buffer', async () => {
    const { LSPClient } = require('../lsp/LSPClient');
    const client = new LSPClient(process.execPath, ['-e', `
process.stdout.write('not-json\\n');
let buf = '';
process.stdin.on('data', (chunk) => {
  buf += chunk.toString();
  while (true) {
    const m = buf.match(/Content-Length: (\\d+)\\r\\n\\r\\n/);
    if (!m) break;
    const headerEnd = m.index + m[0].length;
    const len = parseInt(m[1]);
    if (buf.length < headerEnd + len) break;
    const content = buf.slice(headerEnd, headerEnd + len);
    buf = buf.slice(headerEnd + len);
    const msg = JSON.parse(content);
    if (msg.method === 'initialize') {
      const resp = JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { capabilities: {} } });
      process.stdout.write('Content-Length: ' + resp.length + '\\r\\n\\r\\n' + resp + '\\n');
    } else {
      const resp = JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: 'ok' });
      process.stdout.write('Content-Length: ' + resp.length + '\\r\\n\\r\\n' + resp + '\\n');
    }
  }
});
`], 'file:///test');
    await client.start();
    const result = await client.request('test', {});
    assert.equal(result, 'ok');
    await client.shutdown();
  });

  it('should reject error responses from server', async () => {
    const { LSPClient } = require('../lsp/LSPClient');
    const client = new LSPClient(process.execPath, ['-e', `
let buf = '';
process.stdin.on('data', (chunk) => {
  buf += chunk.toString();
  while (true) {
    const m = buf.match(/Content-Length: (\\d+)\\r\\n\\r\\n/);
    if (!m) break;
    const headerEnd = m.index + m[0].length;
    const len = parseInt(m[1]);
    if (buf.length < headerEnd + len) break;
    const content = buf.slice(headerEnd, headerEnd + len);
    buf = buf.slice(headerEnd + len);
    const msg = JSON.parse(content);
    if (msg.method === 'initialize') {
      const resp = JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { capabilities: {} } });
      process.stdout.write('Content-Length: ' + resp.length + '\\r\\n\\r\\n' + resp + '\\n');
    } else if (msg.id != null) {
      const resp = JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'Method not found' } });
      process.stdout.write('Content-Length: ' + resp.length + '\\r\\n\\r\\n' + resp + '\\n');
    }
  }
});
`], 'file:///test');
    await client.start();
    await assert.rejects(client.request('bad/method', {}), /Method not found/);
    await client.shutdown();
  });
});

describe('LSPManager — getFileDiagnostics with stored fallback', () => {
  let tmpDir: string;

  before(async () => {
    tmpDir = path.join(os.tmpdir(), `lsp-diag-fallback-${Date.now()}`);
    await fsp.mkdir(tmpDir, { recursive: true });
  });

  after(async () => {
    await fsp.rm(tmpDir, { recursive: true, force: true });
  });

  it('should return pull diagnostics when server supports it', async () => {
    const fp = path.join(tmpDir, 'pull.ts');
    await fsp.writeFile(fp, 'const x = 1;\n');
    const { LSPManager } = require('../lsp/LSPManager');
    const manager = new LSPManager([
      { command: process.execPath, args: ['-e', LSP_SERVER_SCRIPT], languageId: 'typescript', filePatterns: ['**/*.ts'] },
    ]);
    await manager.startForProject(tmpDir);
    const result = await manager.getFileDiagnostics(fp);
    assert(result.includes('test diagnostic'), `should contain test diagnostic, got: ${result}`);
    assert(!result.includes('No diagnostics'), `should not be empty, got: ${result}`);
    await manager.shutdown();
  });

  it('should fallback to stored push diagnostics when pull returns empty', async () => {
    const fp = path.join(tmpDir, 'fallback.ts');
    await fsp.writeFile(fp, 'x = 1;\n');
    const { LSPManager } = require('../lsp/LSPManager');
    // Server that returns empty from pull but pushes diagnostics
    const fallbackScript = `
let buf = '';
process.stdin.on('data', (chunk) => {
  buf += chunk.toString();
  while (true) {
    const m = buf.match(/Content-Length: (\\d+)\\r\\n\\r\\n/);
    if (!m) break;
    const headerEnd = m.index + m[0].length;
    const len = parseInt(m[1]);
    if (buf.length < headerEnd + len) break;
    const content = buf.slice(headerEnd, headerEnd + len);
    buf = buf.slice(headerEnd + len);
    const msg = JSON.parse(content);
    if (msg.method === 'initialize') {
      send(msg.id, { capabilities: { textDocument: { diagnostic: true } } });
    } else if (msg.method === 'textDocument/diagnostic') {
      // Return empty array (pull returns nothing)
      send(msg.id, { kind: 'full', items: [] });
    } else if (msg.method === 'textDocument/didOpen') {
      // Push a diagnostic after open
      const diag = JSON.stringify({ jsonrpc: '2.0', method: 'textDocument/publishDiagnostics', params: { uri: msg.params.textDocument.uri, diagnostics: [{ message: 'push diagnostic', range: { start: {line:0,character:0}, end: {line:0,character:1} }, severity: 1 }] } });
      process.stdout.write('Content-Length: ' + diag.length + '\\r\\n\\r\\n' + diag + '\\n');
      send(msg.id, null);
    } else if (msg.id != null) {
      send(msg.id, null);
    }
  }
});
function send(id, result) {
  const resp = JSON.stringify({ jsonrpc: '2.0', id, result });
  process.stdout.write('Content-Length: ' + resp.length + '\\r\\n\\r\\n' + resp + '\\n');
}
`;
    const manager = new LSPManager([
      { command: process.execPath, args: ['-e', fallbackScript], languageId: 'typescript', filePatterns: ['**/*.ts'] },
    ]);
    await manager.startForProject(tmpDir);
    // Give time for push diagnostics to arrive
    await new Promise(r => setTimeout(r, 100));
    const result = await manager.getFileDiagnostics(fp);
    assert(result.includes('push diagnostic'), `should fallback to stored push diagnostic, got: ${result}`);
    assert(!result.includes('No diagnostics'), `should not be empty, got: ${result}`);
    await manager.shutdown();
  });

  it('should return "No diagnostics" when both pull and stored are empty', async () => {
    const fp = path.join(tmpDir, 'clean.ts');
    await fsp.writeFile(fp, 'const y = 2;\n');
    const { LSPManager } = require('../lsp/LSPManager');
    const manager = new LSPManager([
      { command: process.execPath, args: ['-e', `
let buf = '';
process.stdin.on('data', (chunk) => {
  buf += chunk.toString();
  while (true) {
    const m = buf.match(/Content-Length: (\\d+)\\r\\n\\r\\n/);
    if (!m) break;
    const headerEnd = m.index + m[0].length;
    const len = parseInt(m[1]);
    if (buf.length < headerEnd + len) break;
    const content = buf.slice(headerEnd, headerEnd + len);
    buf = buf.slice(headerEnd + len);
    const msg = JSON.parse(content);
    if (msg.method === 'initialize') {
      send(msg.id, { capabilities: { textDocument: { diagnostic: true } } });
    } else if (msg.method === 'textDocument/diagnostic') {
      send(msg.id, { kind: 'full', items: [] });
    } else if (msg.id != null) {
      send(msg.id, null);
    }
  }
});
function send(id, result) {
  const resp = JSON.stringify({ jsonrpc: '2.0', id, result });
  process.stdout.write('Content-Length: ' + resp.length + '\\r\\n\\r\\n' + resp + '\\n');
}
`], languageId: 'typescript', filePatterns: ['**/*.ts'] },
    ]);
    await manager.startForProject(tmpDir);
    const result = await manager.getFileDiagnostics(fp);
    assert(result.includes('No diagnostics'), `should report no diagnostics, got: ${result}`);
    await manager.shutdown();
  });
});

describe('LSPManager - full operations with echo server', () => {
  let tmpDir: string;

  before(async () => {
    tmpDir = path.join(os.tmpdir(), `lsp-manager-test-${Date.now()}`);
    await fsp.mkdir(tmpDir, { recursive: true });
  });

  after(async () => {
    await fsp.rm(tmpDir, { recursive: true, force: true });
  });

  it('should start, find references, go to definition, hover, and shutdown', async () => {
    await fsp.writeFile(path.join(tmpDir, 'sample.ts'), 'const x = 1;\n');
    const { LSPManager } = require('../lsp/LSPManager');
    const manager = new LSPManager([
      { command: process.execPath, args: ['-e', LSP_SERVER_SCRIPT], languageId: 'typescript', filePatterns: ['**/*.ts'] },
    ]);
    await manager.startForProject(tmpDir);
    assert(manager.isAvailable());

    const defResult = await manager.goToDefinition(path.join(tmpDir, 'sample.ts'), 0, 6);
    assert(defResult);
    assert(!defResult.includes('not available'));

    const refResult = await manager.findReferences(path.join(tmpDir, 'sample.ts'), 0, 6);
    assert(refResult);
    assert(!refResult.includes('not available'));

    const hoverResult = await manager.hoverInfo(path.join(tmpDir, 'sample.ts'), 0, 6);
    assert(hoverResult);
    assert(!hoverResult.includes('not available'));

    const info = manager.getClientInfo();
    assert(info);

    await manager.shutdown();
    assert.equal(manager.isAvailable(), false);
  });

  it('should return not-available messages for unknown files', async () => {
    const { LSPManager } = require('../lsp/LSPManager');
    const manager = new LSPManager([]);
    const defResult = await manager.goToDefinition('/nonexistent.ts', 0, 0);
    assert(defResult.includes('not available'));
    const refResult = await manager.findReferences('/nonexistent.ts', 0, 0);
    assert(refResult.includes('not available'));
    const hoverResult = await manager.hoverInfo('/nonexistent.ts', 0, 0);
    assert(hoverResult.includes('not available'));
  });

  it('should add config', () => {
    const { LSPManager } = require('../lsp/LSPManager');
    const manager = new LSPManager([]);
    manager.addConfig({ command: 'test', args: [], languageId: 'test', filePatterns: ['**/*.test'] });
    // Internal configs array should now have one entry
  });

  it('should handle server crash during start', async () => {
    const { LSPManager } = require('../lsp/LSPManager');
    const tmpDir2 = path.join(os.tmpdir(), `lsp-crash-${Date.now()}`);
    await fsp.mkdir(tmpDir2, { recursive: true });
    await fsp.writeFile(path.join(tmpDir2, 'crash.ts'), 'x = 1;\n');
    const manager = new LSPManager([
      { command: 'nonexistent-lsp-binary', args: [], languageId: 'typescript', filePatterns: ['**/*.ts'] },
    ]);
    // Should not throw, should log and continue
    await manager.startForProject(tmpDir2);
    assert.equal(manager.isAvailable(), false);
  });
});
