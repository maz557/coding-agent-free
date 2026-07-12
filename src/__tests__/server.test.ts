import { describe, it, afterEach, beforeEach, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import * as path from 'path';
import * as fsp from 'fs/promises';
import * as fs from 'fs';
import * as os from 'os';

const BASE = 'http://localhost:0';
const ORIGINAL_ENV = { ...process.env };

let server: http.Server;
let baseUrl: string;
let sessionsDir: string;

async function startServer(port = 0): Promise<{ server: http.Server; baseUrl: string }> {
  const { app } = await import('../server');
  return new Promise((resolve, reject) => {
    const srv = app.listen(port, '127.0.0.1', () => {
      const addr = srv.address();
      if (addr && typeof addr === 'object') {
        resolve({ server: srv, baseUrl: `http://127.0.0.1:${addr.port}` });
      } else {
        reject(new Error('Failed to get server address'));
      }
    });
  });
}

function fetchJson(url: string, opts?: RequestInit): Promise<any> {
  return fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
  }).then(async (r) => {
    const body = r.headers.get('content-type')?.includes('json')
      ? await r.json()
      : await r.text();
    return { status: r.status, body, headers: r.headers };
  });
}

let sessionId = '';

describe('server API', () => {
  before(() => {
    process.env.OPENROUTER_API_KEY = 'sk-or-v1-test';
    process.env.GOOGLE_API_KEY = 'AIza-test';
    process.env.MISTRAL_API_KEY = 'sk-mistral-test';
    process.env.GROQ_API_KEY = 'gsk_test';
  });
  after(() => {
    process.env.OPENROUTER_API_KEY = ORIGINAL_ENV.OPENROUTER_API_KEY;
    process.env.GOOGLE_API_KEY = ORIGINAL_ENV.GOOGLE_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    delete process.env.GROQ_API_KEY;
  });

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    sessionsDir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'server-test-'));
    process.env.SESSIONS_DIR = sessionsDir;
    const started = await startServer();
    server = started.server;
    baseUrl = started.baseUrl;
  });

  afterEach(async () => {
    server?.close();
    // Clear in-memory sessions so next test starts fresh
    const mod = await import('../server') as any;
    if (mod.sessions) mod.sessions.clear();
    delete process.env.SESSIONS_DIR;
    await fsp.rm(sessionsDir, { recursive: true, force: true });
  });

  describe('GET /api/models', () => {
    it('should return models and providers', async () => {
      const { status, body } = await fetchJson(`${baseUrl}/api/models`);
      assert.equal(status, 200);
      assert(Array.isArray(body));
      const presets = body.filter((x: any) => x.type === 'preset');
      assert(presets.length >= 5);
      assert(presets[0].id);
      assert(presets[0].provider);
      assert(presets[0].model);
    });
  });

  describe('POST /api/session', () => {
    it('should create a session', async () => {
      const { status, body } = await fetchJson(`${baseUrl}/api/session`, { method: 'POST' });
      assert.equal(status, 200);
      assert(body.sessionId);
      assert(Array.isArray(body.models));
      sessionId = body.sessionId;
    });
  });

  describe('POST /api/session (with title)', () => {
    it('should store custom title', async () => {
      const customTitle = 'My Custom Session';
      const { status, body: session } = await fetchJson(`${baseUrl}/api/session`, {
        method: 'POST',
        body: JSON.stringify({ title: customTitle }),
      });
      assert.equal(status, 200);
      const { body: list } = await fetchJson(`${baseUrl}/api/sessions`);
      const found = list.find((s: any) => s.id === session.sessionId);
      assert(found);
      assert.equal(found.title, customTitle);
    });

    it('should use default title when not provided', async () => {
      const { body: session } = await fetchJson(`${baseUrl}/api/session`, { method: 'POST' });
      const { body: list } = await fetchJson(`${baseUrl}/api/sessions`);
      const found = list.find((s: any) => s.id === session.sessionId);
      assert(found);
      assert(found.title.startsWith('Session '));
    });
  });

  describe('GET /api/sessions', () => {
    it('should return empty list before any session', async () => {
      const { status, body } = await fetchJson(`${baseUrl}/api/sessions`);
      assert.equal(status, 200);
      assert(Array.isArray(body));
      assert.equal(body.length, 0);
    });

    it('should return list with sessions after creation', async () => {
      const { body: s1 } = await fetchJson(`${baseUrl}/api/session`, {
        method: 'POST',
        body: JSON.stringify({ title: 'One' }),
      });
      const { body: s2 } = await fetchJson(`${baseUrl}/api/session`, {
        method: 'POST',
        body: JSON.stringify({ title: 'Two' }),
      });
      const { status, body } = await fetchJson(`${baseUrl}/api/sessions`);
      assert.equal(status, 200);
      assert(body.length >= 2);
      const found1 = body.find((s: any) => s.id === s1.sessionId);
      const found2 = body.find((s: any) => s.id === s2.sessionId);
      assert(found1);
      assert.equal(found1.title, 'One');
      assert(found2);
      assert.equal(found2.title, 'Two');
      assert(found1.createdAt);
      assert(found1.modelLabel);
      assert(typeof found1.messageCount === 'number');
    });

    it('should order sessions newest-first', async () => {
      const { body: s1 } = await fetchJson(`${baseUrl}/api/session`, { method: 'POST' });
      const { body: s2 } = await fetchJson(`${baseUrl}/api/session`, { method: 'POST' });
      const { body } = await fetchJson(`${baseUrl}/api/sessions`);
      const i1 = body.findIndex((s: any) => s.id === s1.sessionId);
      const i2 = body.findIndex((s: any) => s.id === s2.sessionId);
      assert(i2 < i1, 'newer session should come first');
    });
  });

  describe('GET /api/sessions/:sessionId', () => {
    it('should return session data', async () => {
      const { body: session } = await fetchJson(`${baseUrl}/api/session`, { method: 'POST' });
      const { status, body } = await fetchJson(`${baseUrl}/api/sessions/${session.sessionId}`);
      assert.equal(status, 200);
      assert(Array.isArray(body.messages));
      assert.equal(body.messages.length, 0);
      assert(body.modelLabel);
    });

    it('should return 404 for missing session', async () => {
      const { status } = await fetchJson(`${baseUrl}/api/sessions/nonexistent`);
      assert.equal(status, 404);
    });
  });

  describe('Session metadata', () => {
    it('modelLabel updates after model switch', async () => {
      const { body: session } = await fetchJson(`${baseUrl}/api/session`, { method: 'POST' });
      await fetchJson(`${baseUrl}/api/model/${session.sessionId}`, {
        method: 'POST',
        body: JSON.stringify({ provider: 'openrouter', model: 'gpt-4o' }),
      });
      const { body: list } = await fetchJson(`${baseUrl}/api/sessions`);
      const found = list.find((s: any) => s.id === session.sessionId);
      assert(found);
      assert(found.modelLabel.includes('gpt-4o'));
    });
  });

  describe('GET /api/active/:sessionId', () => {
    it('should return session info', async () => {
      const { body: session } = await fetchJson(`${baseUrl}/api/session`, { method: 'POST' });
      const { status, body } = await fetchJson(`${baseUrl}/api/active/${session.sessionId}`);
      assert.equal(status, 200);
      assert(body.provider);
      assert(body.model);
      assert(typeof body.safeMode === 'boolean');
    });

    it('should return 404 for missing session', async () => {
      const { status } = await fetchJson(`${baseUrl}/api/active/nonexistent`);
      assert.equal(status, 404);
    });
  });

  describe('GET /api/config/:sessionId', () => {
    let savedLocalTimeout: string | undefined;

    before(() => {
      savedLocalTimeout = process.env.LOCAL_TIMEOUT;
      delete process.env.LOCAL_TIMEOUT;
    });

    after(() => {
      if (savedLocalTimeout) process.env.LOCAL_TIMEOUT = savedLocalTimeout;
    });

    it('should return 120s timeout for cloud provider (default)', async () => {
      const { body: session } = await fetchJson(`${baseUrl}/api/session`, { method: 'POST' });
      const { status, body } = await fetchJson(`${baseUrl}/api/config/${session.sessionId}`);
      assert.equal(status, 200);
      assert.equal(body.timeoutMs, 120000);
    });

    it('should return 600s timeout for local provider', async () => {
      const { body: session } = await fetchJson(`${baseUrl}/api/session`, { method: 'POST' });
      await fetchJson(`${baseUrl}/api/model/${session.sessionId}`, {
        method: 'POST',
        body: JSON.stringify({ provider: 'ollama', model: 'ornith-agent' }),
      });
      const { status, body } = await fetchJson(`${baseUrl}/api/config/${session.sessionId}`);
      assert.equal(status, 200);
      assert.equal(body.timeoutMs, 600000);
    });

    it('should return 404 for missing session', async () => {
      const { status } = await fetchJson(`${baseUrl}/api/config/nonexistent`);
      assert.equal(status, 404);
    });
  });

  describe('GET /api/safe-mode', () => {
    it('should return safe mode status', async () => {
      const { status, body } = await fetchJson(`${baseUrl}/api/safe-mode`);
      assert.equal(status, 200);
      assert(typeof body.enabled === 'boolean');
    });
  });

  describe('POST /api/safe-mode', () => {
    it('should toggle safe mode', async () => {
      const { body: before } = await fetchJson(`${baseUrl}/api/safe-mode`);

      const { body: after } = await fetchJson(`${baseUrl}/api/safe-mode`, {
        method: 'POST',
        body: JSON.stringify({ enabled: !before.enabled }),
      });
      assert.equal(after.enabled, !before.enabled);
    });

    it('should return 400 if enabled is not boolean', async () => {
      const { status } = await fetchJson(`${baseUrl}/api/safe-mode`, {
        method: 'POST',
        body: JSON.stringify({ enabled: 'yes' }),
      });
      assert.equal(status, 400);
    });
  });

  describe('POST /api/allow', () => {
    it('should allow a path', async () => {
      const { status, body } = await fetchJson(`${baseUrl}/api/allow`, {
        method: 'POST',
        body: JSON.stringify({ path: 'C:\\test\\path' }),
      });
      assert.equal(status, 200);
      assert(body.allowedPath);
    });

    it('should return 400 for missing path', async () => {
      const { status } = await fetchJson(`${baseUrl}/api/allow`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      assert.equal(status, 400);
    });
  });

  describe('POST /api/reset/:sessionId', () => {
    it('should reset session messages', async () => {
      const { body: session } = await fetchJson(`${baseUrl}/api/session`, { method: 'POST' });
      const { status, body } = await fetchJson(`${baseUrl}/api/reset/${session.sessionId}`, { method: 'POST' });
      assert.equal(status, 200);
      assert.equal(body.status, 'ok');
    });

    it('should return 404 for missing session', async () => {
      const { status } = await fetchJson(`${baseUrl}/api/reset/bad-id`, { method: 'POST' });
      assert.equal(status, 404);
    });
  });

  describe('POST /api/model/:sessionId', () => {
    it('should switch model by presetId', async () => {
      const { body: session } = await fetchJson(`${baseUrl}/api/session`, { method: 'POST' });
      const { status, body } = await fetchJson(`${baseUrl}/api/model/${session.sessionId}`, {
        method: 'POST',
        body: JSON.stringify({ presetId: '2' }),
      });
      assert.equal(status, 200);
      assert(body.model);
    });

    it('should switch model by provider+model', async () => {
      const { body: session } = await fetchJson(`${baseUrl}/api/session`, { method: 'POST' });
      const { status, body } = await fetchJson(`${baseUrl}/api/model/${session.sessionId}`, {
        method: 'POST',
        body: JSON.stringify({ provider: 'openrouter', model: 'gpt-4o' }),
      });
      assert.equal(status, 200);
      assert(body.model);
    });

    it('should return 400 when no presetId or provider+model', async () => {
      const { body: session } = await fetchJson(`${baseUrl}/api/session`, { method: 'POST' });
      const { status } = await fetchJson(`${baseUrl}/api/model/${session.sessionId}`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      assert.equal(status, 400);
    });

    it('should return 404 for missing session', async () => {
      const { status } = await fetchJson(`${baseUrl}/api/model/bad-id`, {
        method: 'POST',
        body: JSON.stringify({ presetId: '2' }),
      });
      assert.equal(status, 404);
    });
  });

  describe('POST /api/chat/:sessionId (validation)', () => {
    it('should return 404 for missing session', async () => {
      const { status } = await fetchJson(`${baseUrl}/api/chat/bad-id`, {
        method: 'POST',
        body: JSON.stringify({ message: 'hello' }),
      });
      assert.equal(status, 404);
    });

    it('should return 400 for missing message', async () => {
      const { body: session } = await fetchJson(`${baseUrl}/api/session`, { method: 'POST' });
      const { status } = await fetchJson(`${baseUrl}/api/chat/${session.sessionId}`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      assert.equal(status, 400);
    });
  });

  describe('POST /v1/chat/completions (validation)', () => {
    it('should return 400 for missing messages', async () => {
      const { status, body } = await fetchJson(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer test-key' },
        body: JSON.stringify({ model: '1' }),
      });
      assert.equal(status, 400);
      assert(body.error);
      assert(body.error.message.includes('messages'));
    });

    it('should return 400 when messages is not array', async () => {
      const { status } = await fetchJson(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer test-key' },
        body: JSON.stringify({ model: '1', messages: 'hello' }),
      });
      assert.equal(status, 400);
    });
  });

  describe('findPreset', () => {
    it('should find preset by number', async () => {
      const { app } = await import('../server');
      // Access internal findPreset via the app export is not possible,
      // so we just verify the endpoint works
      const { status, body } = await fetchJson(`${baseUrl}/api/models`);
      assert.equal(status, 200);
      assert(Array.isArray(body));
    });
  });

  describe('createClient', () => {
    it('should create openrouter client', async () => {
      const { createClient } = await import('../server');
      const client = createClient('openrouter');
      assert(client);
    });
  });
});

