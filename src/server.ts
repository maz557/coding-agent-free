import express, { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import { tools, executeTool, setSafeMode, isSafeModeEnabled, allowExtraPath } from './tools/fileManager';
import { PROVIDERS, FIXED_PRESETS, SYSTEM_PROMPT } from './config/models';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const SUGGESTED_MODELS: Record<string, string> = {
  openrouter: 'openrouter/free',
  google: 'gemini-2.0-flash-exp',
  groq: 'llama3-70b-8192',
  deepseek: 'deepseek-chat',
  mistral: 'mistral-large-latest',
  ollama: '',
  lmstudio: '',
  llamacpp: '',
};

const MAX_DEPTH = 20;

interface SessionData {
  client: OpenAI;
  modelConfig: { provider: string; primary: string; fallbacks: string[]; contextWindow?: number };
  messages: any[];
}

const sessions = new Map<string, SessionData>();

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

// ─── Express Server ───
const PRESETS_FILE = path.join(__dirname, '..', 'presets.json');

function loadUserPresets(): Record<string, { provider: string; primary: string; fallbacks: string[]; contextWindow?: number }> {
  try {
    const data = fs.readFileSync(PRESETS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    const normalized: Record<string, any> = {};
    for (const key of Object.keys(parsed)) {
      const item = parsed[key] || {};
      normalized[key] = {
        provider: String(item.provider ?? 'openrouter'),
        primary: String(item.primary ?? ''),
        fallbacks: Array.isArray(item.fallbacks) ? item.fallbacks.map(String) : [],
      };
    }
    return normalized;
  } catch {
    return {};
  }
}

function getAllPresets(): Record<string, any> {
  return { ...FIXED_PRESETS, ...loadUserPresets() };
}

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

app.use(express.static(PUBLIC_DIR));

app.post('/api/session', (_req, res) => {
  const id = uuidv4();
  const modelConfig = { ...FIXED_PRESETS['1'] };
  sessions.set(id, {
    client: createClient(modelConfig.provider),
    modelConfig,
    messages: [{ role: 'system', content: SYSTEM_PROMPT }],
  });
  res.json({
    sessionId: id,
    models: Object.entries(getAllPresets()).map(([k, v]) => ({ id: k, name: `${PROVIDERS[v.provider]?.name || v.provider}/${v.primary}` })),
  });
});

app.get('/api/models', (_req, res) => {
  const presets = Object.entries(getAllPresets()).map(([k, v]) => ({
    type: 'preset' as const, id: k,
    provider: PROVIDERS[v.provider]?.name || v.provider,
    model: v.primary,
  }));
  const providers = Object.entries(PROVIDERS).map(([k, v]) => ({
    type: 'provider' as const, id: k,
    label: v.name,
    defaultModel: SUGGESTED_MODELS[k] || '',
  }));
  res.json([...presets, ...providers]);
});

app.get('/api/active/:sessionId', (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  const prov = PROVIDERS[s.modelConfig.provider]?.name || s.modelConfig.provider;
  res.json({ provider: prov, model: s.modelConfig.primary, fallbacks: s.modelConfig.fallbacks, safeMode: isSafeModeEnabled() });
});

app.post('/api/model/:sessionId', (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  const { presetId, provider, model } = req.body;
  const allPresets = getAllPresets();
  if (presetId && allPresets[presetId]) {
    s.modelConfig = { ...allPresets[presetId] };
  } else if (provider && model) {
    s.modelConfig = { provider, primary: model, fallbacks: req.body.fallbacks || [] };
  } else {
    return res.status(400).json({ error: 'Provide presetId or provider+model' });
  }
  s.client = createClient(s.modelConfig.provider);
  res.json({ provider: PROVIDERS[s.modelConfig.provider]?.name || s.modelConfig.provider, model: s.modelConfig.primary });
});

app.post('/api/reset/:sessionId', (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  s.messages = [{ role: 'system', content: SYSTEM_PROMPT }];
  res.json({ status: 'ok' });
});

app.get('/api/safe-mode', (_req, res) => {
  res.json({ enabled: isSafeModeEnabled() });
});

app.post('/api/safe-mode', (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be boolean' });
  setSafeMode(enabled);
  res.json({ enabled: isSafeModeEnabled() });
});

app.post('/api/allow', (req, res) => {
  const { path: allowPath } = req.body;
  if (!allowPath || typeof allowPath !== 'string') return res.status(400).json({ error: 'path is required' });
  allowExtraPath(allowPath);
  res.json({ allowedPath: allowPath });
});

app.post('/api/chat/:sessionId', async (req: Request<{ sessionId: string }>, res: Response) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Session not found' });

  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.flushHeaders();

  const send = (event: string, data: any) => {
    if (res.destroyed) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const provInfo = PROVIDERS[s.modelConfig.provider];
  const isLocal = provInfo && !provInfo.apiKeyEnv;
  const timeoutMs = isLocal ? (Number(process.env.LOCAL_TIMEOUT) || 300000) : 120000;

  s.messages.push({ role: 'user', content: message });

  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    const base: any = {
      model: s.modelConfig.primary,
      messages: s.messages,
      tools: tools,
      tool_choice: 'auto',
      stream: true,
    };

    if (s.modelConfig.provider === 'openrouter') {
      const models = [s.modelConfig.primary, ...s.modelConfig.fallbacks].filter(Boolean);
      base.extra_body = { models: [...new Set(models)] };
    }

    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), timeoutMs);

    try {
      const stream: any = await s.client.chat.completions.create(base, { signal: ac.signal });

      let content = '';
      const tcs = new Map<number, any>();
      let usedModel = '';

      for await (const chunk of stream) {
        if (res.destroyed) break;
        if (chunk.model) usedModel = chunk.model;
        const delta = chunk.choices?.[0]?.delta;
        if (!delta) continue;
        if (delta.content) { content += delta.content; send('token', { token: delta.content }); }
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!tcs.has(idx)) tcs.set(idx, { id: '', name: '', args: '' });
            const a = tcs.get(idx);
            if (tc.id) a.id += tc.id;
            if (tc.function?.name) a.name += tc.function.name;
            if (tc.function?.arguments) a.args += tc.function.arguments;
          }
        }
      }

      if (res.destroyed) break;

      const model = usedModel || s.modelConfig.primary;
      send('model', { model: `${PROVIDERS[s.modelConfig.provider]?.name || s.modelConfig.provider} — ${model}` });
      s.messages.push({ role: 'assistant', content: content || null });

      if (tcs.size === 0) {
        send('done', { toolCallsCount: 0 });
        res.end();
        return;
      }

      const calls = [...tcs.values()].filter((x: any) => x.name);
      (s.messages[s.messages.length - 1] as any).tool_calls = calls.map((tc: any) => ({
        id: tc.id, type: 'function', function: { name: tc.name, arguments: tc.args },
      }));

      for (const tc of calls) {
        if (res.destroyed) break;
        send('tool_call', { name: tc.name, args: tc.args });
        try {
          const parsed = JSON.parse(tc.args);
          const result = await executeTool(tc.name, parsed);
          const text = typeof result === 'string' ? result : JSON.stringify(result);
          send('tool_result', { name: tc.name, content: text.slice(0, 300) });
          s.messages.push({ role: 'tool', tool_call_id: tc.id, content: text, name: tc.name });
        } catch (err: any) {
          send('error', { message: `${tc.name}: ${err.message}` });
          s.messages.push({ role: 'tool', tool_call_id: tc.id, content: `Error: ${err.message}`, name: tc.name });
        }
      }
    } catch (err: any) {
      send('error', { message: err?.message || 'API error' });
    } finally {
      clearTimeout(to);
    }
  }

  if (!res.destroyed) {
    send('done', { toolCallsCount: 0 });
    res.end();
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Web interface: http://localhost:${PORT}`);
  console.log(`   Workspace: ${path.resolve(process.env.ALLOWED_DIR || './workspace')}`);
});
