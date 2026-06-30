/**
 * Comprehensive integration test for:
 *  - Sliding window (MAX_EXCHANGES)
 *  - Tool result truncation (MAX_TOOL_RESULT_LENGTH)
 *  - Stuck detection & recovery
 *  - Token budget trimming
 *  - End-to-end medium project simulation
 */
const path = require('path');
const fs = require('fs');

// ────────────────── Config (mirrors src/agent.ts) ──────────────────
const MAX_EXCHANGES = 20;
const MAX_TOOL_RESULT_LENGTH = 5000;
const CONTEXT_USAGE_TARGET = 0.6;
const DEFAULT_CONTEXT_WINDOW = 128_000;

// ────────────────── Helpers ──────────────────
function estimateMessageTokens(msg) {
  let tokens = 4;
  if (msg.content) tokens += Math.ceil(msg.content.length / 4);
  if (msg.tool_calls) {
    for (const tc of msg.tool_calls) {
      tokens += Math.ceil(tc.function.name.length / 4);
      tokens += Math.ceil(tc.function.arguments.length / 4);
    }
  }
  return tokens;
}

function estimateTotalTokens(messages) {
  return messages.reduce((s, m) => s + estimateMessageTokens(m), 0);
}

function makeMsg(role, content, toolCalls) {
  const m = { role, content };
  if (toolCalls) m.tool_calls = toolCalls;
  return m;
}

function makeToolCall(name, args) {
  return { id: 'call_' + Math.random().toString(36).slice(2, 8),
           type: 'function',
           function: { name, arguments: JSON.stringify(args) } };
}

let passed = 0, failed = 0;
function assert(cond, label) {
  if (cond) { console.log(`  ✅ ${label}`); passed++; }
  else { console.log(`  ❌ ${label}`); failed++; }
}

// ═══════════════════════════════════════════
// 1. ConversationState with sliding window
// ═══════════════════════════════════════════
console.log('\n═══ 1. Sliding Window ═══');

class ConversationState {
  constructor(messages) { this.messages = Object.freeze([...messages]); }
  addUserMessage(content) {
    return new ConversationState([...this.messages, { role: 'user', content }]);
  }
  addAssistantMessage(content, toolCalls) {
    return new ConversationState([...this.messages, { role: 'assistant', content, tool_calls: toolCalls }]);
  }
  addToolResult(toolCallId, content, name) {
    return new ConversationState([...this.messages, { role: 'tool', tool_call_id: toolCallId, content, name }]);
  }
  addSystemMessage(content) {
    const idx = this.messages.findIndex(m => m.role === 'system');
    const copy = [...this.messages];
    copy.splice(idx + 1, 0, { role: 'system', content });
    return new ConversationState(copy);
  }
  removeLastToolResults(count) {
    let removed = 0;
    const kept = [];
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'tool' && removed < count) removed++;
      else kept.unshift(this.messages[i]);
    }
    return new ConversationState(kept);
  }
  getAllMessages() { return this.messages; }
  withSystemPrompt(prompt) { return new ConversationState([{ role: 'system', content: prompt }]); }

  trimToContextWindow(maxTokens) {
    const safeMax = Math.floor(maxTokens * CONTEXT_USAGE_TARGET);
    let messages = [...this.messages];

    // Step 1: truncate long tool results
    messages = messages.map(msg => {
      if (msg.role === 'tool' && msg.content && msg.content.length > MAX_TOOL_RESULT_LENGTH) {
        return { ...msg, content: msg.content.slice(0, MAX_TOOL_RESULT_LENGTH) +
          `\n... [truncated ${msg.content.length - MAX_TOOL_RESULT_LENGTH} more chars]` };
      }
      return msg;
    });

    // Step 2: sliding window
    const systemMsgs = messages.filter(m => m.role === 'system');
    const nonSystem = messages.filter(m => m.role !== 'system');
    const userCount = nonSystem.filter(m => m.role === 'user').length;
    if (userCount > MAX_EXCHANGES) {
      const toDrop = userCount - MAX_EXCHANGES;
      let dropped = 0;
      const kept = [];
      for (const msg of nonSystem) {
        if (msg.role === 'user' && dropped < toDrop) { dropped++; continue; }
        kept.push(msg);
      }
      messages = [...systemMsgs, ...kept];
    }

    // Step 3: token budget
    const totalTokens = estimateTotalTokens(messages);
    if (totalTokens <= safeMax) return new ConversationState(messages);

    const otherMsgs = messages.filter(m => m.role !== 'system');
    let tokens = estimateTotalTokens(systemMsgs);
    const kept = [];
    for (let i = otherMsgs.length - 1; i >= 0; i--) {
      const mt = estimateMessageTokens(otherMsgs[i]);
      if (tokens + mt <= safeMax) { tokens += mt; kept.unshift(otherMsgs[i]); }
    }
    return new ConversationState([...systemMsgs, ...kept]);
  }
}

