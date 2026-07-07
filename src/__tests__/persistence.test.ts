import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

const tmpDir = path.join(os.tmpdir(), `persistence-test-${Date.now()}`);
process.env.SESSIONS_DIR = tmpDir;

import {
  saveSession, loadSession, listSessions, deleteSession,
  saveConversation, loadConversation, clearConversation,
  loadUserPresets, saveUserPresets,
} from '../persistence';
import { ModelPreset } from '../config/models';

describe('persistence - multi-session', () => {
  before(async () => {
    await fs.mkdir(tmpDir, { recursive: true });
  });

  after(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should save and load a named session', async () => {
    // System-only messages don't trigger auto-title
    const messages = [
      { role: 'system' as const, content: 'sys' },
    ];
    await saveSession('test-session', messages);
    const loaded = await loadSession('test-session');
    assert(loaded);
    assert.equal(loaded.messages.length, 1);
    // Auto-title only triggers on user messages
    assert(loaded.meta.createdAt);
    assert(loaded.meta.updatedAt);
  });

  it('should list sessions sorted by recency', async () => {
    // Use user messages for distinct auto-titles
    await saveSession('older', [{ role: 'user' as const, content: 'old session msg' }]);
    await saveSession('newer', [{ role: 'user' as const, content: 'new session msg' }]);
    const all = await listSessions();
    assert(all.length >= 2);
    // Most recent session first (auto-titled)
    assert(all[0].name.includes('new session'));
  });

  it('should delete a session', async () => {
    await saveSession('temp', [{ role: 'system' as const, content: 'x' }]);
    await deleteSession('temp');
    const loaded = await loadSession('temp');
    assert.equal(loaded, null);
  });

  it('should auto-title from first user message', async () => {
    const messages = [
      { role: 'system' as const, content: 'sys' },
      { role: 'user' as const, content: 'This is a long user message that should become the title' },
    ];
    await saveSession('auto-title', messages);
    const loaded = await loadSession('auto-title');
    assert(loaded);
    assert(loaded.meta.name.includes('This is a long user message'));
  });

  it('should handle empty session', async () => {
    await saveSession('empty', []);
    const loaded = await loadSession('empty');
    assert(loaded);
    assert.equal(loaded.messages.length, 0);
  });

  it('should save and load with modelPreset', async () => {
    const preset: ModelPreset = { provider: 'groq', primary: 'llama', fallbacks: [] };
    const messages = [{ role: 'system' as const, content: 'x' }];
    await saveSession('with-preset', messages, preset);
    const loaded = await loadSession('with-preset');
    assert(loaded);
    assert.equal(loaded.meta.modelPreset?.provider, 'groq');
    assert.equal(loaded.meta.modelPreset?.primary, 'llama');
  });
});

describe('persistence - legacy compatibility', () => {
  const LEGACY_FILE = path.join(__dirname, '..', '..', 'conversation.json');

  after(async () => {
    try { await fs.unlink(LEGACY_FILE); } catch { }
  });

  it('should fall back to legacy conversation.json', async () => {
    const legacy = [{ role: 'system' as const, content: 'legacy sys' }];
    await fs.writeFile(LEGACY_FILE, JSON.stringify(legacy), 'utf-8');
    const loaded = await loadConversation();
    assert(loaded);
    assert.equal(loaded.messages.length, 1);
    assert.equal(loaded.messages[0].content, 'legacy sys');
    await clearConversation();
  });
});

describe('persistence - save/load conversation (default)', () => {
  after(async () => {
    await clearConversation();
  });

  it('should save and load default conversation', async () => {
    const messages = [{ role: 'system' as const, content: 'default test' }];
    await saveConversation(messages);
    const loaded = await loadConversation();
    assert(loaded);
    assert.equal(loaded.messages.length, 1);
  });

  it('should clear default conversation', async () => {
    await saveConversation([{ role: 'system' as const, content: 'x' }]);
    await clearConversation();
    const loaded = await loadConversation();
    assert.equal(loaded, null);
  });

  it('should handle non-existent conversation', async () => {
    await clearConversation();
    const loaded = await loadConversation();
    assert.equal(loaded, null);
  });
});

describe('persistence - user presets', () => {
  after(async () => {
    await saveUserPresets({});
  });

  it('should save and load user presets', async () => {
    const presets: Record<string, ModelPreset> = {
      '10': { provider: 'groq', primary: 'llama-3.3-70b-versatile', fallbacks: ['openrouter/free'] },
    };
    await saveUserPresets(presets);
    const loaded = await loadUserPresets();
    assert(loaded['10']);
    assert.equal(loaded['10'].provider, 'groq');
  });

  it('should return empty for corrupted presets', async () => {
    const presetsFile = path.join(__dirname, '..', '..', 'presets.json');
    await fs.writeFile(presetsFile, '{invalid}', 'utf-8');
    const loaded = await loadUserPresets();
    assert.deepEqual(loaded, {});
    await fs.writeFile(presetsFile, '{}', 'utf-8');
  });
});
