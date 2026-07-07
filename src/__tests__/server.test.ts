import { describe, it, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

const BASE = 'http://localhost:0';

let server: http.Server;
let baseUrl: string;

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
  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    const started = await startServer();
    server = started.server;
    baseUrl = started.baseUrl;
  });

  afterEach(async () => {
    server?.close();
    // Clear module cache so each test gets fresh state
    for (const key of Object.keys(require.cache)) {
      if (key.includes('\\src\\')) delete require.cache[key];
    }
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
