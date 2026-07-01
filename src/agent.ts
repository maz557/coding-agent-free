import * as readline from 'readline/promises';
import { stdin, stdout } from 'process';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';
import pino from 'pino';
import pinoPretty from 'pino-pretty';
import { tools, executeTool, allowExtraPath, setSafeMode, isSafeModeEnabled } from './tools/fileManager';

dotenv.config();

const logger = pino(
  { level: process.env.LOG_LEVEL || 'info' },
  pinoPretty({ destination: 2, sync: true })
);

// --- Provider Configuration ---
interface ProviderInfo {
  name: string;
  baseURL: string;
  apiKeyEnv: string;
}

const PROVIDERS: Record<string, ProviderInfo> = {
  openrouter: { name: 'OpenRouter', baseURL: 'https://openrouter.ai/api/v1', apiKeyEnv: 'OPENROUTER_API_KEY' },
  google:     { name: 'Google AI Studio', baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/', apiKeyEnv: 'GOOGLE_API_KEY' },
  groq:       { name: 'Groq', baseURL: 'https://api.groq.com/openai/v1', apiKeyEnv: 'GROQ_API_KEY' },
  deepseek:   { name: 'DeepSeek', baseURL: 'https://api.deepseek.com', apiKeyEnv: 'DEEPSEEK_API_KEY' },
  mistral:    { name: 'Mistral', baseURL: 'https://api.mistral.ai/v1', apiKeyEnv: 'MISTRAL_API_KEY' },
  ollama:     { name: 'Ollama', baseURL: process.env.OLLAMA_HOST || 'http://localhost:11434/v1', apiKeyEnv: '' },
  lmstudio:   { name: 'LM Studio', baseURL: process.env.LMSTUDIO_HOST || 'http://localhost:1234/v1', apiKeyEnv: '' },
  llamacpp:   { name: 'Llama.cpp', baseURL: process.env.LLAMACPP_HOST || 'http://localhost:8080/v1', apiKeyEnv: '' },
};

type ToolCallFunction = {
  name: string;
  arguments: string;
};

type ToolCall = {
  id: string;
  type: 'function';
  function: ToolCallFunction;
};

type ChatMessage =
  | { role: 'system'; content: string; name?: string }
  | { role: 'user'; content: string; name?: string }
  | { role: 'assistant'; content: string | null; name?: string; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string; name?: string };

type OpenAITool = {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
};

interface ModelPreset {
  provider: string;
  primary: string;
  fallbacks: string[];
  contextWindow?: number;
}

interface AgentResult {
  model: string;
  content: string | null;
  logs: string[];
  toolCallsCount: number;
}

type OpenRouterCreateParams = OpenAI.ChatCompletionCreateParams & {
  extra_body?: {
    models?: string[];
  };
};

function isToolCall(obj: unknown): obj is ToolCall {
  if (!obj || typeof obj !== 'object') return false;
  const x = obj as any;
  return (
    typeof x.id === 'string' &&
    x.type === 'function' &&
    x.function &&
    typeof x.function.name === 'string' &&
    typeof x.function.arguments === 'string'
  );
}

function isToolCallArray(obj: unknown): obj is ToolCall[] {
  return Array.isArray(obj) && obj.every(isToolCall);
}

const toolInputSchemas: Record<string, z.ZodTypeAny> = {
  read_file: z.object({ path: z.string().min(1) }),
  write_file: z.object({ path: z.string().min(1), content: z.string() }),
  list_files: z.object({ directory: z.string().optional(), details: z.boolean().optional() }),
  create_folder: z.object({ path: z.string().min(1) }),
  delete_file: z.object({ path: z.string().min(1) }),
  delete_folder: z.object({ path: z.string().min(1), recursive: z.boolean().optional() }),
  file_info: z.object({ path: z.string().min(1) }),
  search_content: z.object({
    pattern: z.string().min(1),
    directory: z.string().optional(),
    filePattern: z.string().optional(),
    maxResults: z.number().int().positive().optional(),
  }),
  replace_in_file: z.object({ path: z.string().min(1), old_str: z.string(), new_str: z.string() }),
  append_file: z.object({ path: z.string().min(1), content: z.string() }),
  copy_file: z.object({ source: z.string().min(1), destination: z.string().min(1) }),
  move_file: z.object({ source: z.string().min(1), destination: z.string().min(1) }),
  run_command: z.object({ command: z.string().min(1), timeout: z.number().int().positive().optional() }),
};

const toolOutputSchemas: Record<string, z.ZodTypeAny> = {
  read_file: z.string(),
  write_file: z.string(),
  list_files: z.string(),
  create_folder: z.string(),
  delete_file: z.string(),
  delete_folder: z.string(),
  file_info: z.string(),
  search_content: z.string(),
  replace_in_file: z.string(),
  append_file: z.string(),
  copy_file: z.string(),
  move_file: z.string(),
  run_command: z.string(),
};

function validateToolInput(toolName: string, args: unknown): unknown {
  const schema = toolInputSchemas[toolName];
  if (!schema) {
    logger.warn({ toolName }, 'No input schema defined for tool');
    return args;
  }
  return schema.parse(args);
}

function validateToolOutput(toolName: string, output: unknown): unknown {
  const schema = toolOutputSchemas[toolName];
  if (!schema) {
    logger.warn({ toolName }, 'No output schema defined for tool');
    return output;
  }
  return schema.parse(output);
}

// --- Context Management ---
const DEFAULT_CONTEXT_WINDOW = 128_000;
const CONTEXT_USAGE_TARGET = 0.6; // keep messages within 60% of context window
const MAX_EXCHANGES = Number(process.env.MAX_EXCHANGES) || 20; // sliding window: keep at most N user ↔ assistant exchanges
const MAX_TOOL_RESULT_LENGTH = Number(process.env.MAX_TOOL_RESULT_LENGTH) || 5000; // truncate tool results longer than this

function estimateMessageTokens(msg: ChatMessage): number {
  let tokens = 4;
  if (msg.name) tokens += Math.ceil(msg.name.length / 4);
  if (msg.content) {
    tokens += Math.ceil(msg.content.length / 4);
  }
  if ('tool_calls' in msg && msg.tool_calls) {
    for (const tc of msg.tool_calls) {
      tokens += Math.ceil(tc.function.name.length / 4);
      tokens += Math.ceil(tc.function.arguments.length / 4);
    }
  }
  return tokens;
}

function estimateTotalTokens(messages: ReadonlyArray<ChatMessage>): number {
  return messages.reduce((sum, msg) => sum + estimateMessageTokens(msg), 0);
}

async function processStreamResponse(
  stream: AsyncIterable<any>,
): Promise<{ content: string; toolCalls: ToolCall[]; model: string }> {
  let content = '';
  const toolCallAccumulators = new Map<number, { id: string; name: string; arguments: string }>();
  let model = '';

  for await (const chunk of stream) {
    if (chunk.model) model = chunk.model;

    const choice = chunk.choices?.[0];
    if (!choice) continue;

    const delta = choice.delta;
    if (!delta) continue;

    if (delta.content) {
      content += delta.content;
      process.stdout.write(delta.content);
    }

    if (delta.tool_calls) {
      for (const tc of delta.tool_calls) {
        const index = tc.index ?? 0;
        if (!toolCallAccumulators.has(index)) {
          toolCallAccumulators.set(index, { id: '', name: '', arguments: '' });
        }
        const acc = toolCallAccumulators.get(index)!;
        if (tc.id) acc.id += tc.id;
        if (tc.function?.name) acc.name += tc.function.name;
        if (tc.function?.arguments) acc.arguments += tc.function.arguments;
      }
    }
  }

  const toolCalls: ToolCall[] = [];
  for (const [, acc] of toolCallAccumulators) {
    if (acc.name) {
      toolCalls.push({
        id: acc.id,
        type: 'function',
        function: { name: acc.name, arguments: acc.arguments },
      });
    }
  }

  return { content, toolCalls, model };
}

class ConversationState {
  private readonly messages: ReadonlyArray<ChatMessage>;

  private constructor(messages: ReadonlyArray<ChatMessage>) {
    this.messages = messages;
  }

  static withSystemPrompt(prompt: string): ConversationState {
    return new ConversationState([{ role: 'system', content: prompt }]);
  }

  static fromMessages(messages: ReadonlyArray<ChatMessage>): ConversationState {
    return new ConversationState(messages);
  }

  addUserMessage(content: string): ConversationState {
    return new ConversationState([...this.messages, { role: 'user', content }]);
  }

  addAssistantMessage(content: string | null, toolCalls?: ToolCall[]): ConversationState {
    return new ConversationState([...this.messages, { role: 'assistant', content, tool_calls: toolCalls }]);
  }

  addToolResult(toolCallId: string, content: string, name?: string): ConversationState {
    return new ConversationState([...this.messages, { role: 'tool', tool_call_id: toolCallId, content, name }]);
  }

  removeLastToolResults(count: number): ConversationState {
    let removed = 0;
    const kept: ChatMessage[] = [];
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'tool' && removed < count) {
        removed++;
      } else {
        kept.unshift(this.messages[i]);
      }
    }
    return new ConversationState(kept);
  }

  /** Remove the last assistant message (with tool_calls) and all tool results that follow it */
  removeLastAssistantTurn(): ConversationState {
    let idx = -1;
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'assistant' && (this.messages[i] as any).tool_calls?.length > 0) {
        idx = i;
        break;
      }
    }
    if (idx === -1) return this;
    return new ConversationState(this.messages.slice(0, idx));
  }

  addSystemMessage(content: string): ConversationState {
    // Insert right after the first system message, or at the beginning
    const idx = this.messages.findIndex(m => m.role === 'system');
    if (idx >= 0) {
      const copy = [...this.messages];
      copy.splice(idx + 1, 0, { role: 'system', content });
      return new ConversationState(copy);
    }
    return new ConversationState([{ role: 'system', content }, ...this.messages]);
  }

  getAllMessages(): ReadonlyArray<ChatMessage> {
    return this.messages;
  }

  private truncateLongResults(messages: ChatMessage[]): ChatMessage[] {
    return messages.map(msg => {
      if (msg.role === 'tool' && msg.content && msg.content.length > MAX_TOOL_RESULT_LENGTH) {
        const truncated = msg.content.slice(0, MAX_TOOL_RESULT_LENGTH) +
          `\n... [truncated ${msg.content.length - MAX_TOOL_RESULT_LENGTH} more chars]`;
        return { ...msg, content: truncated };
      }
      return msg;
    });
  }

  trimToContextWindow(maxTokens: number): ConversationState {
    // 1. Truncate long tool results
    let messages = this.truncateLongResults([...this.messages]);

    // 2. Sliding window: keep system + last N exchanges
    const systemMsgs = messages.filter(m => m.role === 'system');
    const nonSystem = messages.filter(m => m.role !== 'system');

    // An "exchange" = [user] + [assistant + tool_calls + tool results]
    // We estimate by counting user messages
    const userCount = nonSystem.filter(m => m.role === 'user').length;
    if (userCount > MAX_EXCHANGES) {
      const toDrop = userCount - MAX_EXCHANGES;
      let dropped = 0;
      const kept: ChatMessage[] = [];
      for (const msg of nonSystem) {
        if (msg.role === 'user' && dropped < toDrop) {
          dropped++;
          continue;
        }
        kept.push(msg);
      }
      messages = [...systemMsgs, ...kept];
      logger.warn({ dropped: toDrop, remaining: userCount - toDrop }, 'Sliding window trimmed');
    }

    // 3. Token budget trim (only if still over limit)
    const safeMax = Math.floor(maxTokens * CONTEXT_USAGE_TARGET);
    const currentTokens = estimateTotalTokens(messages);
    if (currentTokens <= safeMax) return new ConversationState(messages);

    const otherMsgs = messages.filter(m => m.role !== 'system');
    let tokens = estimateTotalTokens(systemMsgs);
    const kept: ChatMessage[] = [];

    for (let i = otherMsgs.length - 1; i >= 0; i--) {
      const msgTokens = estimateMessageTokens(otherMsgs[i]);
      if (tokens + msgTokens <= safeMax) {
        tokens += msgTokens;
        kept.unshift(otherMsgs[i]);
      }
    }

    const dropped = otherMsgs.length - kept.length;
    if (dropped > 0) {
      logger.warn({ dropped, remaining: kept.length, tokens }, 'Token budget trim');
    }

    return new ConversationState([...systemMsgs, ...kept]);
  }
}

