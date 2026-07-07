import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('models - PROVIDERS', () => {
  it('should have 13 providers', () => {
    const { PROVIDERS } = require('../config/models');
    const keys = Object.keys(PROVIDERS);
    assert.equal(keys.length, 13);
  });

  it('should include new providers', () => {
    const { PROVIDERS } = require('../config/models');
    assert(PROVIDERS.anthropic);
    assert(PROVIDERS.together);
    assert(PROVIDERS.perplexity);
    assert(PROVIDERS.xai);
    assert(PROVIDERS.cohere);
  });

  it('should define apiKeyEnv for new providers', () => {
    const { PROVIDERS } = require('../config/models');
    assert.equal(PROVIDERS.anthropic.apiKeyEnv, 'ANTHROPIC_API_KEY');
    assert(PROVIDERS.anthropic.baseURL);

    assert.equal(PROVIDERS.together.apiKeyEnv, 'TOGETHER_API_KEY');
    assert.equal(PROVIDERS.perplexity.apiKeyEnv, 'PERPLEXITY_API_KEY');
    assert.equal(PROVIDERS.xai.apiKeyEnv, 'XAI_API_KEY');
    assert.equal(PROVIDERS.cohere.apiKeyEnv, 'COHERE_API_KEY');
  });
});

describe('models - FIXED_PRESETS', () => {
  it('should export fixed presets', () => {
    const { FIXED_PRESETS } = require('../config/models');
    assert(FIXED_PRESETS);
    assert(Object.keys(FIXED_PRESETS).length >= 1);
  });
});

describe('models - SYSTEM_PROMPT', () => {
  it('should export system prompt', () => {
    const { SYSTEM_PROMPT } = require('../config/models');
    assert(typeof SYSTEM_PROMPT === 'string');
    assert(SYSTEM_PROMPT.length > 100);
  });
});
