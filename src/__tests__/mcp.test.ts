import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { loadMCPConfig } from '../mcp/config';

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
    // Make a home directory with config file
    const homeDir = path.join(os.tmpdir(), `mcp-home-${Date.now()}`);
    fs.mkdirSync(homeDir, { recursive: true });
    fs.writeFileSync(path.join(homeDir, '.coding-agent.json'), JSON.stringify({
      mcpServers: {
        testServer: { command: 'node', args: ['test.js'] },
        apiServer: { url: 'http://localhost:3000/mcp' },
      },
    }));
    // cwd points to a dir with no config → falls back to HOME
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
});

describe('MCP Manager - standalone operations', () => {
  it('should manage server names and tool counts', () => {
    const { MCPManager } = require('../mcp/MCPManager');
    const manager = new MCPManager();
    assert.equal(manager.getServerNames().length, 0);
    manager.getOpenAITools();
    assert.equal(manager.findServerForTool('any'), null);
  });
});

describe('StdioTransport - construction', () => {
  it('should construct with command and args', () => {
    const { StdioTransport } = require('../mcp/transport');
    const t = new StdioTransport('node', ['--version']);
    assert(t);
    assert.equal(typeof t.start, 'function');
    assert.equal(typeof t.close, 'function');
    assert.equal(typeof t.request, 'function');
  });
});
