import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConversationState } from '../ConversationState';

describe('ConversationState', () => {
  describe('trimToContextWindow', () => {
    it('should keep messages within limit unchanged', () => {
      const state = ConversationState.withSystemPrompt('You are a helpful assistant.')
        .addUserMessage('hello')
        .addAssistantMessage('hi there');
      const trimmed = state.trimToContextWindow(128_000);
      assert.equal(trimmed.getAllMessages().length, 3);
    });

    it('should truncate long tool results', () => {
      const longContent = 'x'.repeat(6000);
      const state = ConversationState.withSystemPrompt('system')
        .addUserMessage('hi')
        .addAssistantMessage('running tool')
        .addToolResult('call_1', longContent, 'read_file');
      const trimmed = state.trimToContextWindow(128_000);
      const msgs = trimmed.getAllMessages();
      const toolMsg = msgs.find(m => m.role === 'tool')!;
      assert(toolMsg.content.length < 5500);
      assert(toolMsg.content.includes('[truncated'));
    });

    it('should drop oldest user exchanges when exceeding MAX_EXCHANGES', () => {
      // We need to simulate more than MAX_EXCHANGES (default 20) user messages
      const MAX = 20;
      let state = ConversationState.withSystemPrompt('system');
      for (let i = 1; i <= MAX + 5; i++) {
        state = state.addUserMessage(`user msg ${i}`)
          .addAssistantMessage(`assistant reply ${i}`);
      }
      assert.equal(state.getAllMessages().filter(m => m.role === 'user').length, MAX + 5);

      const trimmed = state.trimToContextWindow(128_000);
      const userMsgs = trimmed.getAllMessages().filter(m => m.role === 'user');
      assert.equal(userMsgs.length, MAX);
      // The first user messages should be dropped
      assert(!userMsgs.some(m => m.content === 'user msg 1'));
    });

    it('should keep system messages intact during sliding window trim', () => {
      let state = ConversationState.withSystemPrompt('You are a helpful coding assistant.');
      for (let i = 1; i <= 25; i++) {
        state = state.addUserMessage(`msg ${i}`)
          .addAssistantMessage(`reply ${i}`);
      }
      const trimmed = state.trimToContextWindow(128_000);
      const systemMsgs = trimmed.getAllMessages().filter(m => m.role === 'system');
      assert.equal(systemMsgs.length, 1);
      assert.equal(systemMsgs[0].content, 'You are a helpful coding assistant.');
    });
  });

  describe('removeLastAssistantTurn', () => {
    it('should remove the last assistant turn with tool calls and subsequent tool results', () => {
      const state = ConversationState.withSystemPrompt('system')
        .addUserMessage('do something')
        .addAssistantMessage('thinking...', [{ id: 'call_1', type: 'function', function: { name: 'read_file', arguments: '{}' } }])
        .addToolResult('call_1', 'file content')
        .addAssistantMessage('done');
      const restored = state.removeLastAssistantTurn();
      const msgs = restored.getAllMessages();
      assert.equal(msgs.length, 2); // system + user
      assert.equal(msgs[0].role, 'system');
      assert.equal(msgs[1].role, 'user');
    });

    it('should not modify state if no assistant turn with tool_calls exists', () => {
      const state = ConversationState.withSystemPrompt('system')
        .addUserMessage('hello')
        .addAssistantMessage('hi');
      const restored = state.removeLastAssistantTurn();
      assert.equal(restored.getAllMessages().length, 3);
    });
  });

  describe('addSystemMessage', () => {
    it('should insert system message right after the first system message', () => {
      const state = ConversationState.withSystemPrompt('original system')
        .addUserMessage('hi')
        .addAssistantMessage('hello')
        .addSystemMessage('[RECOVERY] Fix your approach');
      const msgs = state.getAllMessages();
      assert.equal(msgs[0].role, 'system');
      assert.equal(msgs[0].content, 'original system');
      assert.equal(msgs[1].role, 'system');
      assert.equal(msgs[1].content, '[RECOVERY] Fix your approach');
    });
  });

  describe('fromMessages and getAllMessages', () => {
    it('should preserve messages passed to fromMessages', () => {
      const msgs = [
        { role: 'system' as const, content: 'sys' },
        { role: 'user' as const, content: 'hi' },
      ];
      const state = ConversationState.fromMessages(msgs);
      assert.equal(state.getAllMessages().length, 2);
      assert.deepEqual([...state.getAllMessages()], msgs);
    });

    it('should not mutate the original messages array', () => {
      const msgs: any[] = [{ role: 'system', content: 'sys' }];
      const state = ConversationState.fromMessages(msgs);
      msgs.push({ role: 'user', content: 'extra' });
      assert.equal(state.getAllMessages().length, 1);
    });
  });
});
