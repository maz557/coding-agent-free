import express, { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import { tools, executeTool, setSafeMode, isSafeModeEnabled, allowExtraPath } from './tools/fileManager';
import { PROVIDERS, FIXED_PRESETS, SYSTEM_PROMPT } from './config/models';
import * as path from 'path';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { loadProjectContext } from './loadProjectContext';

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
  meta: {
    createdAt: string;
    title: string;
    modelLabel: string;
    firstUserMessage: string;
  };
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

app.post('/api/session', (req, res) => {
  const id = uuidv4();
  const modelConfig = { ...FIXED_PRESETS['1'] };
  const projectContext = loadProjectContext();
  const systemContent = projectContext
    ? `${SYSTEM_PROMPT}\n\n${projectContext}`
    : SYSTEM_PROMPT;
  const provName = PROVIDERS[modelConfig.provider]?.name || modelConfig.provider;
  sessions.set(id, {
    client: createClient(modelConfig.provider),
    modelConfig,
    messages: [{ role: 'system', content: systemContent }],
    meta: {
      createdAt: new Date().toISOString(),
      title: req.body?.title || 'New Session',
      modelLabel: `${provName} — ${modelConfig.primary}`,
      firstUserMessage: '',
    },
  });
  res.json({
    sessionId: id,
    models: Object.entries(getAllPresets()).map(([k, v]) => ({ id: k, name: `${PROVIDERS[v.provider]?.name || v.provider}/${v.primary}` })),
  });
});

app.get('/api/sessions', (_req, res) => {
  const list = [...sessions.entries()].map(([id, s]) => ({
    id,
    title: s.meta.title,
    createdAt: s.meta.createdAt,
    modelLabel: s.meta.modelLabel,
    messageCount: s.messages.filter(m => m.role !== 'system').length,
  }));
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(list);
});

app.get('/api/sessions/:sessionId', (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  const msgs = s.messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role,
      content: m.content,
      name: m.name,
      tool_calls: m.tool_calls?.map((tc: any) => ({
        id: tc.id, type: tc.type,
        function: { name: tc.function.name, arguments: tc.function.arguments },
      })),
    }));
  res.json({ messages: msgs, modelLabel: s.meta.modelLabel });
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
  s.meta.modelLabel = `${PROVIDERS[s.modelConfig.provider]?.name || s.modelConfig.provider} — ${s.modelConfig.primary}`;
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
  if (!s.meta.firstUserMessage) {
    s.meta.firstUserMessage = message;
    if (s.meta.title === 'New Session') {
      s.meta.title = message.slice(0, 60) + (message.length > 60 ? '...' : '');
    }
  }

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
        send('done', { toolCallsCount: 0, model: `${PROVIDERS[s.modelConfig.provider]?.name || s.modelConfig.provider} — ${model}` });
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

          // Capture before-content for write_file / replace_in_file / append_file
          let diffData: { path: string; before: string; after: string } | null = null;
          if ((tc.name === 'write_file' || tc.name === 'replace_in_file' || tc.name === 'append_file') && parsed.path) {
            try {
              const allowedDir = path.resolve(process.env.ALLOWED_DIR || './workspace');
              const fullPath = path.resolve(allowedDir, parsed.path);
              const beforeContent = await fsp.readFile(fullPath, 'utf-8');
              let afterContent: string;
              if (tc.name === 'write_file') {
                afterContent = String(parsed.content);
              } else if (tc.name === 'replace_in_file') {
                const idx = beforeContent.indexOf(parsed.old_str);
                afterContent = idx === -1 ? beforeContent
                  : beforeContent.slice(0, idx) + parsed.new_str + beforeContent.slice(idx + parsed.old_str.length);
              } else { // append_file
                afterContent = beforeContent + parsed.content;
              }
              if (beforeContent !== afterContent) {
                diffData = { path: parsed.path, before: beforeContent, after: afterContent };
              }
            } catch { /* new file or unreadable — skip diff */ }
          }

          const result = await executeTool(tc.name, parsed);
          const text = typeof result === 'string' ? result : JSON.stringify(result);

          if (diffData) { send('diff', diffData); await new Promise(r => setTimeout(r, 5)); }
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
    send('done', { toolCallsCount: 0, model: `${PROVIDERS[s.modelConfig.provider]?.name || s.modelConfig.provider} — ${s.modelConfig.primary}` });
    res.end();
  }
});

// ─── OpenAI-Compatible Proxy ───
const ALL_API_KEYS = [
  process.env.OPENROUTER_API_KEY || '',
  process.env.GROQ_API_KEY || '',
  process.env.GOOGLE_API_KEY || '',
  process.env.DEEPSEEK_API_KEY || '',
  process.env.MISTRAL_API_KEY || '',
].filter(Boolean);

function findPreset(modelOrId: string): { provider: string; primary: string; fallbacks: string[]; contextWindow?: number } | null {
  const allPresets = getAllPresets();
  if (allPresets[modelOrId]) return allPresets[modelOrId];
  for (const p of Object.values(allPresets)) {
    if ((p as any).primary === modelOrId) return p as any;
  }
  return null;
}

app.post('/v1/chat/completions', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization || '';
  const providedKey = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!providedKey && ALL_API_KEYS.length > 0) {
    return res.status(401).json({ error: { message: 'Missing API key', type: 'auth_error' } });
  }

  const { model, messages, stream = false, tools: reqTools, tool_choice, ...extraParams } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: { message: 'messages is required and must be an array', type: 'invalid_request' } });
  }

  const preset = findPreset(model) || { ...FIXED_PRESETS['1'], provider: 'openrouter' };
  const client = createClient(preset.provider);

  const requestBody: any = {
    model: preset.primary,
    messages,
    stream,
    ...extraParams,
  };
  if (reqTools) requestBody.tools = reqTools;
  if (tool_choice) requestBody.tool_choice = tool_choice;
  if (preset.provider === 'openrouter') {
    requestBody.extra_body = {
      models: [preset.primary, ...preset.fallbacks].filter(Boolean),
    };
  }

  try {
    const response = await client.chat.completions.create(requestBody) as any;

    if (stream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      res.flushHeaders();
      for await (const chunk of response) {
        if (res.destroyed) break;
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      if (!res.destroyed) res.write('data: [DONE]\n\n');
      if (!res.destroyed) res.end();
    } else {
      res.json(response);
    }
  } catch (err: any) {
    const status = err?.status || 500;
    res.status(status).json({
      error: { message: err?.message || 'Proxy error', type: 'proxy_error', code: err?.code },
    });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Web interface: http://localhost:${PORT}`);
    console.log(`   OpenAI-compatible API: http://localhost:${PORT}/v1/chat/completions`);
    console.log(`   Workspace: ${path.resolve(process.env.ALLOWED_DIR || './workspace')}`);
  });
}

export { app, createClient, sessions };
export type { SessionData };
