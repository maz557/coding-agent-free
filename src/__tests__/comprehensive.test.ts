import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ChatMessage } from '../types';
import { ModelPreset } from '../config/models';

// ─── Token Estimator ────────────────────────────────────────────
describe('tokenEstimator', () => {
  const { estimateMessageTokens, estimateTotalTokens } = require('../tokenEstimator');

  it('should estimate tokens for a simple message', () => {
    const msg: ChatMessage = { role: 'user', content: 'hello world' };
    const tokens = estimateMessageTokens(msg);
    assert(tokens > 0);
    assert(tokens < 20);
  });

  it('should estimate tokens for assistant with tool_calls', () => {
    const msg: ChatMessage = {
      role: 'assistant',
      content: null,
      tool_calls: [{
        id: 'call_1', type: 'function',
        function: { name: 'read_file', arguments: '{"path":"test.txt"}' },
      }],
    };
    const tokens = estimateMessageTokens(msg);
    assert(tokens > 0);
  });

  it('should estimate tokens for a message with name', () => {
    const msg: ChatMessage = { role: 'tool', tool_call_id: 'call_1', content: 'result', name: 'read_file' };
    const tokens = estimateMessageTokens(msg);
    assert(tokens > 0);
  });

  it('should sum tokens across messages', () => {
    const msgs: ChatMessage[] = [
      { role: 'system', content: 'system prompt' },
      { role: 'user', content: 'hello' },
    ];
    const total = estimateTotalTokens(msgs);
    const sys = estimateMessageTokens(msgs[0]);
    const usr = estimateMessageTokens(msgs[1]);
    assert.equal(total, sys + usr);
  });
});

// ─── Validation ────────────────────────────────────────────────
describe('validation', () => {
  const { isToolCall, isToolCallArray, validateToolInput, validateToolOutput } = require('../validation');

  it('isToolCall should identify valid tool calls', () => {
    const valid = { id: 'call_1', type: 'function', function: { name: 'read_file', arguments: '{}' } };
    assert.equal(isToolCall(valid), true);
  });

  it('isToolCall should reject non-objects', () => {
    assert.equal(isToolCall(null), false);
    assert.equal(isToolCall(42), false);
    assert.equal(isToolCall('string'), false);
  });

  it('isToolCall should reject objects missing fields', () => {
    assert.equal(isToolCall({ id: 'call_1' }), false);
    assert.equal(isToolCall({ id: 'call_1', type: 'function' }), false);
  });

  it('isToolCallArray should validate arrays of tool calls', () => {
    const arr = [
      { id: 'call_1', type: 'function', function: { name: 'read_file', arguments: '{}' } },
      { id: 'call_2', type: 'function', function: { name: 'write_file', arguments: '{}' } },
    ];
    assert.equal(isToolCallArray(arr), true);
  });

  it('isToolCallArray should reject arrays with invalid items', () => {
    assert.equal(isToolCallArray([{ id: 'bad' }]), false);
  });

  it('validateToolInput should parse valid input', () => {
    const result = validateToolInput('read_file', { path: 'test.txt' });
    assert.deepEqual(result, { path: 'test.txt' });
  });

  it('validateToolInput should throw on invalid input', () => {
    assert.throws(() => validateToolInput('read_file', {}), /path/);
    assert.throws(() => validateToolInput('read_file', { path: '' }), /min/);
  });

  it('validateToolInput should return args as-is for unknown tool', () => {
    const result = validateToolInput('unknown_tool', { foo: 'bar' });
    assert.deepEqual(result, { foo: 'bar' });
  });

  it('validateToolOutput should validate string output', () => {
    const result = validateToolOutput('read_file', 'file content');
    assert.equal(result, 'file content');
  });

  it('validateToolOutput should return as-is for unknown tool', () => {
    const result = validateToolOutput('unknown_tool', { foo: 'bar' });
    assert.deepEqual(result, { foo: 'bar' });
  });
});

