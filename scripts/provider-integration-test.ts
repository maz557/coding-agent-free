import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';

const ORIGINAL_ENV = { ...process.env };

function mockErrorClient(status: number, message: string): any {
  return {
    chat: { completions: { create: async () => {
      const err: any = new Error(message);
      err.status = status;
      throw err;
    }}},
  };
}

function mockOkClient(): any {
  return {
    chat: { completions: { create: async () => ({
      [Symbol.asyncIterator]: async function* () {
        yield { choices: [{ delta: { content: 'ok' } }], model: 'test-model' };
        yield { choices: [{ delta: {}, finish_reason: 'stop' }] };
      },
    })}},
  };
}

// ─── Provider Configuration ─────────────────────────────────────

describe('Provider Configuration', () => {
  it('every provider has valid name, baseURL, apiKeyEnv', () => {
    const { PROVIDERS } = require('../src/config/models');
    for (const [id, info] of Object.entries(PROVIDERS) as [string, any][]) {
      assert(info.name, `${id}: missing name`);
      assert(info.baseURL, `${id}: missing baseURL`);
      assert(typeof info.apiKeyEnv === 'string', `${id}: apiKeyEnv must be string`);
    }
  });

  it('cloud providers use HTTPS', () => {
    const { PROVIDERS } = require('../src/config/models');
    for (const id of ['openrouter', 'google', 'groq', 'deepseek', 'mistral']) {
      assert(PROVIDERS[id].baseURL.startsWith('https://'), `${id}: must use HTTPS`);
    }
  });

  it('local providers use localhost with empty apiKeyEnv', () => {
    const { PROVIDERS } = require('../src/config/models');
    for (const id of ['ollama', 'lmstudio', 'llamacpp']) {
      assert.equal(PROVIDERS[id].apiKeyEnv, '');
      assert(PROVIDERS[id].baseURL.includes('localhost'));
    }
  });

  it('all FIXED_PRESETS reference valid providers', () => {
    const { FIXED_PRESETS, PROVIDERS } = require('../src/config/models');
    for (let i = 1; i <= 5; i++) {
      const p = FIXED_PRESETS[String(i)];
      assert(p, `Preset ${i} missing`);
      assert(PROVIDERS[p.provider], `Preset ${i}: unknown provider`);
      assert(p.primary, `Preset ${i}: missing model`);
    }
  });

  it('SYSTEM_PROMPT contains all sections', () => {
    const { SYSTEM_PROMPT } = require('../src/config/models');
    for (const s of ['step by step', 'Keep tool calls', 'Clarifying questions', 'Rules']) {
      assert(SYSTEM_PROMPT.includes(s), `Missing: "${s}"`);
    }
  });
});

// ─── createClient ───────────────────────────────────────────────

describe('createClient', () => {
  before(() => {
    for (const k of ['OPENROUTER_API_KEY', 'GOOGLE_API_KEY', 'GROQ_API_KEY', 'DEEPSEEK_API_KEY', 'MISTRAL_API_KEY']) {
      process.env[k] = `test-${k}`;
    }
  });
  after(() => {
    for (const k of ['OPENROUTER_API_KEY', 'GOOGLE_API_KEY', 'GROQ_API_KEY', 'DEEPSEEK_API_KEY', 'MISTRAL_API_KEY']) {
      process.env[k] = ORIGINAL_ENV[k];
    }
  });

  const cases: [string, string, string][] = [
    ['openrouter', 'https://openrouter.ai/api/v1', ''],
    ['google', 'generativelanguage.googleapis.com', ''],
    ['groq', 'https://api.groq.com/openai/v1', ''],
    ['deepseek', 'https://api.deepseek.com', ''],
    ['mistral', 'https://api.mistral.ai/v1', ''],
  ];
  for (const [provider, urlContains] of cases) {
    it(`creates ${provider} client`, () => {
      const { createClient } = require('../src/agent');
      const client = createClient(provider);
      assert((client as any).baseURL.includes(urlContains));
    });
  }

  it('ollama client uses local apiKey', () => {
    const { createClient } = require('../src/agent');
    assert.equal((createClient('ollama') as any).apiKey, 'local');
  });

  it('falls back to openrouter for unknown provider', () => {
    const { createClient } = require('../src/agent');
    assert((createClient('bogus') as any).baseURL.includes('openrouter'));
  });

  it('openrouter client includes HTTP-Referer header', () => {
    const { createClient } = require('../src/agent');
    const client: any = createClient('openrouter');
    const dh = client._options?.defaultHeaders;
    assert(dh, 'defaultHeaders should exist');
    assert(dh['HTTP-Referer']?.includes('github.com'));
  });
});

// ─── Auto-Fallback Scenarios ───────────────────────────────────

