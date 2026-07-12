import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

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

describe('smoke', () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.OPENROUTER_API_KEY = 'sk-or-v1-test';
    process.env.GOOGLE_API_KEY = 'AIza-test';
    process.env.MISTRAL_API_KEY = 'sk-mistral-test';
    process.env.GROQ_API_KEY = 'gsk_test';
    const started = await startServer();
    server = started.server;
    baseUrl = started.baseUrl;
  });

  after(() => {
    server?.close();
  });

  it('serves the index page', async () => {
    const r = await fetch(baseUrl);
    assert.equal(r.status, 200);
    const text = await r.text();
    assert.ok(text.includes('Coding Agent'));
  });

  it('GET /api/sessions returns array', async () => {
    const r = await fetch(baseUrl + '/api/sessions');
    assert.equal(r.status, 200);
    const body = await r.json();
    assert.ok(Array.isArray(body));
  });

  it('GET /api/models returns array', async () => {
    const r = await fetch(baseUrl + '/api/models');
    assert.equal(r.status, 200);
    const body = await r.json();
    assert.ok(Array.isArray(body));
  });

  it('POST /api/session creates a session', async () => {
    const r = await fetch(baseUrl + '/api/session', { method: 'POST' });
    assert.equal(r.status, 200);
    const body = await r.json();
    assert.ok(body.sessionId);
  });

  it('GET /api/mode/:sid returns build by default', async () => {
    const create = await (await fetch(baseUrl + '/api/session', { method: 'POST' })).json();
    const r = await fetch(baseUrl + '/api/mode/' + create.sessionId);
    assert.equal(r.status, 200);
    const body = await r.json();
    assert.equal(body.mode, 'build');
  });

  it('POST /api/mode/:sid switches mode', async () => {
    const create = await (await fetch(baseUrl + '/api/session', { method: 'POST' })).json();
    const r = await fetch(baseUrl + '/api/mode/' + create.sessionId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'plan' }),
    });
    assert.equal(r.status, 200);
    const body = await r.json();
    assert.equal(body.mode, 'plan');
    assert.equal(body.label, 'Plan');
  });
});
