import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'path';
import * as os from 'os';
import * as fsp from 'fs/promises';
import * as fs from 'fs';

describe('LSP tool definitions', () => {
  it('should export lspToolDefinitions with 3 tools', () => {
    const { lspToolDefinitions } = require('../lsp/index');
    assert.equal(lspToolDefinitions.length, 3);

    const names = lspToolDefinitions.map((t: any) => t.function.name);
    assert(names.includes('code_definition'));
    assert(names.includes('code_references'));
    assert(names.includes('code_hover'));

    const desc = lspToolDefinitions[0].function.description;
    assert(typeof desc === 'string' && desc.length > 0);
  });
});

describe('LSP tool execution without server', () => {
  it('should return fallback message when LSP not available', async () => {
    const { executeLSPServerTool, lspManager } = require('../lsp/index');
    // Ensure no client
    await lspManager.shutdown();

    const result = await executeLSPServerTool('code_definition', {
      file: 'test.ts',
      line: 0,
      column: 0,
    });

    assert(result.includes('LSP not available') || result.includes('failed'));
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
    // Access private via any
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
});