// ─── Commands ──────────────────────────────────────────────────
describe('commands', () => {
  const { getAllPresets, formatPresetLine } = require('../commands');

  it('getAllPresets should merge fixed and user presets', () => {
    const userPresets: Record<string, ModelPreset> = {
      '10': { provider: 'groq', primary: 'llama-3.3-70b-versatile', fallbacks: [] },
    };
    const all = getAllPresets(userPresets);
    assert(all['1']);
    assert(all['10']);
  });

  it('formatPresetLine should produce correct output', () => {
    const preset: ModelPreset = { provider: 'openrouter', primary: 'openrouter/free', fallbacks: [] };
    const line = formatPresetLine('1', preset);
    assert(line.includes('/model 1'));
    assert(line.includes('openrouter/free'));
  });

  it('formatPresetLine should show fallbacks', () => {
    const preset: ModelPreset = { provider: 'openrouter', primary: 'model-a', fallbacks: ['model-b', 'model-c'] };
    const line = formatPresetLine('5', preset);
    assert(line.includes('model-b'));
    assert(line.includes('model-c'));
  });
});

// ─── Persistence ───────────────────────────────────────────────
describe('persistence', () => {
  const { saveConversation, loadConversation, clearConversation, loadUserPresets, saveUserPresets } = require('../persistence');
  const presetsFile = path.join(__dirname, '..', '..', 'presets.json');
  let origPresets = '';
  before(async () => {
    try { origPresets = await fs.readFile(presetsFile, 'utf-8'); } catch { }
  });
  after(async () => {
    if (origPresets) await fs.writeFile(presetsFile, origPresets, 'utf-8');
    else try { await fs.writeFile(presetsFile, '{}', 'utf-8'); } catch { }
  });

  it('save and load conversation round-trip', async () => {
    const messages: ChatMessage[] = [
      { role: 'system', content: 'test sys' },
      { role: 'user', content: 'hello' },
    ];
    await saveConversation(messages, { provider: 'openrouter', primary: 'test-model', fallbacks: [] });
    const loaded = await loadConversation();
    assert(loaded);
    assert.equal(loaded.messages.length, 2);
    assert.equal(loaded.modelPreset?.primary, 'test-model');

    await saveConversation(messages, null);
    const loaded2 = await loadConversation();
    assert(loaded2);
    assert.equal(loaded2.modelPreset, null);
  });

  it('clear conversation should remove file', async () => {
    await saveConversation([{ role: 'system', content: 'x' }]);
    await clearConversation();
    const loaded = await loadConversation();
    assert.equal(loaded, null);
  });

  it('load conversation with corrupted file returns null', async () => {
    const convFile = path.join(__dirname, '..', '..', 'conversation.json');
    await fs.writeFile(convFile, 'not valid json', 'utf-8');
    const loaded = await loadConversation();
    assert.equal(loaded, null);
    await clearConversation();
  });

  it('load conversation with legacy array format', async () => {
    const convFile = path.join(__dirname, '..', '..', 'conversation.json');
    const legacy = [{ role: 'system' as const, content: 'sys' }, { role: 'user' as const, content: 'hi' }];
    await fs.writeFile(convFile, JSON.stringify(legacy), 'utf-8');
    const loaded = await loadConversation();
    assert(loaded);
    assert.equal(loaded.messages.length, 2);
    assert.equal(loaded.modelPreset, null);
    await clearConversation();
  });

  it('save and load presets round-trip', async () => {
    const presets: Record<string, ModelPreset> = {
      '10': { provider: 'groq', primary: 'llama-3.3-70b-versatile', fallbacks: ['openrouter/free'] },
    };
    await saveUserPresets(presets);
    const loaded = await loadUserPresets();
    assert(loaded['10']);
    assert.equal(loaded['10'].provider, 'groq');
    assert.equal(loaded['10'].primary, 'llama-3.3-70b-versatile');
    assert.deepEqual(loaded['10'].fallbacks, ['openrouter/free']);
  });

  it('load presets with corrupted file returns empty', async () => {
    await fs.writeFile(presetsFile, 'not valid', 'utf-8');
    const loaded = await loadUserPresets();
    assert.deepEqual(loaded, {});
  });
});