// Test: many exchanges beyond limit
{
  let conv = (new ConversationState([])).withSystemPrompt('Test agent');
  for (let i = 0; i < 30; i++) {
    conv = conv.addUserMessage(`Request ${i}`);
    conv = conv.addAssistantMessage(`Response ${i} with some content to consume tokens. ` +
      'This is a simulated response that might contain useful information about the project. '.repeat(2));
  }
  const trimmed = conv.trimToContextWindow(DEFAULT_CONTEXT_WINDOW);
  const msgs = trimmed.getAllMessages();
  const userMsgs = msgs.filter(m => m.role === 'user');
  assert(userMsgs.length <= MAX_EXCHANGES,
    `Sliding window: kept ${userMsgs.length} user msgs (max ${MAX_EXCHANGES})`);
  assert(msgs[0].role === 'system', 'System prompt preserved');
  assert(userMsgs[userMsgs.length - 1].content.startsWith('Request 29'), 'Most recent user msg kept');
}

// Test: under limit should not trim
{
  let conv = (new ConversationState([])).withSystemPrompt('Test');
  conv = conv.addUserMessage('hello').addAssistantMessage('hi');
  const msgs = conv.trimToContextWindow(DEFAULT_CONTEXT_WINDOW).getAllMessages();
  assert(msgs.length === 3, `Under limit: kept ${msgs.length} msgs`);
}

// ═══════════════════════════════════════════
// 2. Tool result truncation
// ═══════════════════════════════════════════
console.log('\n═══ 2. Tool Result Truncation ═══');

{
  const longContent = 'A'.repeat(MAX_TOOL_RESULT_LENGTH + 2000);
  let conv = (new ConversationState([])).withSystemPrompt('test');
  conv = conv.addUserMessage('read big file');
  conv = conv.addAssistantMessage(null, [makeToolCall('read_file', { path: 'big.txt' })]);
  conv = conv.addToolResult('call_1', longContent, 'read_file');
  const trimmed = conv.trimToContextWindow(DEFAULT_CONTEXT_WINDOW);
  const toolMsg = trimmed.getAllMessages().find(m => m.role === 'tool');
  assert(toolMsg.content.length <= MAX_TOOL_RESULT_LENGTH + 100,
    `Truncated: ${toolMsg.content.length} chars (max ${MAX_TOOL_RESULT_LENGTH})`);
  assert(toolMsg.content.includes('[truncated'), 'Truncation marker present');
}

// Test: short content not truncated
{
  const shortContent = 'Hello world';
  let conv = (new ConversationState([])).withSystemPrompt('test');
  conv = conv.addUserMessage('read file');
  conv = conv.addAssistantMessage(null, [makeToolCall('read_file', { path: 'small.txt' })]);
  conv = conv.addToolResult('call_1', shortContent, 'read_file');
  const trimmed = conv.trimToContextWindow(DEFAULT_CONTEXT_WINDOW);
  const toolMsg = trimmed.getAllMessages().find(m => m.role === 'tool');
  assert(toolMsg.content === shortContent, 'Short content not truncated');
}

// ═══════════════════════════════════════════
// 3. Stuck detection & recovery
// ═══════════════════════════════════════════
console.log('\n═══ 3. Stuck Detection & Recovery ═══');

