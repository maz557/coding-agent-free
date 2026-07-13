import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const builtinNames = [
  'read_file', 'write_file', 'list_files', 'create_folder',
  'delete_file', 'delete_folder', 'file_info', 'search_content',
  'replace_in_file', 'append_file', 'copy_file', 'move_file', 'run_command',
  'create_project', 'git_diff', 'git_commit', 'git_log', 'web_search', 'run_tests',
  'read_project_docs', 'update_project_docs', 'verify_project_spec',
];

describe('toolRegistry - toggles', () => {
  it('should set and check MCP enabled state', () => {
    const reg = require('../tools/toolRegistry');
    reg.setMCPEnabled(true);
    assert.equal(reg.isMCPEnabled(), true);
    reg.setMCPEnabled(false);
    assert.equal(reg.isMCPEnabled(), false);
    reg.setMCPEnabled(true);
    assert.equal(reg.isMCPEnabled(), true);
  });

  it('should set and check LSP enabled state', () => {
    const reg = require('../tools/toolRegistry');
    reg.setLSPEnabled(true);
    assert.equal(reg.isLSPEnabled(), true);
    reg.setLSPEnabled(false);
    assert.equal(reg.isLSPEnabled(), false);
    reg.setLSPEnabled(true);
    assert.equal(reg.isLSPEnabled(), true);
  });

  it('should export safe mode functions', () => {
    const reg = require('../tools/toolRegistry');
    assert.equal(typeof reg.setSafeMode, 'function');
    assert.equal(typeof reg.isSafeModeEnabled, 'function');
    assert.equal(typeof reg.allowExtraPath, 'function');
  });
});

describe('toolRegistry - getAllTools', () => {
  it('should return builtin tools when MCP and LSP disabled', () => {
    const reg = require('../tools/toolRegistry');
    reg.setMCPEnabled(false);
    reg.setLSPEnabled(false);
    const tools = reg.getAllTools();
    assert(tools.length >= 13);
    const names = tools.map((t: any) => t.function.name);
    for (const name of builtinNames) {
      assert(names.includes(name), `missing builtin: ${name}`);
    }
    assert(!names.includes('code_definition'));
  });

  it('should not include LSP tools since no server is available', () => {
    const reg = require('../tools/toolRegistry');
    reg.setMCPEnabled(false);
    reg.setLSPEnabled(true);
    const tools = reg.getAllTools();
    const names = tools.map((t: any) => t.function.name);
    // LSP tools only appear when lspManager.isAvailable() is true
    // which requires a language server binary; absent in test env
    assert(!names.includes('code_definition'));
  });
});

describe('toolRegistry - executeTool', () => {
  it('should execute a builtin tool', async () => {
    const reg = require('../tools/toolRegistry');
    const result = await reg.executeTool('read_file', { path: 'package.json' });
    assert(typeof result === 'string');
    assert(result.length > 0);
  });

  it('should throw for unknown tool', async () => {
    const reg = require('../tools/toolRegistry');
    await assert.rejects(() => reg.executeTool('nonexistent_tool', {}),
      /Unknown tool/
    );
  });

  it('should execute create_project with sessionId from setCurrentSessionId', async () => {
    const reg = require('../tools/toolRegistry');
    const { setCurrentSessionId } = require('../tools/fileManager');
    const { projectManager } = require('../ProjectManager');
    const origDir = process.env.PROJECTS_DIR;
    const pathMod = require('path');
    const fspMod = require('fs/promises');
    const testDir = pathMod.join(process.cwd(), 'projects_test_tr');
    process.env.PROJECTS_DIR = testDir;
    await projectManager.loadAll();
    setCurrentSessionId('test_sess_id');
    const result = await reg.executeTool('create_project', { title: 'Session Link Test' });
    assert(result.includes('✅'));
    const projects = projectManager.getAll();
    const found = projects.find((p: any) => p.title === 'Session Link Test');
    assert(found, 'Project should exist');
    assert(found.sessionIds.includes('test_sess_id'), 'sessionId should be linked');
    projectManager.clear();
    try { await fspMod.rm(testDir, { recursive: true, force: true }); } catch {}
    if (origDir) process.env.PROJECTS_DIR = origDir;
    else delete process.env.PROJECTS_DIR;
  });

  it('should handle LSP tool gracefully when no server', async () => {
    const reg = require('../tools/toolRegistry');
    reg.setLSPEnabled(true);
    reg.setMCPEnabled(false);
    const result = await reg.executeTool('code_definition', {
      file: 'test.ts',
      line: 0,
      column: 0,
    });
    assert(result.includes('not available'));
  });
});