async function withRetryAndTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  maxRetries = 3,
  timeoutMs = 120000,
  baseDelay = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await fn(controller.signal);
      clearTimeout(timeoutId);
      return result;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;

      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ attempt, message }, 'Request attempt failed');

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  const finalMessage = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`All ${maxRetries} attempts failed. Last error: ${finalMessage}`);
}

const FIXED_PRESETS: Record<string, ModelPreset> = {
  '1': { provider: 'openrouter', primary: 'openrouter/free', fallbacks: [] },
  '2': { provider: 'openrouter', primary: 'qwen/qwen3-next-80b-a3b-instruct:free', fallbacks: ['openrouter/free'] },
  '3': { provider: 'openrouter', primary: 'nvidia/nemotron-3-super-120b-a12b:free', fallbacks: ['openrouter/free'], contextWindow: 1_048_576 },
  '4': { provider: 'openrouter', primary: 'openai/gpt-oss-120b:free', fallbacks: ['openrouter/free'] },
  '5': { provider: 'openrouter', primary: 'nvidia/nemotron-3-ultra-550b-a55b:free', fallbacks: ['openrouter/free'], contextWindow: 1_048_576 },
};

const PRESETS_FILE = path.join(__dirname, '..', 'presets.json');

const SYSTEM_PROMPT = `You are a coding assistant that completes tasks step by step using tools.

Rules:
- Focus strictly on the user's request. Do NOT explore random directories or files.
- Read only the files the user asks about. If you need more context, read the most important files first.
- After writing files, ALWAYS run tests/commands to verify they work.
- If a test fails, fix the source code and re-run until it passes.
- Use run_command to execute shell commands.
- Keep tool calls to a minimum. Plan before you act.
- If a tool returns an error (e.g. access denied), tell the user and stop — do NOT retry with different paths.
- When done, summarize what you did and the results.

Clarifying questions:
- Only ask if the request is truly ambiguous (e.g. "delete something" without specifying what).
- If you understand 80%+ of the request, make reasonable assumptions and proceed. For example, if asked to "copy text files in a folder", just find .txt files and copy them — don't ask about naming convention or location.
- Prefer taking small actions first and adjust based on feedback, rather than asking multiple questions upfront.`;