describe('Auto-fallback logic', () => {
  const presets: Record<string, any> = {
    '1': { provider: 'openrouter', primary: 'a', fallbacks: [] },
    '2': { provider: 'openrouter', primary: 'b', fallbacks: [] },
    '3': { provider: 'groq', primary: 'c', fallbacks: [] },
    '4': { provider: 'google', primary: 'd', fallbacks: [] },
    '5': { provider: 'openrouter', primary: 'e', fallbacks: [] },
  };

  function fallbackFrom(current: string, p: Record<string, any>) {
    const entries = Object.entries(p).sort(([a], [b]) => Number(a) - Number(b));
    const idx = entries.findIndex(([, v]: [string, any]) => v.provider === current);
    if (idx === -1) return undefined;
    return entries.slice(idx + 1).find(([, v]: [string, any]) => v.provider !== current);
  }

  it('falls back to groq from openrouter (skipping same-provider)', () => {
    const fb = fallbackFrom('openrouter', presets);
    assert(fb);
    assert.equal(fb[1].provider, 'groq');
    assert.equal(fb[0], '3');
  });

  it('falls back to google from groq', () => {
    const fb = fallbackFrom('groq', presets);
    assert(fb);
    assert.equal(fb[1].provider, 'google');
  });

  it('no fallback when no different provider after current', () => {
    assert.equal(fallbackFrom('openrouter', { '5': presets['5'] }), undefined);
  });

  it('no fallback when all presets share one provider', () => {
    assert.equal(fallbackFrom('openrouter', {
      '1': { provider: 'openrouter', primary: 'a', fallbacks: [] },
      '2': { provider: 'openrouter', primary: 'b', fallbacks: [] },
    }), undefined);
  });

  it('falls back correctly when current is middle of list', () => {
    const fb = fallbackFrom('groq', presets);
    assert(fb);
    assert.equal(fb[1].provider, 'google');
  });
});

// ─── Error Handling via CodingAgent ────────────────────────────

describe('CodingAgent error handling', () => {
  it('returns rate_limit on 429', async () => {
    const { CodingAgent } = require('../src/CodingAgent');
    const agent = new CodingAgent(mockErrorClient(429, 'Too fast'), [], { provider: 'openrouter', primary: 'm', fallbacks: [] }, 'sys');
    const r = await agent.execute('hi');
    assert.equal(r.error, 'rate_limit');
  });

  it('returns api_error on 500', async () => {
    const { CodingAgent } = require('../src/CodingAgent');
    const agent = new CodingAgent(mockErrorClient(500, 'Server error'), [], { provider: 'openrouter', primary: 'm', fallbacks: [] }, 'sys');
    const r = await agent.execute('hi');
    assert.equal(r.error, 'api_error');
  });

  it('returns api_error on 503', async () => {
    const { CodingAgent } = require('../src/CodingAgent');
    const agent = new CodingAgent(mockErrorClient(503, 'Unavailable'), [], { provider: 'openrouter', primary: 'm', fallbacks: [] }, 'sys');
    const r = await agent.execute('hi');
    assert.equal(r.error, 'api_error');
  });

  it('returns api_error (not rate_limit) on 403', async () => {
    const { CodingAgent } = require('../src/CodingAgent');
    const agent = new CodingAgent(mockErrorClient(403, 'Forbidden'), [], { provider: 'openrouter', primary: 'm', fallbacks: [] }, 'sys');
    const r = await agent.execute('hi');
    assert(r.error === 'api_error');
    assert(r.error !== 'rate_limit');
  });

  it('returns rate_limit on 429 with rate_limit_exceeded code', async () => {
    const { CodingAgent } = require('../src/CodingAgent');
    const client: any = { chat: { completions: { create: async () => {
      const err: any = new Error('rate limit');
      err.status = 429;
      err.code = 'rate_limit_exceeded';
      throw err;
    }}} };
    const agent = new CodingAgent(client, [], { provider: 'openrouter', primary: 'm', fallbacks: [] }, 'sys');
    const r = await agent.execute('hi');
    assert.equal(r.error, 'rate_limit');
  });
});

// ─── Provider-specific Presets ─────────────────────────────────

describe('Preset management', () => {
  it('getAllPresets merges fixed and user presets', () => {
    const { getAllPresets } = require('../src/commands');
    const all: any = getAllPresets({ '6': { provider: 'groq', primary: 'llama', fallbacks: [] } });
    assert(all['1'], 'fixed preset missing');
    assert(all['6'], 'user preset missing');
    assert.equal(all['6'].provider, 'groq');
  });

  it('user preset overrides fixed preset when same number', () => {
    const { getAllPresets } = require('../src/commands');
    const all: any = getAllPresets({ '1': { provider: 'groq', primary: 'x', fallbacks: [] } });
    assert.equal(all['1'].provider, 'groq');
  });
});

// ─── Local Provider Detection ──────────────────────────────────

describe('Local provider detection', () => {
  it('throws for unknown provider', async () => {
    const { detectLocalModel } = require('../src/detectLocalModel');
    try {
      await detectLocalModel('bogus');
      assert.fail('Should throw');
    } catch (err: any) {
      assert(err.message.includes('Unknown'));
    }
  });
});