function detectStuck(toolHistory) {
  if (toolHistory.length < 5) return null;
  const lastCall = toolHistory[toolHistory.length - 1];
  if (toolHistory.filter(c => c === lastCall).length >= 3) return `"${lastCall}" repeated 3+ times`;
  const last5 = toolHistory.slice(-5);
  if (last5.every(c => c === last5[0])) return `"${last5[0]}" called 5 times consecutively`;
  return null;
}

// Test: 3 identical calls detected
{
  const history = ['read_file({"path":"x.ts"})', 'write_file({"path":"y.ts"})',
                   'read_file({"path":"x.ts"})', 'read_file({"path":"x.ts"})',
                   'read_file({"path":"x.ts"})'];
  const result = detectStuck(history);
  assert(result !== null, '3× identical call detected');
  assert(result.includes('read_file'), 'Correct function named');
}

// Test: 5 consecutive identical calls detected
{
  const history = Array(5).fill('run_command({"command":"npm test"})');
  const result = detectStuck(history);
  assert(result !== null, '5× consecutive identical calls detected');
}

// Test: no false positive for normal patterns
{
  const history = ['a()', 'b()', 'a()', 'b()', 'a()', 'c()'];
  assert(detectStuck(history) === null, 'No false positive for alternating calls');
}

// Test: recovery message injection + tool result removal
{
  let conv = (new ConversationState([])).withSystemPrompt('test');
  conv = conv.addUserMessage('fix the code');
  conv = conv.addAssistantMessage(null, [makeToolCall('read_file', { path: 'x.ts' })]);
  conv = conv.addToolResult('call_1', 'file content');
  conv = conv.addAssistantMessage(null, [makeToolCall('read_file', { path: 'x.ts' })]);
  conv = conv.addToolResult('call_2', 'file content');
  conv = conv.addAssistantMessage(null, [makeToolCall('read_file', { path: 'x.ts' })]);
  conv = conv.addToolResult('call_3', 'file content');

  // Simulate recovery: remove last 3 tool results + inject system msg
  const beforeMsgs = conv.getAllMessages().length;
  conv = conv.removeLastToolResults(3)
    .addSystemMessage('[RECOVERY] You were stuck. Try something different.');
  const afterMsgs = conv.getAllMessages();

  const toolResults = afterMsgs.filter(m => m.role === 'tool');
  assert(toolResults.length === 0, 'All 3 repetitive tool results removed');
  const sysMsgs = afterMsgs.filter(m => m.role === 'system');
  assert(sysMsgs.length === 2, 'Recovery system message added');
  assert(sysMsgs[1].content.includes('RECOVERY'), 'Recovery message content correct');
}

// ═══════════════════════════════════════════
// 4. Medium project simulation
// ═══════════════════════════════════════════
console.log('\n═══ 4. Medium Project Simulation ═══');

const testDir = path.join(__dirname, '..', '.test-tmp-project');
const projectFiles = {
  'src/main.ts': `import { greet } from './utils';
import { Config } from './config';

const cfg: Config = { name: 'test', version: 1 };
console.log(greet(cfg));
`,
  'src/utils.ts': `export function greet(cfg: { name: string }): string {
  return \`Hello, \${cfg.name}!\`;
}

export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}
`,
  'src/config.ts': `export interface Config {
  name: string;
  version: number;
  debug?: boolean;
}

export const defaultConfig: Config = { name: 'app', version: 1 };
`,
  'tests/main.test.ts': `import { greet, add } from '../src/utils';

describe('main', () => {
  it('greets', () => { expect(greet({ name: 'World' })).toBe('Hello, World!'); });
  it('adds', () => { expect(add(1, 2)).toBe(3); });
});
`,
  'package.json': JSON.stringify({ name: 'test-project', scripts: { test: 'jest' } }, null, 2),
  'tsconfig.json': JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'commonjs' } }, null, 2),
};

