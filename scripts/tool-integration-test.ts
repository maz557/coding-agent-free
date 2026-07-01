/**
 * Integration test for fileManager tools.
 * Tests tool-level behavior by calling executeTool via ts-node.
 * ALLOWED_DIR is set via dotenv override before import.
 */
import * as path from 'path';
import * as fs from 'fs/promises';

// Set ALLOWED_DIR before any imports that read it
const testDir = path.resolve('.test-tool-integration');
process.env.ALLOWED_DIR = testDir;

// Now safe to import (module reads ALLOWED_DIR at init)
import { executeTool } from '../src/tools/fileManager';

let passed = 0;
let failed = 0;

async function assert(cond: boolean, label: string) {
  if (cond) { console.log(`  ✅ ${label}`); passed++; }
  else { console.log(`  ❌ ${label}`); failed++; }
}

async function cleanup() {
  try { await fs.rm(testDir, { recursive: true, force: true }); } catch {}
}

async function run() {
  await cleanup();
  await fs.mkdir(testDir, { recursive: true });

  console.log('\n═══ Tool Integration Tests ═══');

  // 1. write_file
  await executeTool('write_file', { path: 'test.txt', content: 'hello world' });
  const writeContent = await fs.readFile(path.join(testDir, 'test.txt'), 'utf-8');
  assert(writeContent === 'hello world', 'write_file creates file with content');

  // 2. read_file
  const read = await executeTool('read_file', { path: 'test.txt' });
  assert(read === 'hello world', 'read_file returns content');

  // 3. append_file
  await executeTool('append_file', { path: 'test.txt', content: ' appended' });
  const appended = await executeTool('read_file', { path: 'test.txt' });
  assert(appended === 'hello world appended', 'append_file adds to existing file');

  // 4. create_folder
  await executeTool('create_folder', { path: 'sub/deep' });
  const subStat = await fs.stat(path.join(testDir, 'sub/deep'));
  assert(subStat.isDirectory(), 'create_folder creates nested dirs');

  // 5. list_files
  await executeTool('write_file', { path: 'sub/a.txt', content: 'a' });
  const listing = await executeTool('list_files', { directory: 'sub' });
  assert(listing.includes('a.txt'), 'list_files shows files');

  // 6. file_info
  const info = await executeTool('file_info', { path: 'test.txt' });
  const parsed = JSON.parse(info);
  assert(parsed.isFile === true, 'file_info: isFile');
  assert(typeof parsed.size === 'number', 'file_info: size is number');
  assert(parsed.isDirectory === false, 'file_info: not dir');

  // 7. copy_file
  await executeTool('copy_file', { source: 'test.txt', destination: 'copy.txt' });
  const copied = await executeTool('read_file', { path: 'copy.txt' });
  assert(copied === 'hello world appended', 'copy_file duplicates content');

  // 8. move_file
  await executeTool('move_file', { source: 'copy.txt', destination: 'moved.txt' });
  const movedContent = await executeTool('read_file', { path: 'moved.txt' });
  assert(movedContent === 'hello world appended', 'move_file: destination has content');

  // 9. delete_file
  const delResult = await executeTool('delete_file', { path: 'moved.txt' });
  assert(delResult.includes('File deleted'), 'delete_file returns success message');
  const afterDelete = await executeTool('read_file', { path: 'moved.txt' });
  assert(afterDelete.startsWith('Error reading file'), 'delete_file actually removes file (read_file returns error)');

  // 10. delete_folder (recursive)
  await executeTool('delete_folder', { path: 'sub', recursive: true });
  let dirGone = false;
  try { await fs.stat(path.join(testDir, 'sub')); } catch { dirGone = true; }
  assert(dirGone, 'delete_folder(recursive) removes folder and contents');

  // 11. search_content
  await executeTool('write_file', { path: 'search-me.txt', content: 'find this secret' });
  const searchResult = await executeTool('search_content', { pattern: 'secret', directory: '.' });
  assert(searchResult.includes('search-me.txt'), 'search_content finds pattern');

  // 12. run_command
  const cmdResult = await executeTool('run_command', { command: 'echo hello' });
  assert(cmdResult.trim() === 'hello', 'run_command executes and returns output');

  // 13. list_files with details
  const detailed = await executeTool('list_files', { directory: '.', details: true });
  assert(detailed.includes('test.txt'), 'list_files(details) shows files');
  assert(detailed.includes('B') || detailed.includes('KB'), 'list_files(details) has size info');

  // 14. write_file creates parent dirs
  await executeTool('write_file', { path: 'new/deep/path/nested.txt', content: 'nested' });
  const nestedContent = await executeTool('read_file', { path: 'new/deep/path/nested.txt' });
  assert(nestedContent === 'nested', 'write_file creates parent dirs');

  // 15. append_file creates file if not exists
  await executeTool('append_file', { path: 'newly-appended.txt', content: 'fresh' });
  const freshContent = await executeTool('read_file', { path: 'newly-appended.txt' });
  assert(freshContent === 'fresh', 'append_file creates new file');

  // Summary
  console.log(`\n── Tool Integration Tests ────────────`);
  console.log(`  Total: ${passed + failed}  |  ✅ Passed: ${passed}  |  ❌ Failed: ${failed}`);
  console.log(`────────────────────────────────────\n`);

  await cleanup();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Test error:', err);
  cleanup().then(() => process.exit(1));
});
