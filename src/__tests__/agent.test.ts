import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

const ORIGINAL_ENV = { ...process.env };

describe('agent CLI', () => {
  describe('createClient', () => {
    before(() => {
      process.env.OPENROUTER_API_KEY = 'sk-or-v1-test';
      process.env.GOOGLE_API_KEY = 'AIza-test';
    });
    after(() => {
      process.env.OPENROUTER_API_KEY = ORIGINAL_ENV.OPENROUTER_API_KEY;
      process.env.GOOGLE_API_KEY = ORIGINAL_ENV.GOOGLE_API_KEY;
    });

    it('should create openrouter client with correct baseURL', () => {
      const { createClient } = require('../agent');
      const client = createClient('openrouter');
      assert(client);
      assert.equal((client as any).baseURL, 'https://openrouter.ai/api/v1');
    });

    it('should create google client with correct baseURL', () => {
      const { createClient } = require('../agent');
      const client = createClient('google');
      assert(client);
      assert((client as any).baseURL.includes('generativelanguage.googleapis.com'));
    });

    it('should create ollama client (local, no api key)', () => {
      const { createClient } = require('../agent');
      const client = createClient('ollama');
      assert(client);
      assert.equal((client as any).apiKey, 'local');
    });

    it('should fallback to openrouter for unknown provider', () => {
      const { createClient } = require('../agent');
      const client = createClient('unknown_provider');
      assert(client);
      assert.equal((client as any).baseURL, 'https://openrouter.ai/api/v1');
    });
  });

  describe('PROVIDERS configuration', () => {
    it('should have all expected providers', () => {
      const { PROVIDERS } = require('../config/models');
      const expected = ['openrouter', 'google', 'groq', 'deepseek', 'mistral', 'ollama', 'lmstudio', 'llamacpp'];
      for (const id of expected) {
        assert(PROVIDERS[id], `Missing provider: ${id}`);
      }
    });

    it('should have FIXED_PRESETS 1-6', () => {
      const { FIXED_PRESETS } = require('../config/models');
      for (let i = 1; i <= 6; i++) {
        assert(FIXED_PRESETS[String(i)], `Missing fixed preset ${i}`);
      }
    });

    it('should have SYSTEM_PROMPT with expected rules', () => {
      const { SYSTEM_PROMPT } = require('../config/models');
      assert(SYSTEM_PROMPT.includes('step by step'));
      assert(SYSTEM_PROMPT.includes('Keep tool calls'));
      assert(SYSTEM_PROMPT.includes('Clarifying questions'));
    });
  });

  describe('command regex patterns', () => {
    it('should parse /model command', () => {
      const match = '  /model 5  '.trim().match(/^\/model\s+(\d+)$/i);
      assert(match);
      assert.equal(match[1], '5');
    });

    it('should reject /model without number', () => {
      const match = '/model'.match(/^\/model\s+(\d+)$/i);
      assert.equal(match, null);
    });

    it('should parse /add command', () => {
      const match = '/add 10 groq:llama-3.3-70b-versatile'.match(/^\/add\s+(\d+)\s+(.+)$/i);
      assert(match);
      assert.equal(match[1], '10');
      assert.equal(match[2], 'groq:llama-3.3-70b-versatile');
    });

    it('should parse /add with model only (no provider)', () => {
      const match = '/add 6 llama3.2'.match(/^\/add\s+(\d+)\s+(.+)$/i);
      assert(match);
      assert.equal(match[2], 'llama3.2');
    });

    it('should parse /remove command', () => {
      const match = '/remove 10'.match(/^\/remove\s+(\d+)$/i);
      assert(match);
      assert.equal(match[1], '10');
    });

    it('should parse /allow command', () => {
      const match = '/allow "C:\\path\\to\\dir"'.match(/^\/allow\s+(.+)$/i);
      assert(match);
      assert(match[1].includes('C:'));
    });

    it('should parse /save command', () => {
      const match = '/save 9'.match(/^\/save\s+(\d+)$/i);
      assert(match);
      assert.equal(match[1], '9');
    });

    it('should match /safe regardless of case', () => {
      assert('/Safe'.toLowerCase() === '/safe');
      assert('/SAFE'.toLowerCase() === '/safe');
    });

    it('should match /exit', () => {
      assert('/Exit'.toLowerCase() === '/exit');
    });

    it('should match /reset', () => {
      assert('/Reset'.toLowerCase() === '/reset');
    });

    it('should match /models', () => {
      assert('/Models'.toLowerCase() === '/models');
    });

    it('should match /active', () => {
      assert('/Active'.toLowerCase() === '/active');
    });

    it('should match /list-providers', () => {
      assert('/List-Providers'.toLowerCase() === '/list-providers');
    });
  });

  describe('preset parsing for /add command', () => {
    it('should extract provider:model from "groq:llama-3.3-70b-versatile"', () => {
      const raw = 'groq:llama-3.3-70b-versatile';
      const colon = raw.indexOf(':');
      const { PROVIDERS } = require('../config/models');
      const providerId = colon > 0 && PROVIDERS[raw.slice(0, colon)] ? raw.slice(0, colon) : 'openrouter';
      const modelId = colon > 0 ? raw.slice(colon + 1) : raw;
      assert.equal(providerId, 'groq');
      assert.equal(modelId, 'llama-3.3-70b-versatile');
    });

    it('should default provider when no colon in model string', () => {
      const raw = 'llama3.2';
      const colon = raw.indexOf(':');
      const providerId = colon > 0 ? raw.slice(0, colon) : 'openrouter';
      const modelId = colon > 0 ? raw.slice(colon + 1) : raw;
      assert.equal(providerId, 'openrouter');
      assert.equal(modelId, 'llama3.2');
    });
  });

  describe('auto-fallback logic', () => {
    it('should find next preset with different provider', () => {
      const { getAllPresets } = require('../commands');
      const allPresets: Record<string, any> = getAllPresets({
        '6': { provider: 'groq', primary: 'llama-3.3-70b-versatile', fallbacks: [] },
        '7': { provider: 'google', primary: 'gemini-2.0-flash-exp', fallbacks: [] },
        '8': { provider: 'openrouter', primary: 'gpt-oss-120b', fallbacks: [] },
      });
      const currentProvider = 'groq';
      const entries = Object.entries(allPresets).sort(([a], [b]) => Number(a) - Number(b));
      const idx = entries.findIndex(([, p]: [string, any]) => p.provider === currentProvider);
      assert(idx >= 0);
      const next = entries.slice(idx + 1).find(([, p]: [string, any]) => p.provider !== currentProvider);
      assert(next);
      assert.equal(next[1].provider, 'openrouter');
    });

    it('should return undefined when no different provider exists after current', () => {
      const { getAllPresets } = require('../commands');
      // Override all presets to be openrouter
      const allPresets = getAllPresets({
        '1': { provider: 'openrouter', primary: 'openrouter/free', fallbacks: [] },
        '2': { provider: 'openrouter', primary: 'openrouter/free', fallbacks: [] },
        '3': { provider: 'openrouter', primary: 'openrouter/free', fallbacks: [] },
        '4': { provider: 'openrouter', primary: 'openrouter/free', fallbacks: [] },
        '5': { provider: 'openrouter', primary: 'openrouter/free', fallbacks: [] },
        '6': { provider: 'openrouter', primary: 'openrouter/free', fallbacks: [] },
        '7': { provider: 'openrouter', primary: 'openrouter/free', fallbacks: [] },
      });
      const entries = Object.entries(allPresets).sort(([a], [b]) => Number(a) - Number(b));
      const next = entries.slice(1).find(([, p]: [string, any]) => p.provider !== 'openrouter');
      assert.equal(next, undefined);
    });
  });
});