// Create test project
try { fs.rmSync(testDir, { recursive: true, force: true }); } catch {}
for (const [fpath, content] of Object.entries(projectFiles)) {
  const full = path.join(testDir, fpath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf-8');
}
assert(fs.existsSync(path.join(testDir, 'src/main.ts')), 'Test project created');
assert(fs.existsSync(path.join(testDir, 'tests/main.test.ts')), 'Test files created');

// Simulate a realistic agent session on this project
console.log('  Simulating agent session on test project...');
let session = (new ConversationState([])).withSystemPrompt(
  'You are a coding agent. Use tools to read and modify files.' +
  ' The project is at ' + testDir
);

// Helper: simulate a full exchange (user → assistant with tool calls → tool results)
function simulateExchange(conv, userMsg, toolCalls, toolResults) {
  conv = conv.addUserMessage(userMsg);
  conv = conv.addAssistantMessage(null, toolCalls);
  for (let i = 0; i < toolCalls.length; i++) {
    conv = conv.addToolResult(toolCalls[i].id, toolResults[i] || '(result)');
  }
  conv = conv.addAssistantMessage('Done with this step.');
  return conv;
}

// Simulate 10 exchanges (medium project)
const callIdGen = () => 'c_' + Math.random().toString(36).slice(2, 8);
const t = (name, args, result) => ({
  call: makeToolCall(name, args),
  result: result || `Result of ${name}(${JSON.stringify(args)})`
});

const exchanges = [
  { user: 'Read the project structure', tools: [
    t('list_files', { directory: testDir }, 'main.ts, utils.ts, config.ts, tests/'),
    t('read_file', { path: path.join(testDir, 'src/main.ts') }, projectFiles['src/main.ts']),
    t('read_file', { path: path.join(testDir, 'src/utils.ts') }, projectFiles['src/utils.ts']),
  ]},
  { user: 'Read config and tests', tools: [
    t('read_file', { path: path.join(testDir, 'src/config.ts') }, projectFiles['src/config.ts']),
    t('read_file', { path: path.join(testDir, 'tests/main.test.ts') }, projectFiles['tests/main.test.ts']),
  ]},
  { user: 'Add a subtract function to utils.ts', tools: [
    t('read_file', { path: path.join(testDir, 'src/utils.ts') }, projectFiles['src/utils.ts']),
    t('write_file', { path: path.join(testDir, 'src/utils.ts'),
         content: projectFiles['src/utils.ts'] + '\nexport function subtract(a: number, b: number): number { return a - b; }\n' },
      'File written'),
  ]},
  { user: 'Run the tests', tools: [
    t('run_command', { command: 'cd ' + testDir + ' && npm test', timeout: 30000 }, 'Tests passed: 2/2'),
  ]},
  { user: 'Add a new feature: Config validation', tools: [
    t('read_file', { path: path.join(testDir, 'src/config.ts') }, projectFiles['src/config.ts']),
    t('write_file', { path: path.join(testDir, 'src/config.ts'),
         content: projectFiles['src/config.ts'] + '\nexport function validate(c: Config): boolean { return c.name.length > 0; }\n' },
      'File written'),
  ]},
  { user: 'Add unit test for validation', tools: [
    t('read_file', { path: path.join(testDir, 'tests/main.test.ts') }, projectFiles['tests/main.test.ts']),
    t('write_file', { path: path.join(testDir, 'tests/main.test.ts'),
         content: projectFiles['tests/main.test.ts'] + "\nit('validates config', () => { expect(validate({ name: 'x', version: 1 })).toBe(true); });\n" },
      'File written'),
  ]},
  { user: 'Run tests again', tools: [
    t('run_command', { command: 'cd ' + testDir + ' && npm test', timeout: 30000 }, 'Tests passed: 3/3'),
  ]},
  { user: 'Create a README for the project', tools: [
    t('write_file', { path: path.join(testDir, 'README.md'),
         content: '# Test Project\n\nA sample project for integration testing.\n' },
      'File written'),
  ]},
  { user: 'Add more features: double function', tools: [
    t('read_file', { path: path.join(testDir, 'src/utils.ts') }, projectFiles['src/utils.ts']),
    t('write_file', { path: path.join(testDir, 'src/utils.ts'),
         content: projectFiles['src/utils.ts'] + '\nexport function double(n: number): number { return n * 2; }\n' },
      'File written'),
  ]},
  { user: 'Final test run', tools: [
    t('run_command', { command: 'cd ' + testDir + ' && npm test', timeout: 30000 }, 'Tests passed: 3/3'),
  ]},
];

let totalToolCallsSim = 0;
for (const ex of exchanges) {
  const toolCalls = ex.tools.map(t => t.call);
  const results = ex.tools.map(t => t.result);
  session = simulateExchange(session, ex.user, toolCalls, results);
  totalToolCallsSim += toolCalls.length;
}

// Now test that trimming works correctly on this realistic session
const beforeTrimCount = session.getAllMessages().length;
const trimmedSession = session.trimToContextWindow(DEFAULT_CONTEXT_WINDOW);
const afterTrimMsgs = trimmedSession.getAllMessages();

assert(beforeTrimCount > 20, `Session has ${beforeTrimCount} messages (realistic)`);
assert(afterTrimMsgs[0].role === 'system', 'System prompt survives trimming');

const userMsgsAfter = afterTrimMsgs.filter(m => m.role === 'user');
assert(userMsgsAfter.length <= MAX_EXCHANGES,
  `After trim: ${userMsgsAfter.length} user msgs (max ${MAX_EXCHANGES})`);

// Verify the most recent exchange is still there
const lastAssistantMsgs = afterTrimMsgs.filter(m => m.role === 'assistant');
assert(lastAssistantMsgs[lastAssistantMsgs.length - 1].content === 'Done with this step.',
  'Last assistant message preserved');

const budget = Math.floor(DEFAULT_CONTEXT_WINDOW * CONTEXT_USAGE_TARGET);
const totalAfterTrim = estimateTotalTokens(afterTrimMsgs);
assert(totalAfterTrim <= budget,
  `Token budget respected: ${totalAfterTrim} <= ${budget}`);

// Cleanup test project
try { fs.rmSync(testDir, { recursive: true, force: true }); } catch {}

// ═══════════════════════════════════════════
// 5. Token budget + edge cases
// ═══════════════════════════════════════════
console.log('\n═══ 5. Token Budget & Edge Cases ═══');

// Test: extreme token pressure (tiny context window)
{
  let conv = (new ConversationState([])).withSystemPrompt('t');
  for (let i = 0; i < 15; i++) {
    conv = conv.addUserMessage('test '.repeat(100));
    conv = conv.addAssistantMessage('response '.repeat(100));
  }
  const tinyWindow = 500;
  const trimmed = conv.trimToContextWindow(tinyWindow);
  const msgs = trimmed.getAllMessages();
  const totalTokens = estimateTotalTokens(msgs);
  const safeMax = Math.floor(tinyWindow * CONTEXT_USAGE_TARGET);
  assert(totalTokens <= safeMax,
    `Tiny window: ${totalTokens} tokens <= ${safeMax}`);
  assert(msgs[0].role === 'system', 'System preserved under extreme pressure');
}

// Test: empty conversation
{
  const empty = (new ConversationState([])).withSystemPrompt('');
  const trimmed = empty.trimToContextWindow(DEFAULT_CONTEXT_WINDOW);
  assert(trimmed.getAllMessages().length === 1, 'Empty conv: system only');
}

// Test: removeLastToolResults boundary
{
  let conv = (new ConversationState([])).withSystemPrompt('test');
  conv = conv.addUserMessage('hi');
  conv = conv.addToolResult('c1', 'result');
  conv = conv.removeLastToolResults(10);
  const msgs = conv.getAllMessages();
  assert(msgs.length === 2, `removeLastToolResults(10): kept ${msgs.length} msgs`);
  assert(msgs[0].role === 'system', 'System preserved');
  assert(msgs[1].role === 'user', 'User message preserved');
}

// ═══════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════
console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`  Comprehensive Integration Test`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`  Total: ${passed + failed}  |  ✅ Passed: ${passed}  |  ❌ Failed: ${failed}`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
process.exit(failed > 0 ? 1 : 0);
