/**
 * Comprehensive test for recent improvements.
 * Tests core logic without requiring API keys or model access.
 */

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}`);
    failed++;
  }
}

// ─────────────────────────────────────────────
// 1. Token estimation
// ─────────────────────────────────────────────
console.log('\n── Token Estimation ──────────────────');

function estimateMessageTokens(msg) {
  let tokens = 4;
  if (msg.content) {
    tokens += Math.ceil(msg.content.length / 4);
  }
  if (msg.tool_calls) {
    for (const tc of msg.tool_calls) {
      tokens += Math.ceil(tc.function.name.length / 4);
      tokens += Math.ceil(tc.function.arguments.length / 4);
    }
  }
  return tokens;
}

function estimateTotalTokens(messages) {
  return messages.reduce((sum, msg) => sum + estimateMessageTokens(msg), 0);
}

// Empty message
assert(estimateMessageTokens({ role: 'user', content: '' }) === 4, 'Empty message = 4 tokens');

// Short content
const msg1 = estimateMessageTokens({ role: 'user', content: 'hello' });
assert(msg1 === 6, `"hello" = 6 tokens (got ${msg1})`);

// Longer content
const msg2 = estimateMessageTokens({ role: 'user', content: 'Hello, please list all files in the current directory.' });
assert(msg2 > 4 && msg2 < 30, `Longer content reasonable (got ${msg2})`);

// Tool call message
const toolMsg = {
  role: 'assistant',
  content: null,
  tool_calls: [
    {
      id: 'call_123',
      type: 'function',
      function: { name: 'read_file', arguments: '{"path":"test.txt"}' },
    },
  ],
};
const toolTokens = estimateMessageTokens(toolMsg);
assert(toolTokens > 4, `Tool call message > 4 tokens (got ${toolTokens})`);

// Multiple messages total
const total = estimateTotalTokens([
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'list files' },
  { role: 'assistant', content: 'Here are the files:' },
]);
assert(total > 10, `Multiple messages total reasonable (got ${total})`);

// ─────────────────────────────────────────────
// 2. Context trimming logic
// ─────────────────────────────────────────────
console.log('\n── Context Trimming ───────────────────');

function trimToContextWindow(messages, maxTokens) {
  const CONTEXT_USAGE_TARGET = 0.7;
  const safeMax = Math.floor(maxTokens * CONTEXT_USAGE_TARGET);
  const currentTokens = estimateTotalTokens(messages);
  if (currentTokens <= safeMax) return { trimmed: false, messages };

  const systemMsgs = messages.filter(m => m.role === 'system');
  const otherMsgs = messages.filter(m => m.role !== 'system');

  let tokens = estimateTotalTokens(systemMsgs);
  const kept = [];

  for (let i = otherMsgs.length - 1; i >= 0; i--) {
    const msgTokens = estimateMessageTokens(otherMsgs[i]);
    if (tokens + msgTokens <= safeMax) {
      tokens += msgTokens;
      kept.unshift(otherMsgs[i]);
    }
  }

  return { trimmed: true, messages: [...systemMsgs, ...kept], dropped: otherMsgs.length - kept.length };
}

// Create many messages to force trimming
const manyMessages = [
  { role: 'system', content: 'System prompt' },
  ...Array.from({ length: 50 }, (_, i) => ({ role: 'user', content: `Message ${i}` })),
];

const result = trimToContextWindow(manyMessages, 200);
assert(result.trimmed === true, 'Trims when over limit');
assert(result.messages.length < 51, `Dropped some messages (kept ${result.messages.length})`);
assert(result.messages[0].role === 'system', 'System prompt preserved');
assert(result.messages[result.messages.length - 1].content === 'Message 49', 'Most recent message kept');

// No trim needed when under limit
const smallMsgs = [
  { role: 'system', content: 'System prompt' },
  { role: 'user', content: 'Hello' },
];
const noTrimResult = trimToContextWindow(smallMsgs, 100000);
assert(noTrimResult.trimmed === false, 'No trim when under limit');

// ─────────────────────────────────────────────
// 3. Tool call dedup logic
// ─────────────────────────────────────────────
console.log('\n── Tool Call Dedup ────────────────────');

const toolCalls = [
  { id: '1', type: 'function', function: { name: 'read_file', arguments: '{"path":"a.txt"}' } },
  { id: '2', type: 'function', function: { name: 'read_file', arguments: '{"path":"a.txt"}' } }, // dup
  { id: '3', type: 'function', function: { name: 'read_file', arguments: '{"path":"b.txt"}' } },
  { id: '4', type: 'function', function: { name: 'run_command', arguments: '{"command":"ls"}' } },
];

const seenCalls = new Set();
const knownTools = ['read_file', 'run_command', 'list_files', 'write_file'];
let executed = 0;
let skipped = 0;

for (const tc of toolCalls) {
  if (!knownTools.includes(tc.function.name)) {
    skipped++;
    continue;
  }
  const callKey = `${tc.function.name}(${tc.function.arguments})`;
  if (seenCalls.has(callKey)) {
    skipped++;
    continue;
  }
  seenCalls.add(callKey);
  executed++;
}

assert(executed === 3, `Dedup: 3 executed (got ${executed})`);
assert(skipped === 1, `Dedup: 1 skipped (got ${skipped})`);

// Unknown tool detection
const unknownCalls = [
  { id: '5', type: 'function', function: { name: 'delete_everything', arguments: '{}' } },
  { id: '6', type: 'function', function: { name: 'read_file', arguments: '{"path":"test.txt"}' } },
];

let unkSkips = 0;
for (const tc of unknownCalls) {
  if (!knownTools.includes(tc.function.name)) {
    unkSkips++;
    continue;
  }
}
assert(unkSkips === 1, 'Unknown tool rejected');

// ─────────────────────────────────────────────
// 4. Conversation save/load cycle
// ─────────────────────────────────────────────
console.log('\n── Conversation Save/Load ─────────────');

const fs = require('fs');
const path = require('path');
const testConvFile = path.join(__dirname, '..', 'test-conv.json');

try {
  const testMessages = [
    { role: 'system', content: 'You are a coding agent.' },
    { role: 'user', content: 'hello' },
    { role: 'assistant', content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name: 'read_file', arguments: '{"path":"x.txt"}' } }] },
    { role: 'tool', tool_call_id: 'c1', content: 'file content' },
    { role: 'assistant', content: 'Here is the file.' },
  ];

  // Save
  fs.writeFileSync(testConvFile, JSON.stringify(testMessages, null, 2), 'utf-8');
  assert(fs.existsSync(testConvFile), 'conversation.json created');

  // Load
  const loaded = JSON.parse(fs.readFileSync(testConvFile, 'utf-8'));
  assert(loaded.length === 5, `Loaded 5 messages (got ${loaded.length})`);
  assert(loaded[0].role === 'system', 'First message is system');
  assert(loaded[2].tool_calls[0].function.name === 'read_file', 'Tool calls preserved');
  assert(loaded[3].tool_call_id === 'c1', 'Tool call IDs preserved');

  // Cleanup
  fs.unlinkSync(testConvFile);
  assert(!fs.existsSync(testConvFile), 'Test file cleaned up');

} catch (err) {
  console.log(`  ❌ File save/load error: ${err.message}`);
  failed++;
  // Cleanup on error
  try { fs.unlinkSync(testConvFile); } catch {}
}

// ─────────────────────────────────────────────
// 5. ConversationState immutable pattern
// ─────────────────────────────────────────────
console.log('\n── Conversation State Immutability ───');

class ConversationState {
  constructor(messages) {
    this.messages = Object.freeze([...messages]);
  }
  addUserMessage(content) {
    return new ConversationState([...this.messages, { role: 'user', content }]);
  }
  addAssistantMessage(content, toolCalls) {
    return new ConversationState([...this.messages, { role: 'assistant', content, tool_calls: toolCalls }]);
  }
  addToolResult(toolCallId, content) {
    return new ConversationState([...this.messages, { role: 'tool', tool_call_id: toolCallId, content }]);
  }
  getAllMessages() { return this.messages; }
  static withSystemPrompt(prompt) {
    return new ConversationState([{ role: 'system', content: prompt }]);
  }
  static fromMessages(messages) {
    return new ConversationState(messages);
  }
}

const sysConv = ConversationState.withSystemPrompt('You are helpful.');
const conv1 = sysConv.addUserMessage('hello');
const conv2 = conv1.addAssistantMessage('Hi there!');
const conv3 = conv2.addToolResult('call_1', 'result');

assert(sysConv.getAllMessages().length === 1, 'Original unchanged after addUserMessage');
assert(conv1.getAllMessages().length === 2, 'New state has 2 messages');
assert(conv2.getAllMessages().length === 3, 'New state has 3 messages');
assert(conv3.getAllMessages().length === 4, 'New state has 4 messages');

// fromMessages
const restored = ConversationState.fromMessages(conv3.getAllMessages());
assert(restored.getAllMessages().length === 4, 'fromMessages restores all messages');
assert(restored.getAllMessages()[3].role === 'tool', 'Last message is tool result');

// ─────────────────────────────────────────────
// 6. Summary
// ─────────────────────────────────────────────
console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`  Total: ${passed + failed}  |  ✅ Passed: ${passed}  |  ❌ Failed: ${failed}`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

process.exit(failed > 0 ? 1 : 0);
