import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const { loadProjectContext, generateProjectMap } = require('../loadProjectContext');

async function tmpRoot(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'ctx-'));
}

describe('loadProjectContext', () => {
  it('should return null when no context file exists', async () => {
    const root = await tmpRoot();
    const result = loadProjectContext(root);
    assert.equal(result, null);
    await fs.rm(root, { recursive: true, force: true });
  });

  it('should load AGENTS.md content from current directory', async () => {
    const root = await tmpRoot();
    await fs.writeFile(path.join(root, 'AGENTS.md'), '# My Project\n\nUse TypeScript.');
    const result = loadProjectContext(root);
    assert(result);
    assert(result.includes('AGENTS.md'));
    assert(result.includes('# My Project'));
    assert(result.includes('Use TypeScript.'));
    await fs.rm(root, { recursive: true, force: true });
  });

  it('should load .coding-agent.md as alternative name', async () => {
    const root = await tmpRoot();
    await fs.writeFile(path.join(root, '.coding-agent.md'), 'Custom context here');
    const result = loadProjectContext(root);
    assert(result);
    assert(result.includes('.coding-agent.md'));
    assert(result.includes('Custom context here'));
    await fs.rm(root, { recursive: true, force: true });
  });

  it('should prefer AGENTS.md over .coding-agent.md when both exist', async () => {
    const root = await tmpRoot();
    await fs.writeFile(path.join(root, 'AGENTS.md'), 'From AGENTS.md');
    await fs.writeFile(path.join(root, '.coding-agent.md'), 'From dotfile');
    const result = loadProjectContext(root);
    assert(result?.includes('From AGENTS.md'));
    assert(!result?.includes('From dotfile'));
    await fs.rm(root, { recursive: true, force: true });
  });

  it('should return null for empty AGENTS.md', async () => {
    const root = await tmpRoot();
    await fs.writeFile(path.join(root, 'AGENTS.md'), '   ');
    const result = loadProjectContext(root);
    assert.equal(result, null);
    await fs.rm(root, { recursive: true, force: true });
  });

  it('should walk up parent directories to find AGENTS.md', async () => {
    const root = await tmpRoot();
    await fs.writeFile(path.join(root, 'AGENTS.md'), 'Root context');
    const subDir = path.join(root, 'a', 'b', 'c');
    await fs.mkdir(subDir, { recursive: true });
    const result = loadProjectContext(subDir);
    assert(result);
    assert(result.includes('Root context'));
    await fs.rm(root, { recursive: true, force: true });
  });

  it('should not walk beyond parent directories limit', async () => {
    const root = await tmpRoot();
    // AGENTS.md only in root; walk from 5 levels deep
    await fs.writeFile(path.join(root, 'AGENTS.md'), 'Root');
    const deepDir = path.join(root, 'w', 'x', 'y', 'z', 'v');
    await fs.mkdir(deepDir, { recursive: true });
    const result = loadProjectContext(deepDir);
    // Walking up 4 levels: deepDir, deepDir/parent, ..., reaches root after 5
    // Limit is 4, so it should NOT find it
    assert.equal(result, null);
    await fs.rm(root, { recursive: true, force: true });
  });
});

describe('generateProjectMap', () => {
  it('should return null for empty directory', async () => {
    const root = await tmpRoot();
    const result = generateProjectMap(root);
    assert.equal(result, null);
    await fs.rm(root, { recursive: true, force: true });
  });

  it('should detect package.json and extract summary', async () => {
    const root = await tmpRoot();
    await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({
      name: 'test-project', version: '1.0.0',
      scripts: { test: 'jest', build: 'tsc' },
      dependencies: { express: '^4' },
    }));
    await fs.mkdir(path.join(root, 'src'), { recursive: true });
    const result = generateProjectMap(root);
    assert(result);
    assert(result.includes('test-project'));
    assert(result.includes('1.0.0'));
    assert(result.includes('src'));
    await fs.rm(root, { recursive: true, force: true });
  });

  it('should detect entry points and test directories', async () => {
    const root = await tmpRoot();
    await fs.mkdir(path.join(root, 'src'), { recursive: true });
    await fs.writeFile(path.join(root, 'src', 'index.ts'), '// entry');
    await fs.mkdir(path.join(root, 'tests'), { recursive: true });
    const result = generateProjectMap(root);
    assert(result);
    assert(result.includes('src/index.ts'));
    assert(result.includes('tests'));
    await fs.rm(root, { recursive: true, force: true });
  });
});
