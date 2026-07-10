import { describe, it, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const { executeTool, setSafeMode, isSafeModeEnabled, setAllowedDir } = require('../tools/fileManager');

let seq = 0;
function uniq(prefix: string): string {
  seq++;
  return `${prefix}-${seq}-${Date.now()}`;
}

describe('fileManager tools', () => {
  let testDir: string;

  before(async () => {
    testDir = path.join(os.tmpdir(), `coding-agent-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    setAllowedDir(testDir);
  });

  after(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    setAllowedDir(path.resolve('./workspace'));
  });
  describe('write_file / read_file', () => {
    it('should write and read a file', async () => {
      const f = uniq('file');
      await executeTool('write_file', { path: f, content: 'Hello World' });
      const content = await executeTool('read_file', { path: f });
      assert.equal(content, 'Hello World');
    });

    it('should create parent directories automatically', async () => {
      const f = uniq('a/b/c/deep');
      await executeTool('write_file', { path: f, content: 'deep' });
      const content = await executeTool('read_file', { path: f });
      assert.equal(content, 'deep');
    });

    it('should reject non-existent file', async () => {
      const result = await executeTool('read_file', { path: uniq('nonexistent') });
      assert(result.includes('Error reading file'));
    });
  });

  describe('list_files', () => {
    it('should list files in directory', async () => {
      const a = uniq('ls-a');
      const b = uniq('ls-b');
      await executeTool('write_file', { path: a, content: 'a' });
      await executeTool('write_file', { path: b, content: 'b' });
      const result = await executeTool('list_files', { directory: '.' });
      assert(result.includes(a));
      assert(result.includes(b));
    });

    it('should list files with details', async () => {
      const f = uniq('detail');
      await executeTool('write_file', { path: f, content: 'x' });
      const result = await executeTool('list_files', { directory: '.', details: true });
      assert(result.includes(f));
    });

    it('should default to root workspace', async () => {
      const result = await executeTool('list_files', {});
      assert(result.length > 0);
    });
  });

  describe('create_folder', () => {
    it('should create a folder', async () => {
      const folder = uniq('folder');
      await executeTool('create_folder', { path: folder });
      const result = await executeTool('list_files', { directory: '.' });
      assert(result.includes(folder));
    });
  });

  describe('append_file', () => {
    it('should append to existing file', async () => {
      const f = uniq('append-exists');
      await executeTool('write_file', { path: f, content: 'line1' });
      await executeTool('append_file', { path: f, content: '\nline2' });
      const content = await executeTool('read_file', { path: f });
      assert(content.includes('line1'));
      assert(content.includes('line2'));
    });

    it('should create file if it does not exist', async () => {
      const f = uniq('append-new');
      await executeTool('append_file', { path: f, content: 'new content' });
      const content = await executeTool('read_file', { path: f });
      assert.equal(content, 'new content');
    });
  });

  describe('copy_file', () => {
    it('should copy a file', async () => {
      const src = uniq('src');
      const dst = uniq('dst');
      await executeTool('write_file', { path: src, content: 'copy me' });
      await executeTool('copy_file', { source: src, destination: dst });
      const content = await executeTool('read_file', { path: dst });
      assert.equal(content, 'copy me');
    });

    it('should reject copy when source is missing', async () => {
      await assert.rejects(() => executeTool('copy_file', { source: uniq('missing'), destination: uniq('x') }));
    });
  });

  describe('move_file', () => {
    it('should move a file', async () => {
      const src = uniq('movable');
      const dst = uniq('moved');
      await executeTool('write_file', { path: src, content: 'move me' });
      await executeTool('move_file', { source: src, destination: dst });
      const result = await executeTool('read_file', { path: src });
      assert(result.includes('Error reading file'));
      const content = await executeTool('read_file', { path: dst });
      assert.equal(content, 'move me');
    });
  });

  describe('delete_file', () => {
    it('should delete a file', async () => {
      const f = uniq('deletable');
      await executeTool('write_file', { path: f, content: 'x' });
      await executeTool('delete_file', { path: f });
      const result = await executeTool('read_file', { path: f });
      assert(result.includes('Error reading file'));
    });
  });

  describe('delete_folder', () => {
    it('should reject deleting non-empty folder without recursive', async () => {
      const folder = uniq('folder');
      await executeTool('write_file', { path: `${folder}/nested.txt`, content: 'x' });
      const result = await executeTool('delete_folder', { path: folder });
      assert(result.includes('not empty'));
    });

    it('should delete non-empty folder with recursive', async () => {
      const folder = uniq('folder2');
      await executeTool('write_file', { path: `${folder}/nested.txt`, content: 'x' });
      await executeTool('delete_folder', { path: folder, recursive: true });
      const result = await executeTool('list_files', { directory: '.' });
      assert(!result.includes(folder));
    });
  });

  describe('file_info', () => {
    it('should return metadata for a file', async () => {
      const f = uniq('info');
      await executeTool('write_file', { path: f, content: 'info' });
      const result = await executeTool('file_info', { path: f });
      assert(result.includes(f));
    });

    it('should reject for non-existent path', async () => {
      await assert.rejects(() => executeTool('file_info', { path: uniq('missing') }));
    });
  });

  describe('search_content', () => {
    it('should find matching text in files', async () => {
      const a = uniq('sa');
      const b = uniq('sb');
      await executeTool('write_file', { path: a, content: 'apple banana' });
      await executeTool('write_file', { path: b, content: 'banana cherry' });
      const result = await executeTool('search_content', { pattern: 'banana' });
      assert(result.includes(a));
      assert(result.includes(b));
    });

    it('should return empty for non-matching pattern', async () => {
      const result = await executeTool('search_content', { pattern: uniq('zzzznonexistent') });
      assert(result.includes('No matches') || result === '');
    });
  });

  describe('replace_in_file', () => {
    it('should replace first occurrence of text', async () => {
      const f = uniq('replace');
      await executeTool('write_file', { path: f, content: 'aaa bbb aaa' });
      await executeTool('replace_in_file', { path: f, old_str: 'aaa', new_str: 'xxx' });
      const content = await executeTool('read_file', { path: f });
      assert.equal(content, 'xxx bbb aaa');
    });

    it('should reject when old_str not found', async () => {
      const f = uniq('replace-none');
      await executeTool('write_file', { path: f, content: 'hello' });
      await assert.rejects(() => executeTool('replace_in_file', { path: f, old_str: 'zzz', new_str: 'yyy' }));
    });
  });

  describe('run_command', () => {
    it('should execute a simple command', async () => {
      const result = await executeTool('run_command', { command: 'echo hello from cmd' });
      assert(result.includes('hello from cmd'));
    });

    it('should reject dangerous commands', async () => {
      await assert.rejects(() => executeTool('run_command', { command: 'rm -rf /' }));
    });
  });

  describe('safe mode', () => {
    afterEach(() => setSafeMode(false));

    it('should allow whitelisted commands', async () => {
      setSafeMode(true);
      const result = await executeTool('run_command', { command: 'echo safe test' });
      assert(result.includes('safe test'));
    });

    it('should block non-whitelisted commands', async () => {
      setSafeMode(true);
      const result = await executeTool('run_command', { command: 'some_random_tool --flag' });
      assert(result.includes('[Safe Mode]'));
    });
  });

  describe('executeTool with unknown tool', () => {
    it('should return error message for unknown tool', async () => {
      const result = await executeTool('unknown_tool', { foo: 'bar' });
      assert(result.includes('Unknown tool'));
    });
  });

  describe('run_tests', () => {
    it('should return tool definition exists and can be called', async () => {
      // run_tests should return a message even with no test framework
      const result = await executeTool('run_tests', {});
      assert(typeof result === 'string');
      assert(result.length > 0);
    });

    it('should accept directory parameter', async () => {
      const result = await executeTool('run_tests', { directory: testDir });
      assert(typeof result === 'string');
    });
  });
});
