import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

describe('detectLocalModel', () => {
  const origCacheKeys: string[] = [];

  after(() => {
    for (const key of origCacheKeys) {
      delete require.cache[key];
    }
  });

  it('should throw for unknown provider', async () => {
    const { detectLocalModel } = require('../detectLocalModel');
    await assert.rejects(
      () => detectLocalModel('nonexistent'),
      /Unknown local provider/
    );
  });

  it('should return first model id on success', async () => {
    const openaiPath = require.resolve('openai');
    origCacheKeys.push(openaiPath);

    const mockModels = { data: [{ id: 'qwen3:14b' }] };
    const MockOpenAI = class {
      models = { list: async () => mockModels };
    };

    (require.cache as any)[openaiPath] = {
      exports: { __esModule: true, default: MockOpenAI, OpenAI: MockOpenAI },
    };

    const detectPath = require.resolve('../detectLocalModel');
    delete require.cache[detectPath];
    origCacheKeys.push(detectPath);

    const { detectLocalModel } = require('../detectLocalModel');
    const result = await detectLocalModel('ollama');
    assert.equal(result, 'qwen3:14b');
  });

  it('should throw when model list is empty', async () => {
    const openaiPath = require.resolve('openai');

    const MockOpenAI = class {
      models = { list: async () => ({ data: [] }) };
    };

    (require.cache as any)[openaiPath] = {
      exports: { __esModule: true, default: MockOpenAI, OpenAI: MockOpenAI },
    };

    const detectPath = require.resolve('../detectLocalModel');
    delete require.cache[detectPath];

    const { detectLocalModel } = require('../detectLocalModel');
    await assert.rejects(
      () => detectLocalModel('ollama'),
      /No models found/
    );
  });

  it('should throw when provider unreachable', async () => {
    const openaiPath = require.resolve('openai');

    const MockOpenAI = class {
      models = { list: async () => { throw new Error('connect ECONNREFUSED'); } };
    };

    (require.cache as any)[openaiPath] = {
      exports: { __esModule: true, default: MockOpenAI, OpenAI: MockOpenAI },
    };

    const detectPath = require.resolve('../detectLocalModel');
    delete require.cache[detectPath];

    const { detectLocalModel } = require('../detectLocalModel');
    await assert.rejects(
      () => detectLocalModel('ollama'),
      /Cannot connect to/
    );
  });
});