// ─── CodingAgent (mocked) ──────────────────────────────────────
describe('CodingAgent', () => {
  const { CodingAgent } = require('../CodingAgent');

  it('should create agent with system prompt', () => {
    const mockClient: any = { chat: { completions: { create: () => Promise.resolve({}) } } };
    const agent = new CodingAgent(
      mockClient, [],
      { provider: 'openrouter', primary: 'test-model', fallbacks: [] },
      'test system prompt',
    );
    const msgs = agent.getConversationMessages();
    assert.equal(msgs.length, 1);
    assert.equal(msgs[0].role, 'system');
    assert.equal(msgs[0].content, 'test system prompt');
  });

  it('should restore messages from saved session', () => {
    const mockClient: any = { chat: { completions: { create: () => Promise.resolve({}) } } };
    const saved: ChatMessage[] = [
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' },
    ];
    const agent = new CodingAgent(mockClient, [], { provider: 'openrouter', primary: 'test-model', fallbacks: [] }, 'sys', saved);
    const msgs = agent.getConversationMessages();
    assert.equal(msgs.length, 3);
  });

  it('should return model config via getModelConfig', () => {
    const mockClient: any = { chat: { completions: { create: () => Promise.resolve({}) } } };
    const config: ModelPreset = { provider: 'groq', primary: 'llama-3.3-70b-versatile', fallbacks: [] };
    const agent = new CodingAgent(mockClient, [], config, 'sys');
    const returned = agent.getModelConfig();
    assert.equal(returned.provider, 'groq');
    assert.equal(returned.primary, 'llama-3.3-70b-versatile');
  });
});

// ─── Integration: modules work together ─────────────────────────
describe('Integration: module consistency', () => {
  it('ConversationState and tokenEstimator agree on types', () => {
    const { ConversationState } = require('../ConversationState');
    const { estimateTotalTokens } = require('../tokenEstimator');

    const state = ConversationState.withSystemPrompt('system prompt')
      .addUserMessage('hello')
      .addAssistantMessage('world');

    const msgs = state.getAllMessages();
    const tokens = estimateTotalTokens(msgs);
    assert(tokens > 0);
    assert.equal(msgs.length, 3);
  });

  it('validation and types are consistent', () => {
    const { isToolCall } = require('../validation');

    const validCall = { id: 'c1', type: 'function', function: { name: 'read_file', arguments: '{}' } };
    assert.equal(isToolCall(validCall), true);
    assert.equal(isToolCall(null), false);
    assert.equal(isToolCall({}), false);
  });

  it('commands and config/models agree on presets', () => {
    const { getAllPresets } = require('../commands');
    const { FIXED_PRESETS } = require('../config/models');

    const all = getAllPresets({});
    assert(Object.keys(all).length >= Object.keys(FIXED_PRESETS).length);
    assert(all['1']);
  });

  it('CodingAgent and ConversationState produce consistent message types', () => {
    const { ConversationState } = require('../ConversationState');
    const { CodingAgent } = require('../CodingAgent');
    const mockClient: any = { chat: { completions: { create: () => Promise.resolve({}) } } };

    const state = ConversationState.withSystemPrompt('sys')
      .addUserMessage('hello')
      .addAssistantMessage('hi');

    // CodingAgent should accept these messages
    const agent = new CodingAgent(
      mockClient, [],
      { provider: 'openrouter', primary: 'test-model', fallbacks: [] },
      'sys',
      state.getAllMessages() as ChatMessage[],
    );
    const msgs = agent.getConversationMessages();
    assert.equal(msgs.length, 3);
  });
});
