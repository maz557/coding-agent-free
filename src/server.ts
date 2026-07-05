import express, { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import { z } from 'zod';
import { tools, executeTool } from './tools/fileManager';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

// --- Provider Config ---
interface ProviderInfo { name: string; baseURL: string; apiKeyEnv: string; }
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

function createClient(providerId: string): OpenAI {
  const info = PROVIDERS[providerId] ?? PROVIDERS.openrouter;
  const apiKey = info.apiKeyEnv ? (process.env[info.apiKeyEnv] || '') : 'local';
  const headers: Record<string, string> = {};
  if (providerId === 'openrouter') {
    headers['HTTP-Referer'] = 'https://github.com';
    headers['X-Title'] = 'coding-agent-web';
  }
  return new OpenAI({ baseURL: info.baseURL, apiKey, defaultHeaders: headers });
}

// --- Model Presets ---
interface ModelPreset { provider: string; primary: string; fallbacks: string[]; contextWindow?: number; }
const FIXED_PRESETS: Record<string, ModelPreset> = {
  '1': { provider: 'openrouter', primary: 'openrouter/free', fallbacks: [] },
  '2': { provider: 'openrouter', primary: 'qwen/qwen3-next-80b-a3b-instruct:free', fallbacks: ['openrouter/free'] },
  '3': { provider: 'openrouter', primary: 'nvidia/nemotron-3-super-120b-a12b:free', fallbacks: ['openrouter/free'], contextWindow: 1_048_576 },
  '4': { provider: 'openrouter', primary: 'openai/gpt-oss-120b:free', fallbacks: ['openrouter/free'] },
  '5': { provider: 'openrouter', primary: 'nvidia/nemotron-3-ultra-550b-a55b:free', fallbacks: ['openrouter/free'], contextWindow: 1_048_576 },
};

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
- If you understand 80%+ of the request, make reasonable assumptions and proceed.
- Prefer taking small actions first and adjust based on feedback, rather than asking multiple questions upfront.`;

// --- Types ---
type ToolCallFn = { name: string; arguments: string; };
type ToolCall = { id: string; type: 'function'; function: ToolCallFn; };
type ChatMessage =
  | { role: 'system'; content: string; }
  | { role: 'user'; content: string; }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[]; }
  | { role: 'tool'; tool_call_id: string; content: string; };

// --- Context ---
const DEFAULT_CONTEXT_WINDOW = 128_000;
const MAX_DEPTH = 20;

// --- Session ---
interface SessionData {
  client: OpenAI;
  modelConfig: ModelPreset;
  messages: ChatMessage[];
}

const sessions = new Map<string, SessionData>();

function getOrCreateSession(sessionId: string): SessionData {
  let session = sessions.get(sessionId);
  if (!session) {
    const modelConfig = { ...FIXED_PRESETS['1'] };
    session = {
      client: createClient(modelConfig.provider),
      modelConfig,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }],
    };
    sessions.set(sessionId, session);
  }
  return session;
}

// --- Agent Loop ---
interface AgentCallbacks {
  onToken: (token: string) => void;
  onToolCall: (name: string, args: string) => void;
  onToolResult: (name: string, content: string) => void;
  onModel: (model: string) => void;
  onStatus: (msg: string) => void;
  onError: (msg: string) => void;
  onDone: (toolCallsCount: number) => void;
}

async function runAgent(
  session: SessionData,
  userInput: string,
  cb: AgentCallbacks,
): Promise<void> {
  session.messages.push({ role: 'user', content: userInput });

  let depth = 0;
  let totalToolCalls = 0;

  while (depth < MAX_DEPTH) {
    depth++;

    const base: OpenAI.ChatCompletionCreateParams = {
      model: session.modelConfig.primary,
      messages: session.messages as OpenAI.ChatCompletionMessageParam[],
      tools: tools as OpenAI.ChatCompletionTool[],
      tool_choice: 'auto',
    };

    if (session.modelConfig.provider === 'openrouter') {
      const models = Array.from(new Set([session.modelConfig.primary, ...session.modelConfig.fallbacks].filter(Boolean)));
      (base as any).extra_body = { models };
    }

    try {
      const provInfo = PROVIDERS[session.modelConfig.provider];
      const isLocal = provInfo && !provInfo.apiKeyEnv;
      const timeoutMs = isLocal ? (Number(process.env.LOCAL_TIMEOUT) || 300000) : 120000;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      let stream: AsyncIterable<any>;
      try {
        stream = await session.client.chat.completions.create(
          { ...base, stream: true },
          { signal: controller.signal },
        );
      } finally {
        clearTimeout(timeoutId);
      }

      let content = '';
      const toolCallAccs = new Map<number, { id: string; name: string; args: string }>();
      let usedModel = '';

      for await (const chunk of stream) {
        if (chunk.model) usedModel = chunk.model;
        const choice = chunk.choices?.[0];
        if (!choice) continue;
        const delta = choice.delta;
        if (!delta) continue;

        if (delta.content) {
          content += delta.content;
          cb.onToken(delta.content);
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCallAccs.has(idx)) {
              toolCallAccs.set(idx, { id: '', name: '', args: '' });
            }
            const acc = toolCallAccs.get(idx)!;
            if (tc.id) acc.id += tc.id;
            if (tc.function?.name) acc.name += tc.function.name;
            if (tc.function?.arguments) acc.args += tc.function.arguments;
          }
        }
      }

      const model = usedModel || session.modelConfig.primary;
      cb.onModel(model);

      const toolCalls: ToolCall[] = [];
      for (const [, acc] of toolCallAccs) {
        if (acc.name) {
          toolCalls.push({ id: acc.id, type: 'function', function: { name: acc.name, arguments: acc.args } });
        }
      }

      if (toolCalls.length === 0) {
        session.messages.push({ role: 'assistant', content: content || null });
        cb.onDone(totalToolCalls);
        return;
      }

      session.messages.push({ role: 'assistant', content: content || null, tool_calls: toolCalls });

      for (const tc of toolCalls) {
        cb.onToolCall(tc.function.name, tc.function.arguments);

        let parsedArgs: Record<string, unknown>;
        try {
          parsedArgs = JSON.parse(tc.function.arguments);
        } catch {
          const msg = `Invalid JSON in arguments for ${tc.function.name}`;
          cb.onError(msg);
          session.messages.push({ role: 'tool', tool_call_id: tc.id, content: `Error: ${msg}` });
          continue;
        }

        try {
          const result = await executeTool(tc.function.name, parsedArgs);
          const content = typeof result === 'string' ? result : JSON.stringify(result);
          cb.onToolResult(tc.function.name, content);
          session.messages.push({ role: 'tool', tool_call_id: tc.id, content });
        } catch (err: any) {
          const msg = err?.message || 'Unknown tool error';
          cb.onError(`${tc.function.name}: ${msg}`);
          session.messages.push({ role: 'tool', tool_call_id: tc.id, content: `Error: ${msg}` });
        }
        totalToolCalls++;
      }
    } catch (err: any) {
      const msg = err?.message || 'Unknown error';
      cb.onError(msg);
      cb.onDone(totalToolCalls);
      return;
    }
  }

  cb.onDone(totalToolCalls);
}

// --- Express Server ---
const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

app.use(express.static(PUBLIC_DIR));

// Session management
app.post('/api/session', (_req, res) => {
  const sessionId = uuidv4();
  getOrCreateSession(sessionId);
  res.json({ sessionId, models: Object.entries(FIXED_PRESETS).map(([k, v]) => ({
    id: k, name: `${v.provider}/${v.primary}`,
  })) });
});

// List models
app.get('/api/models', (_req, res) => {
  res.json(Object.entries(FIXED_PRESETS).map(([k, v]) => ({
    id: k, provider: PROVIDERS[v.provider]?.name || v.provider, model: v.primary,
  })));
});

// Get active model
app.get('/api/active/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const prov = PROVIDERS[session.modelConfig.provider]?.name || session.modelConfig.provider;
  res.json({ provider: prov, model: session.modelConfig.primary, fallbacks: session.modelConfig.fallbacks });
});

// Switch model
app.post('/api/model/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const { presetId, provider, model } = req.body;
  if (presetId && FIXED_PRESETS[presetId]) {
    session.modelConfig = { ...FIXED_PRESETS[presetId] };
  } else if (provider && model) {
    session.modelConfig = { provider, primary: model, fallbacks: req.body.fallbacks || [] };
  } else {
    return res.status(400).json({ error: 'Provide presetId or provider+model' });
  }
  session.client = createClient(session.modelConfig.provider);
  const prov = PROVIDERS[session.modelConfig.provider]?.name || session.modelConfig.provider;
  res.json({ provider: prov, model: session.modelConfig.primary });
});

// Reset conversation
app.post('/api/reset/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  session.messages = [{ role: 'system', content: SYSTEM_PROMPT }];
  res.json({ status: 'ok' });
});

// Chat (SSE)
app.post('/api/chat/:sessionId', async (req: Request<{ sessionId: string }>, res: Response) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  let aborted = false;
  req.on('close', () => { aborted = true; });

  try {
    await runAgent(session, message, {
      onToken: (token) => { if (!aborted) sendEvent('token', { token }); },
      onToolCall: (name, args) => { if (!aborted) sendEvent('tool_call', { name, args }); },
      onToolResult: (name, content) => { if (!aborted) sendEvent('tool_result', { name, content }); },
      onModel: (model) => { if (!aborted) sendEvent('model', { model }); },
      onStatus: (msg) => { if (!aborted) sendEvent('status', { text: msg }); },
      onError: (msg) => { if (!aborted) sendEvent('error', { message: msg }); },
      onDone: (toolCallsCount) => {
        if (!aborted) sendEvent('done', { toolCallsCount });
        res.end();
      },
    });
  } catch (err: any) {
    if (!aborted) {
      sendEvent('error', { message: err?.message || 'Unexpected error' });
      sendEvent('done', { toolCallsCount: 0 });
      res.end();
    }
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Web interface: http://localhost:${PORT}`);
  console.log(`   Workspace: ${path.resolve(process.env.ALLOWED_DIR || './workspace')}`);
});