const CONVERSATION_FILE = path.join(__dirname, '..', 'conversation.json');

interface SavedSession {
  messages: ChatMessage[];
  modelPreset: {
    provider: string;
    primary: string;
    fallbacks: string[];
    contextWindow?: number;
  } | null;
}

async function saveConversation(messages: ReadonlyArray<ChatMessage>, modelPreset?: ModelPreset): Promise<void> {
  try {
    const session: SavedSession = { messages: messages as ChatMessage[], modelPreset: modelPreset ?? null };
    await fs.writeFile(CONVERSATION_FILE, JSON.stringify(session, null, 2), 'utf-8');
  } catch (err) {
    logger.error({ err }, 'Failed to save conversation');
  }
}

async function loadConversation(): Promise<SavedSession | null> {
  try {
    const data = await fs.readFile(CONVERSATION_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    // Support both legacy (array) and new (object with messages) formats
    if (Array.isArray(parsed)) {
      return { messages: parsed as ChatMessage[], modelPreset: null };
    }
    return parsed as SavedSession;
  } catch (err: any) {
    if (err?.code !== 'ENOENT') {
      logger.warn({ err }, 'conversation.json corrupted, starting fresh');
    }
    return null;
  }
}

async function clearConversation(): Promise<void> {
  try {
    await fs.unlink(CONVERSATION_FILE);
  } catch { }
}

async function loadUserPresets(): Promise<Record<string, ModelPreset>> {
  try {
    const data = await fs.readFile(PRESETS_FILE, 'utf-8');
    const parsed = JSON.parse(data) as Record<string, Partial<ModelPreset>>;
    const normalized: Record<string, ModelPreset> = {};

    for (const key of Object.keys(parsed)) {
      const item = parsed[key] || {};
      normalized[key] = {
        provider: String(item.provider ?? 'openrouter'),
        primary: String(item.primary ?? ''),
        fallbacks: Array.isArray(item.fallbacks) ? item.fallbacks.map(String) : [],
      };
    }

    return normalized;
  } catch (err: any) {
    if (err?.code !== 'ENOENT') {
      logger.warn('presets.json was corrupted or invalid. Starting fresh.');
    }
    return {};
  }
}

async function saveUserPresets(presets: Record<string, ModelPreset>): Promise<void> {
  try {
    await fs.writeFile(PRESETS_FILE, JSON.stringify(presets, null, 2), 'utf-8');
  } catch (err) {
    logger.error({ err }, 'Failed to save presets');
  }
}

function getAllPresets(userPresets: Record<string, ModelPreset>): Record<string, ModelPreset> {
  return { ...FIXED_PRESETS, ...userPresets };
}

function formatPresetLine(key: string, preset: ModelPreset): string {
  const prov = PROVIDERS[preset.provider]?.name ?? preset.provider;
  const fb = preset.fallbacks.length ? ` → ${preset.fallbacks.join(', ')}` : '';
  return `  /model ${key}  [${prov}] ${preset.primary}${fb}`;
}

function showModels(userPresets: Record<string, ModelPreset>, activeModelConfig: ModelPreset) {
  const allPresets = getAllPresets(userPresets);
  const fixedKeys = Object.keys(FIXED_PRESETS);
  const userKeys = Object.keys(userPresets).sort((a, b) => Number(a) - Number(b));

  console.log('\n── Fixed Presets ────────────────────────');
  fixedKeys.forEach(k => console.log(formatPresetLine(k, allPresets[k])));

  if (userKeys.length) {
    console.log('── User Presets ──────────────────────────');
    userKeys.forEach(k => console.log(formatPresetLine(k, allPresets[k])));
  }

  console.log('──────────────────────────────────────────');
  const prov = PROVIDERS[activeModelConfig.provider]?.name ?? activeModelConfig.provider;
  console.log(`  ✅ Active: [${prov}] ${activeModelConfig.primary}${activeModelConfig.fallbacks.length ? ` → ${activeModelConfig.fallbacks.join(', ')}` : ''}`);
}

async function detectLocalModel(providerId: string): Promise<string> {
  const info = PROVIDERS[providerId];
  if (!info) throw new Error(`Unknown local provider: "${providerId}"`);

  try {
    const tempClient = new OpenAI({ baseURL: info.baseURL, apiKey: 'local' });
    const models = await tempClient.models.list();
    if (!models.data || models.data.length === 0) {
      throw new Error(`No models found on ${info.name}`);
    }
    const modelId = models.data[0].id;
    if (!modelId) throw new Error(`Could not parse model list response`);
    console.log(`  ✅ Auto-detected model: ${modelId}`);
    return String(modelId);
  } catch (err: any) {
    throw new Error(
      `Cannot connect to ${info.name} at ${info.baseURL}. Is the server running? ${err.message}`
    );
  }
}

class CodingAgent {
  private toolHistory: string[] = [];
  private readonly MAX_DEPTH = 20;
  private conversation: ConversationState;

  constructor(
    private readonly client: OpenAI,
    private readonly tools: OpenAITool[],
    private readonly modelConfig: ModelPreset,
    systemPrompt: string,
    savedMessages?: ReadonlyArray<ChatMessage>,
  ) {
    if (savedMessages && savedMessages.length > 0) {
      this.conversation = ConversationState.fromMessages(savedMessages);
    } else {
      this.conversation = ConversationState.withSystemPrompt(systemPrompt);
    }
  }

  getConversationMessages(): ReadonlyArray<ChatMessage> {
    return this.conversation.getAllMessages();
  }

  private detectStuckState(): string | null {
    if (this.toolHistory.length < 5) return null;

    const lastCall = this.toolHistory[this.toolHistory.length - 1];
    const repeatedCount = this.toolHistory.filter(c => c === lastCall).length;
    if (repeatedCount >= 3) return `"${lastCall}" repeated 3+ times`;

    const last5 = this.toolHistory.slice(-5);
    if (last5.every(c => c === last5[0])) return `"${last5[0]}" called 5 times consecutively`;

    return null;
  }

  private buildModelList(): string[] {
    return Array.from(new Set([this.modelConfig.primary, ...this.modelConfig.fallbacks].filter(Boolean)));
  }

  private buildRequest(messages: ReadonlyArray<ChatMessage>): OpenAI.ChatCompletionCreateParams {
    const base: OpenAI.ChatCompletionCreateParams = {
      model: this.modelConfig.primary,
      messages: messages as OpenAI.ChatCompletionMessageParam[],
      tools: this.tools as OpenAI.ChatCompletionTool[],
      tool_choice: 'auto',
    };
    if (this.modelConfig.provider === 'openrouter') {
      (base as OpenRouterCreateParams).extra_body = {
        models: this.buildModelList(),
      };
    }
    return base;
  }

  async execute(userInput: string): Promise<AgentResult> {
    this.toolHistory = [];
    this.conversation = this.conversation.addUserMessage(userInput);

    let depth = 0;
    let usedModel = this.modelConfig.primary;
    let totalToolCalls = 0;

    while (depth < this.MAX_DEPTH) {
      depth++;

      try {
        const contextWindow = this.modelConfig.contextWindow ?? DEFAULT_CONTEXT_WINDOW;
        this.conversation = this.conversation.trimToContextWindow(contextWindow);
        const request = this.buildRequest(this.conversation.getAllMessages());

        const provInfo = PROVIDERS[this.modelConfig.provider];
        const isLocal = provInfo && !provInfo.apiKeyEnv;
        const timeoutMs = isLocal ? (Number(process.env.LOCAL_TIMEOUT) || 300000) : 120000;

        const stream = await withRetryAndTimeout(
          signal => this.client.chat.completions.create(
            { ...request, stream: true },
            { signal }
          ),
          3,
          timeoutMs
        );

        const { content, toolCalls, model } = await processStreamResponse(stream);
        usedModel = model || this.modelConfig.primary;
        console.log();
        console.log(`  [Model: ${usedModel}]`);

        if (!isToolCallArray(toolCalls) || toolCalls.length === 0) {
          this.conversation = this.conversation.addAssistantMessage(content || null);
          return {
            model: usedModel,
            content: null,
            logs: [],
            toolCallsCount: totalToolCalls,
          };
        }

        this.conversation = this.conversation.addAssistantMessage(content || null, toolCalls);
        console.log();

        const seenCalls = new Set<string>();

        for (const toolCall of toolCalls) {
          const functionName = toolCall.function.name;

          const knownToolNames = this.tools.map(t => t.function.name);
          if (!knownToolNames.includes(functionName)) {
            const errorMsg = `Unknown tool "${functionName}". Available: ${knownToolNames.join(', ')}`;
            console.log(`  ⚠️ ${errorMsg}`);
            this.conversation = this.conversation.addToolResult(toolCall.id, `Error: ${errorMsg}`, functionName);
            continue;
          }

          let parsedArgs: unknown;
          let callKey: string;
          try {
            parsedArgs = validateToolInput(functionName, JSON.parse(toolCall.function.arguments));
            callKey = `${functionName}(${JSON.stringify(parsedArgs)})`;
          } catch (err: any) {
            const errorMsg = `Invalid arguments for ${functionName}: ${err?.message || String(err)}`;
            console.log(`  ⚠️ ${errorMsg}`);
            this.conversation = this.conversation.addToolResult(toolCall.id, `Error: ${errorMsg}`, functionName);
            continue;
          }

          if (seenCalls.has(callKey)) {
            console.log(`  ⚠️ Duplicate skipped: ${callKey}`);
            this.conversation = this.conversation.addToolResult(toolCall.id, `Warning: Duplicate skipped. Already called: ${callKey}`, functionName);
            continue;
          }
          seenCalls.add(callKey);

          const functionArgs = parsedArgs as Record<string, unknown>;
          this.toolHistory.push(callKey);
          console.log(`  🔧 ${callKey}`);
          totalToolCalls++;

          const stuckError = this.detectStuckState();
          if (stuckError) {
            console.log(`  ⛔ Stuck detected: ${stuckError}`);
            this.conversation = this.conversation
              .removeLastAssistantTurn()
              .addSystemMessage(
                `[RECOVERY] You were stuck: ${stuckError}. The last assistant turn has been undone. ` +
                `Think carefully about what went wrong and try a COMPLETELY DIFFERENT approach. ` +
                `Do NOT repeat the same tool call with identical arguments.`
              );
            break;
          }

          try {
            const rawResult = await executeTool(functionName, functionArgs);
            const validatedResult = validateToolOutput(functionName, rawResult);
            const content =
              typeof validatedResult === 'string'
                ? validatedResult
                : validatedResult === undefined
                  ? ''
                  : JSON.stringify(validatedResult);

            this.conversation = this.conversation.addToolResult(toolCall.id, content, functionName);
          } catch (err: any) {
            const msg = err?.message || 'Unknown tool error';
            console.log(`  ❌ Tool Error: ${msg}`);
            this.conversation = this.conversation.addToolResult(toolCall.id, `Error executing tool: ${msg}`, functionName);
          }
        }
      } catch (err: any) {
        const msg = err?.message || 'Unknown API error';
        console.log(`  🚨 API Error: ${msg}`);
        logger.error({ error: err, depth }, 'Agent execution failed');
        return {
          model: usedModel,
          content: `An error occurred while communicating with the AI model: ${msg}`,
          logs: [],
          toolCallsCount: totalToolCalls,
        };
      }
    }

    return {
      model: usedModel,
      content: `I have reached the maximum number of steps (${this.MAX_DEPTH}).`,
      logs: [],
      toolCallsCount: totalToolCalls,
    };
  }
}

async function startChat() {
  // Parse --safe flag
  if (process.argv.includes('--safe')) {
    setSafeMode(true);
  }

  // Check all provider API keys on startup
  const missingKeys: string[] = [];
  const localProviders: string[] = [];
  for (const [id, info] of Object.entries(PROVIDERS)) {
    if (!info.apiKeyEnv) {
      localProviders.push(info.name);
      continue;
    }
    const val = process.env[info.apiKeyEnv];
    if (!val || val.trim() === '' || val === 'YOUR_API_KEY_HERE') {
      missingKeys.push(`${info.name} (${info.apiKeyEnv})`);
    }
  }
  const allCloudMissing = missingKeys.length === Object.keys(PROVIDERS).length - localProviders.length;
  if (allCloudMissing && localProviders.length === 0) {
    console.error('❌ ERROR: No API keys found and no local providers available. Add at least one to .env:');
    Object.values(PROVIDERS).filter(p => p.apiKeyEnv).forEach(p => console.error(`   ${p.apiKeyEnv}=your-key`));
    console.error('   Get keys: OpenRouter=openrouter.ai/keys, Google=aistudio.google.com/apikey, Groq=console.groq.com/keys, DeepSeek=platform.deepseek.com, Mistral=console.mistral.ai');
    process.exit(1);
  }
  if (allCloudMissing && localProviders.length > 0) {
    console.log('ℹ️  No cloud API keys found. Local-only mode.');
    console.log(`   Available local providers: ${localProviders.join(', ')}`);
    console.log('   Run the local server first, then use /add to configure:');
    console.log('     /add 6 ollama:auto        (Ollama)');
    console.log('     /add 7 lmstudio:auto      (LM Studio)');
    console.log('     /add 8 llamacpp:auto      (Llama.cpp)');
  }

  function createClient(providerId: string): OpenAI {
    const info = PROVIDERS[providerId] ?? PROVIDERS.openrouter;
    const apiKey = info.apiKeyEnv ? (process.env[info.apiKeyEnv] || '') : 'local';
    const headers: Record<string, string> = {};
    if (providerId === 'openrouter') {
      headers['HTTP-Referer'] = 'https://github.com';
      headers['X-Title'] = 'coding-agent-pro';
    }
    return new OpenAI({ baseURL: info.baseURL, apiKey, defaultHeaders: headers });
  }

  let client = createClient('openrouter');
  let userPresets = await loadUserPresets();
  let activeModelConfig: ModelPreset = { ...FIXED_PRESETS['1'] };
  let lastActualModel = '';

  const allowedDir = path.resolve(process.env.ALLOWED_DIR || './workspace');

  console.log('═══════════════════════════════════════════════');
  console.log('  Coding Agent Free');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Workspace: ${allowedDir}`);
  if (isSafeModeEnabled()) {
    console.log('  🛡️  Safe mode: ON (whitelist-only shell commands)');
  }
  console.log('  Commands:');
  console.log('    /model <n>   Switch to preset n');
  console.log('    /save <n>    Save last used model as preset n');
  console.log('    /add <n> <m> Manually add model m as preset n (provider:model)');
  console.log('    /remove <n>  Remove a user preset');
  console.log('    /allow <p>   Allow model to access path outside workspace');
  console.log('    /safe        Toggle safe mode (whitelist-only shell commands)');
  console.log('    /reset       Clear conversation history (start fresh)');
  console.log('    /list-providers  Show available providers');
  console.log('    /models      Show all presets');
  console.log('    /exit        Quit');
  console.log('═══════════════════════════════════════════════');
  console.log(`  💡 Tip: Set ALLOWED_DIR=. in .env to access the project root.`);
  console.log('');

  showModels(userPresets, activeModelConfig);
  console.log('');

  // Session restore prompt
  let savedMessages: ChatMessage[] | null = null;
  const savedSession = await loadConversation();
  if (savedSession && savedSession.messages.length > 0) {
    const resumeRl = readline.createInterface({ input: stdin, output: stdout });
    const answer = (await resumeRl.question('A previous conversation was found. Resume it? (y/n): ')).trim().toLowerCase();
    resumeRl.close();
    if (answer === 'y' || answer === 'yes') {
      savedMessages = savedSession.messages;
      if (savedSession.modelPreset) {
        // Restore the active model from the saved session
        const savedPreset: ModelPreset = { ...savedSession.modelPreset, fallbacks: savedSession.modelPreset.fallbacks ?? [] };
        activeModelConfig = savedPreset;
        client = createClient(savedPreset.provider);
        const prov = PROVIDERS[savedPreset.provider]?.name ?? savedPreset.provider;
        console.log(`✅ Conversation restored with [${prov}] ${savedPreset.primary}\n`);
      } else {
        console.log('✅ Conversation restored.\n');
      }
    } else {
      await clearConversation();
    }
  }

  const rl = readline.createInterface({ input: stdin, output: stdout, prompt: 'You: ' });
  const typedTools = tools as OpenAITool[];
  const systemPrompt = SYSTEM_PROMPT;

  let agent = new CodingAgent(client, typedTools, activeModelConfig, systemPrompt, savedMessages ?? undefined);

  rl.prompt();

  for await (const line of rl) {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      continue;
    }

    if (input.toLowerCase() === '/exit') {
      console.log('Exiting...');
      rl.close();
      break;
    }

    if (input.toLowerCase() === '/models') {
      showModels(userPresets, activeModelConfig);
      rl.prompt();
      continue;
    }

    if (input.toLowerCase() === '/list-providers') {
      console.log('\n── Available Providers ────────────────────');
      for (const [id, info] of Object.entries(PROVIDERS)) {
        if (info.apiKeyEnv) {
          const key = process.env[info.apiKeyEnv] ? '🔑' : '❌';
          console.log(`  ${key} ${info.name.padEnd(20)} ${info.apiKeyEnv}`);
        } else {
          console.log(`  ✅ ${info.name.padEnd(20)} (local, no key needed)`);
        }
      }
      console.log('──────────────────────────────────────────');
      console.log('  (❌ = add key to .env; ✅ = ready)\n');
      rl.prompt();
      continue;
    }

    const modelMatch = input.match(/^\/model\s+(\d+)$/i);
    if (modelMatch) {
      const num = modelMatch[1];
      const allPresets = getAllPresets(userPresets);
      if (allPresets[num]) {
        activeModelConfig = { ...allPresets[num] };
        client = createClient(activeModelConfig.provider);
        const prov = PROVIDERS[activeModelConfig.provider]?.name ?? activeModelConfig.provider;
        const prevMessages = agent.getConversationMessages();
        agent = new CodingAgent(client, typedTools, activeModelConfig, systemPrompt, prevMessages as ChatMessage[]);
        console.log(`\n✅ Switched to preset ${num}: [${prov}] ${activeModelConfig.primary}\n`);
      } else {
        console.log(`\n❌ Preset ${num} not found.\n`);
      }
      rl.prompt();
      continue;
    }

    const saveMatch = input.match(/^\/save\s+(\d+)$/i);
    if (saveMatch) {
      const num = saveMatch[1];
      if (FIXED_PRESETS[num]) {
        console.log(`\n❌ Cannot overwrite fixed preset ${num}.\n`);
      } else if (!lastActualModel) {
        console.log(`\n❌ No model to save. Send a message first.\n`);
      } else {
        const prov = PROVIDERS[activeModelConfig.provider]?.name ?? activeModelConfig.provider;
        userPresets[num] = { provider: activeModelConfig.provider, primary: lastActualModel, fallbacks: ['openrouter/free'] };
        await saveUserPresets(userPresets);
        console.log(`\n✅ Saved as preset ${num}: [${prov}] ${lastActualModel}\n`);
      }
      rl.prompt();
      continue;
    }

    const addMatch = input.match(/^\/add\s+(\d+)\s+(.+)$/i);
    if (addMatch) {
      const num = addMatch[1];
      const raw = addMatch[2].trim();
      if (FIXED_PRESETS[num]) {
        console.log(`\n❌ Cannot overwrite fixed preset ${num}.\n`);
      } else {
        // Format: "provider:model" or just "model" (defaults to current provider)
        const colon = raw.indexOf(':');
        let providerId: string;
        let modelId: string;
        if (colon > 0 && PROVIDERS[raw.slice(0, colon)]) {
          providerId = raw.slice(0, colon);
          modelId = raw.slice(colon + 1);
        } else {
          providerId = activeModelConfig.provider;
          modelId = raw;
        }

        // Auto-detect local model if modelId is 'auto'
        const provInfo = PROVIDERS[providerId];
        if (provInfo && !provInfo.apiKeyEnv && modelId.toLowerCase() === 'auto') {
          try {
            modelId = await detectLocalModel(providerId);
          } catch (err: any) {
            console.log(`\n❌ ${err.message}\n`);
            rl.prompt();
            continue;
          }
        }

        const prov = PROVIDERS[providerId]?.name ?? providerId;
        userPresets[num] = { provider: providerId, primary: modelId, fallbacks: ['openrouter/free'] };
        await saveUserPresets(userPresets);
        console.log(`\n✅ Added preset ${num}: [${prov}] ${modelId}\n`);
      }
      rl.prompt();
      continue;
    }

    const removeMatch = input.match(/^\/remove\s+(\d+)$/i);
    if (removeMatch) {
      const num = removeMatch[1];
      if (FIXED_PRESETS[num]) {
        console.log(`\n❌ Cannot remove fixed preset ${num}.\n`);
      } else if (userPresets[num]) {
        delete userPresets[num];
        await saveUserPresets(userPresets);
        console.log(`\n✅ Removed preset ${num}.\n`);
      } else {
        console.log(`\n❌ Preset ${num} not found.\n`);
      }
      rl.prompt();
      continue;
    }

    const allowMatch = input.match(/^\/allow\s+(.+)$/i);
    if (allowMatch) {
      const p = allowMatch[1].trim().replace(/^"(.*)"$/, '$1');
      allowExtraPath(p);
      console.log(`\n✅ Allowed: ${path.resolve(p)}\n`);
      rl.prompt();
      continue;
    }

    if (input.toLowerCase() === '/safe') {
      const now = !isSafeModeEnabled();
      setSafeMode(now);
      console.log(`\n🛡️  Safe mode ${now ? 'ENABLED' : 'DISABLED'} — only whitelisted shell commands are allowed.\n`);
      rl.prompt();
      continue;
    }

    if (input.toLowerCase() === '/reset') {
      agent = new CodingAgent(client, typedTools, activeModelConfig, systemPrompt);
      await clearConversation();
      console.log('\n🧹 Conversation cleared. Starting fresh.\n');
      rl.prompt();
      continue;
    }

    console.log('\n⏳ Thinking...\n');

    try {
      const result = await agent.execute(input);
      lastActualModel = result.model;

      // Save session after each turn (model + messages)
      const conversationMessages = agent.getConversationMessages();
      await saveConversation(conversationMessages as ChatMessage[], activeModelConfig);

      // Show estimated token usage
      const tokens = estimateTotalTokens(conversationMessages);
      const maxCtx = activeModelConfig.contextWindow ?? DEFAULT_CONTEXT_WINDOW;
      console.log(`  📊 ~${tokens}/${(maxCtx / 1000).toFixed(0)}K tokens`);

      if (result.content) {
        console.log(`\nAgent: ${result.content}\n`);
      }

      logger.info({ model: result.model, toolCalls: result.toolCallsCount }, 'Agent completed');
    } catch (err: any) {
      logger.error({ error: err }, 'Unexpected system error');
      console.error(`\n🚨 Unexpected System Error: ${err.message}\n`);
    }

    rl.prompt();
  }
}

startChat();