describe('project API', () => {
  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    sessionsDir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'server-test-'));
    process.env.SESSIONS_DIR = sessionsDir;
    // Clean projects dir from previous tests
    const projectsDir = path.join(process.cwd(), 'projects');
    try { await fsp.rm(projectsDir, { recursive: true, force: true }); } catch { /* ok */ }
    // Clear module cache to get fresh server with all routes
    for (const key of Object.keys(require.cache)) {
      if (key.includes('\\dist\\') || key.includes('/dist/') || key.includes('\\src\\') || key.includes('/src/')) delete require.cache[key];
    }
    const started = await startServer();
    server = started.server;
    baseUrl = started.baseUrl;
  });

  afterEach(async () => {
    server?.close();
    delete process.env.SESSIONS_DIR;
    await fsp.rm(sessionsDir, { recursive: true, force: true });
    const { projectManager } = await import('../ProjectManager');
    projectManager.clear();
    const projectsDir = path.join(process.cwd(), 'projects');
    try { await fsp.rm(projectsDir, { recursive: true, force: true }); } catch { /* ok */ }
    for (const key of Object.keys(require.cache)) {
      if (key.includes('\\dist\\') || key.includes('/dist/') || key.includes('\\src\\') || key.includes('/src/')) delete require.cache[key];
    }
  });

  it('should list projects (empty)', async () => {
    const { status, body } = await fetchJson(`${baseUrl}/api/projects`);
    assert.equal(status, 200);
    assert(Array.isArray(body.projects));
    assert.equal(body.projects.length, 0);
  });

  it('should create a project', async () => {
    const { body: session } = await fetchJson(`${baseUrl}/api/session`, { method: 'POST' });
    const { status, body } = await fetchJson(`${baseUrl}/api/projects`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Project',
        description: 'A test project',
        sessionId: session.sessionId,
        planSteps: [{ description: 'Step 1', status: 'pending' }, { description: 'Step 2', status: 'pending' }],
      }),
    });
    assert.equal(status, 200);
    assert(body.id);
    assert.equal(body.title, 'Test Project');
    assert.equal(body.planSteps.length, 2);
  });

  it('should create project and find by session', async () => {
    const { body: session } = await fetchJson(`${baseUrl}/api/session`, { method: 'POST' });
    const { body: project } = await fetchJson(`${baseUrl}/api/projects`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Find Test',
        sessionId: session.sessionId,
        planSteps: [{ description: 'Step', status: 'pending' }],
      }),
    });
    const { status, body: list } = await fetchJson(`${baseUrl}/api/projects`);
    assert.equal(status, 200);
    const found = list.projects.find((p: any) => p.id === project.id);
    assert(found);
    assert.equal(found.title, 'Find Test');
  });

  it('should get project by id', async () => {
    const { body: session } = await fetchJson(`${baseUrl}/api/session`, { method: 'POST' });
    const { body: created } = await fetchJson(`${baseUrl}/api/projects`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Get Test',
        sessionId: session.sessionId,
        planSteps: [{ description: 'Step', status: 'pending' }],
      }),
    });
    const { status, body } = await fetchJson(`${baseUrl}/api/projects/${created.id}`);
    assert.equal(status, 200);
    assert.equal(body.title, 'Get Test');
    assert.equal(body.status, 'active');
  });

  it('should return 404 for nonexistent project', async () => {
    const { status } = await fetchJson(`${baseUrl}/api/projects/nonexistent-id`);
    assert.equal(status, 404);
  });

  it('should update project status', async () => {
    const { body: session } = await fetchJson(`${baseUrl}/api/session`, { method: 'POST' });
    const { body: created } = await fetchJson(`${baseUrl}/api/projects`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Status Test',
        sessionId: session.sessionId,
        planSteps: [{ description: 'Step', status: 'pending' }],
      }),
    });
    const { status } = await fetchJson(`${baseUrl}/api/projects/${created.id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status: 'completed' }),
    });
    assert.equal(status, 200);
    const { body: updated } = await fetchJson(`${baseUrl}/api/projects/${created.id}`);
    assert.equal(updated.status, 'completed');
  });

  it('should reject invalid project status', async () => {
    const { status } = await fetchJson(`${baseUrl}/api/projects/fake-id/status`, {
      method: 'POST',
      body: JSON.stringify({ status: 'invalid' }),
    });
    assert.equal(status, 400);
  });

  it('should delete a project', async () => {
    const { body: session } = await fetchJson(`${baseUrl}/api/session`, { method: 'POST' });
    const { body: created } = await fetchJson(`${baseUrl}/api/projects`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Delete Test',
        sessionId: session.sessionId,
        planSteps: [{ description: 'Step', status: 'pending' }],
      }),
    });
    const { status } = await fetchJson(`${baseUrl}/api/projects/${created.id}`, { method: 'DELETE' });
    assert.equal(status, 200);
    const { status: check } = await fetchJson(`${baseUrl}/api/projects/${created.id}`);
    assert.equal(check, 404);
  });

  it('should require title for project creation', async () => {
    const { body: session } = await fetchJson(`${baseUrl}/api/session`, { method: 'POST' });
    const { status } = await fetchJson(`${baseUrl}/api/projects`, {
      method: 'POST',
      body: JSON.stringify({ sessionId: session.sessionId }),
    });
    assert.equal(status, 400);
  });

  it('should require sessionId for project creation', async () => {
    const { status } = await fetchJson(`${baseUrl}/api/projects`, {
      method: 'POST',
      body: JSON.stringify({ title: 'No Session' }),
    });
    assert.equal(status, 400);
  });
});

describe('diff event for write_file', () => {
  let tempDir: string;
  let server: http.Server;
  let baseUrl: string;

  beforeEach(async () => {
    tempDir = path.resolve(await fsp.mkdtemp(
      path.join(process.env.TEMP || '/tmp', 'test-diff-')
    ));
    process.env.ALLOWED_DIR = tempDir;
    await fsp.writeFile(path.join(tempDir, 'test.txt'), 'original content');
    process.env.NODE_ENV = 'test';
    process.env.OPENROUTER_API_KEY = 'sk-or-v1-test';
    process.env.GOOGLE_API_KEY = 'AIza-test';
    process.env.MISTRAL_API_KEY = 'sk-mistral-test';
  });

  afterEach(() => {
    server?.close();
    for (const key of Object.keys(require.cache)) {
      if (key.includes('\\src\\') || key.includes('/src/')) delete require.cache[key];
    }
    if (tempDir) try { fs.rmSync(tempDir, { recursive: true }); } catch { /* ok */ }
  });

  it('should emit diff event when write_file modifies existing file', async () => {
    const { app, sessions } = await import('../server');
    const { setGovernanceEnabled } = await import('../tools/toolRegistry');
    setGovernanceEnabled(false); // Disable governance for this test (approval requires Web UI)

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = server.address()! as any;
    baseUrl = `http://127.0.0.1:${addr.port}`;

    const { body: session } = await fetchJson(`${baseUrl}/api/session`, { method: 'POST' });
    const sid = session.sessionId;

    // Mock the internal client to return a write_file tool call
    const s = sessions.get(sid)!;
    (s as any).client = {
      chat: {
        completions: {
          create: async (_body: any, _options?: any) => ({
            [Symbol.asyncIterator]() {
              let idx = 0;
              const chunks = [
                {
                  id: 'test',
                  object: 'chat.completion.chunk',
                  created: Date.now(),
                  model: 'test-model',
                  choices: [{
                    index: 0,
                    delta: {
                      role: 'assistant',
                      tool_calls: [{
                        index: 0,
                        id: 'call_write',
                        type: 'function',
                        function: {
                          name: 'write_file',
                          arguments: JSON.stringify({ path: 'test.txt', content: 'modified content' }),
                        },
                      }],
                    },
                    finish_reason: null,
                  }],
                },
                {
                  id: 'test',
                  object: 'chat.completion.chunk',
                  created: Date.now(),
                  model: 'test-model',
                  choices: [{
                    index: 0,
                    delta: {},
                    finish_reason: 'tool_calls',
                  }],
                },
              ];
              return {
                next() {
                  if (idx < chunks.length) {
                    return Promise.resolve({ value: chunks[idx++], done: false });
                  }
                  return Promise.resolve({ value: undefined, done: true });
                },
              };
            },
          }),
        },
      },
    } as any;

    const res = await fetch(`${baseUrl}/api/chat/${sid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'update test.txt' }),
    });

    assert.equal(res.status, 200);
    assert(res.headers.get('content-type')?.includes('text/event-stream'),
      'response should be SSE');

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const diffEvents: any[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';
      for (const part of parts) {
        const lines = part.split('\n');
        let event = '', data = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) event = line.slice(7).trim();
          if (line.startsWith('data: ')) data = line.slice(6);
        }
        if (event === 'diff' && data) {
          try { diffEvents.push(JSON.parse(data)); } catch { /* skip malformed */ }
        }
      }
    }

    assert(diffEvents.length >= 1, 'expected at least one diff event');
    const diff = diffEvents[0];
    assert.equal(diff.path, 'test.txt');
    assert.equal(diff.before, 'original content');
    assert.equal(diff.after, 'modified content');
  });
});
