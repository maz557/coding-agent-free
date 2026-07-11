import express, { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import { getAllTools, executeTool, setSafeMode, isSafeModeEnabled, allowExtraPath, setMCPEnabled, isMCPEnabled, setLSPEnabled, isLSPEnabled } from './tools/toolRegistry';
import { mcpManager } from './mcp/MCPManager';
import { loadMCPConfig } from './mcp/config';
import { loadLSPConfig } from './lsp/config';
import { lspManager } from './lsp/index';
import { PROVIDERS, FIXED_PRESETS, SYSTEM_PROMPT, ModelPreset } from './config/models';
import { resolveRoute, isAutoRoute, getRouteLabel, listAutoRoutes, getRouteEntries } from './config/autoRouter';
import { discoverProviderModels, discoverAllProviders, pickBestModel } from './config/modelDiscovery';
import { getUserConfig } from './config/userConfig';
import { recordUsage, getAggregatedUsage } from './usageTracker';
import * as path from 'path';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { loadProjectContext, generateProjectMap } from './loadProjectContext';
import { ChatMessage } from './types';

dotenv.config();

const SUGGESTED_MODELS: Record<string, string> = {
  openrouter: 'openrouter/free',
  google: 'gemini-2.0-flash-exp',
  groq: 'llama3-70b-8192',
  deepseek: 'deepseek-chat',
  mistral: 'mistral-medium-2604',
  ollama: '',
  lmstudio: '',
  llamacpp: '',
};

const MAX_DEPTH = 20;

interface SessionData {
  client: OpenAI;
  modelConfig: { provider: string; primary: string; fallbacks: string[]; contextWindow?: number };
  messages: any[];
  noToolTurns: number;
  meta: {
    createdAt: string;
    updatedAt: string;
    title: string;
    modelLabel: string;
    firstUserMessage: string;
    route?: string;
  };
}

const SESSIONS_DIR = path.join(__dirname, '..', 'sessions');
const sessions = new Map<string, SessionData>();

async function ensureSessionsDir(): Promise<void> {
  try { await fsp.mkdir(SESSIONS_DIR, { recursive: true }); } catch { /* exists */ }
}

async function saveSessionToDisk(id: string, s: SessionData): Promise<void> {
  s.meta.updatedAt = new Date().toISOString();
  await ensureSessionsDir();
  const filteredMsgs = s.messages.filter(m => m.role !== 'tool');
  // Don't persist sessions with no user messages
  if (!filteredMsgs.some(m => m.role === 'user')) {
    await deleteSessionFromDisk(id).catch(() => {});
    return;
  }
  const meta = {
    name: s.meta.title,
    createdAt: s.meta.createdAt,
    updatedAt: s.meta.updatedAt,
    messageCount: filteredMsgs.length,
    modelPreset: { provider: s.modelConfig.provider, primary: s.modelConfig.primary, fallbacks: s.modelConfig.fallbacks, contextWindow: s.modelConfig.contextWindow },
  };
  await fsp.writeFile(path.join(SESSIONS_DIR, `${id}.json`), JSON.stringify({ messages: filteredMsgs, meta }, null, 2), 'utf-8');
}

async function deleteSessionFromDisk(id: string): Promise<void> {
  try { await fsp.unlink(path.join(SESSIONS_DIR, `${id}.json`)); } catch { /* not found */ }
}

async function loadSessionsFromDisk(): Promise<void> {
  await ensureSessionsDir();
  try {
    const entries = await fsp.readdir(SESSIONS_DIR);
    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue;
      const id = entry.slice(0, -5);
      try {
        const raw = await fsp.readFile(path.join(SESSIONS_DIR, entry), 'utf-8');
        const data = JSON.parse(raw);
        if (!data.messages || !data.meta) continue;
        const m = data.meta;
        // Migrate: strip tool messages from existing sessions
        if (data.messages.some((msg: any) => msg.role === 'tool')) {
          data.messages = data.messages.filter((msg: any) => msg.role !== 'tool');
          m.messageCount = data.messages.length;
          await fsp.writeFile(path.join(SESSIONS_DIR, entry), JSON.stringify(data, null, 2), 'utf-8');
        }
        const userMessages = data.messages.filter((msg: any) => msg.role !== 'system');
        if (userMessages.length === 0) {
          await deleteSessionFromDisk(id);
          continue;
        }
        const mc = m.modelPreset || FIXED_PRESETS['1'];
        sessions.set(id, {
          client: createClient(mc.provider),
          modelConfig: { provider: mc.provider, primary: mc.primary, fallbacks: mc.fallbacks || [], contextWindow: mc.contextWindow },
          messages: data.messages,
          noToolTurns: 0,
          meta: {
            createdAt: m.createdAt,
            updatedAt: m.updatedAt || m.createdAt,
            title: m.name || 'Session',
            modelLabel: `${PROVIDERS[mc.provider]?.name || mc.provider} — ${mc.primary}`,
            firstUserMessage: '',
          },
        });
        // Restore firstUserMessage
        const firstUser = userMessages.find((m: any) => m.role === 'user');
        const savedSession = sessions.get(id);
        if (savedSession && firstUser && typeof firstUser.content === 'string') {
          savedSession.meta.firstUserMessage = firstUser.content;
        }
      } catch (err) {
        console.log(`   ⚠️  Skipping corrupt session: ${entry}`);
      }
    }
    console.log(`   📂 Loaded ${sessions.size} session(s) from disk`);
  } catch { /* empty */ }
}

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

function tryNextRouteEntry(session: any): boolean {
  const route = session.meta?.route;
  if (route && isAutoRoute(route)) {
    const entries = getRouteEntries(route);
    if (entries) {
      const currentProvider = session.modelConfig?.provider;
      const currentModel = session.modelConfig?.primary;
      const startIdx = entries.findIndex((e: any) => e.provider === currentProvider && e.model === currentModel);
      if (startIdx >= 0) {
        for (let i = startIdx + 1; i < entries.length; i++) {
          const entry = entries[i];
          if (!isProviderAvailable(entry.provider)) continue;
          session.modelConfig = { provider: entry.provider, primary: entry.model, fallbacks: [] };
          session.client = createClient(entry.provider);
          return true;
        }
        return false;
      }
    }
  }

  // Fallback: try next preset by numeric order
  const allPresets = getAllPresets();
  const current = session.modelConfig;
  const keys = Object.keys(allPresets).sort((a, b) => Number(a) - Number(b));
  const startIdx = keys.findIndex(k => allPresets[k].provider === current.provider && allPresets[k].primary === current.primary);
  if (startIdx < 0) return false;

  for (let i = startIdx + 1; i < keys.length; i++) {
    const p = allPresets[keys[i]];
    if (!isProviderAvailable(p.provider)) continue;
    session.modelConfig = { provider: p.provider, primary: p.primary, fallbacks: [] };
    session.client = createClient(p.provider);
    return true;
  }
  return false;
}

function isProviderAvailable(provider: string): boolean {
  const info = PROVIDERS[provider];
  if (!info) return false;
  if (!info.apiKeyEnv) return true;
  return !!process.env[info.apiKeyEnv];
}

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

app.use(express.static(PUBLIC_DIR));

function buildSystemPrompt(): string {
  const parts: string[] = [];
  const pc = loadProjectContext();
  const pm = generateProjectMap();
  if (pc) parts.push(pc);
  if (pm) parts.push(pm);
  return parts.length > 0 ? `${SYSTEM_PROMPT}\n\n${parts.join('\n\n')}` : SYSTEM_PROMPT;
}

app.post('/api/session', (req, res) => {
  const id = uuidv4();
  const modelConfig = { ...FIXED_PRESETS['1'] };
  const systemContent = buildSystemPrompt();
  const provName = PROVIDERS[modelConfig.provider]?.name || modelConfig.provider;
  const sessionObj: SessionData = {
    client: createClient(modelConfig.provider),
    modelConfig,
    messages: [{ role: 'system', content: systemContent }],
    noToolTurns: 0,
    meta: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: req.body?.title || `Session ${new Date().toLocaleString()}`,
      modelLabel: `${provName} — ${modelConfig.primary}`,
      firstUserMessage: '',
    },
  };
  sessions.set(id, sessionObj);
  res.json({
    sessionId: id,
    models: Object.entries(getAllPresets()).map(([k, v]) => ({ id: k, name: `${PROVIDERS[v.provider]?.name || v.provider}/${v.primary}` })),
  });
});

app.get('/api/sessions', (_req, res) => {
  const testPatterns = [/^update \w+\.txt/, /^create \w+\.txt/, /^write \w+\.txt/, /^delete \w+\.txt/];
  const list = [...sessions.entries()]
    .filter(([_, s]) => !testPatterns.some(p => p.test(s.meta.title)))
    .map(([id, s]) => ({
      id,
      title: s.meta.title,
      createdAt: s.meta.createdAt,
      updatedAt: s.meta.updatedAt,
      modelLabel: s.meta.modelLabel,
      messageCount: s.messages.filter(m => m.role !== 'system' && m.role !== 'tool').length,
    }));
  list.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  res.json(list);
});

app.get('/api/sessions/:sessionId', (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  const msgs = s.messages
    .filter(m => m.role !== 'system' && m.role !== 'tool')
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

app.post('/api/presets', express.json(), async (req, res) => {
  const { num, model } = req.body || {};
  if (!num || !model) return res.status(400).json({ error: 'Missing num or model' });
  const numStr = String(num);
  if (FIXED_PRESETS[numStr]) return res.status(400).json({ error: `Cannot overwrite fixed preset ${numStr}` });
  const colon = model.indexOf(':');
  let providerId: string;
  let modelId: string;
  if (colon > 0 && PROVIDERS[model.slice(0, colon)]) {
    providerId = model.slice(0, colon);
    modelId = model.slice(colon + 1);
  } else {
    return res.status(400).json({ error: 'Format: provider:model (e.g. xai:grok-beta)' });
  }
  const presets = loadUserPresets();
  presets[numStr] = { provider: providerId, primary: modelId, fallbacks: ['openrouter/free'] };
  try { fs.writeFileSync(PRESETS_FILE, JSON.stringify(presets, null, 2), 'utf-8'); } catch {}
  res.json({ success: true, num: numStr, provider: providerId, model: modelId });
});

app.delete('/api/presets/:num', (req, res) => {
  const num = req.params.num;
  if (FIXED_PRESETS[num]) return res.status(400).json({ error: `Cannot remove fixed preset ${num}` });
  const presets = loadUserPresets();
  if (!presets[num]) return res.status(404).json({ error: `Preset ${num} not found` });
  delete presets[num];
  try { fs.writeFileSync(PRESETS_FILE, JSON.stringify(presets, null, 2), 'utf-8'); } catch {}
  res.json({ success: true, num });
});

app.get('/api/active/:sessionId', (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  const prov = PROVIDERS[s.modelConfig.provider]?.name || s.modelConfig.provider;
  res.json({ provider: prov, model: s.modelConfig.primary, fallbacks: s.modelConfig.fallbacks, safeMode: isSafeModeEnabled(), route: s.meta.route || null });
});

app.get('/api/config/:sessionId', (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  const provInfo = PROVIDERS[s.modelConfig.provider];
  const isLocal = provInfo && !provInfo.apiKeyEnv;
  const timeoutMs = isLocal ? getUserConfig().localTimeoutMs : getUserConfig().cloudTimeoutMs;
  res.json({ timeoutMs });
});

app.post('/api/model/:sessionId', (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  const { presetId, provider, model, route } = req.body;
  const allPresets = getAllPresets();

  if (route && isAutoRoute(route)) {
    const resolved = resolveRoute(route);
    if (!resolved.preset) return res.status(400).json({ error: `No model available for ${route}`, suggestion: resolved.suggestion });
    s.modelConfig = resolved.preset;
    s.meta.route = route;
  } else if (presetId && allPresets[presetId]) {
    s.modelConfig = { ...allPresets[presetId] };
    delete s.meta.route;
  } else if (provider && model) {
    s.modelConfig = { provider, primary: model, fallbacks: req.body.fallbacks || [] };
    delete s.meta.route;
  } else {
    return res.status(400).json({ error: 'Provide presetId, provider+model, or route' });
  }
  s.client = createClient(s.modelConfig.provider);
  s.meta.modelLabel = `${PROVIDERS[s.modelConfig.provider]?.name || s.modelConfig.provider} — ${s.modelConfig.primary}`;
  saveSessionToDisk(req.params.sessionId, s).catch(() => {});
  res.json({ provider: PROVIDERS[s.modelConfig.provider]?.name || s.modelConfig.provider, model: s.modelConfig.primary, route: s.meta.route || null });
});

app.get('/api/usage', (_req, res) => {
  res.json(getAggregatedUsage());
});

app.get('/api/routes', (_req, res) => {
  const routes = listAutoRoutes().map(r => {
    const resolved = resolveRoute(r);
    return {
      id: r,
      label: getRouteLabel(r),
      model: resolved.preset?.primary || null,
      suggestion: resolved.suggestion || null,
    };
  });
  res.json(routes);
});

app.post('/api/reset/:sessionId', (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  s.messages = [{ role: 'system', content: SYSTEM_PROMPT }];
  saveSessionToDisk(req.params.sessionId, s).catch(() => {});
  res.json({ status: 'ok' });
});

app.post('/api/sessions/:sessionId/rename', async (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  const { title } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  s.meta.title = title.trim();
  await saveSessionToDisk(req.params.sessionId, s);
  res.json({ title: s.meta.title });
});

app.delete('/api/sessions', async (_req, res) => {
  sessions.clear();
  try { await fsp.rm(SESSIONS_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
  await ensureSessionsDir();
  res.json({ status: 'ok' });
});

app.delete('/api/sessions/:sessionId', async (req, res) => {
  const id = req.params.sessionId;
  sessions.delete(id);
  await deleteSessionFromDisk(id);
  res.json({ status: 'ok' });
});

app.get('/api/sessions/:sessionId/export', (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  const data = {
    title: s.meta.title,
    createdAt: s.meta.createdAt,
    updatedAt: s.meta.updatedAt,
    modelLabel: s.meta.modelLabel,
    modelConfig: s.modelConfig,
    messages: s.messages.filter(m => m.role !== 'system' && m.role !== 'tool'),
  };
  res.setHeader('Content-Disposition', `attachment; filename="session-${req.params.sessionId}.json"`);
  res.json(data);
});

app.post('/api/sessions/import', express.text({ type: 'application/json', limit: '10mb' }), (req, res) => {
  try {
    const data = JSON.parse(req.body);
    if (!data.messages || !Array.isArray(data.messages)) {
      return res.status(400).json({ error: 'Invalid session file: missing messages array' });
    }
    const id = uuidv4();
    const modelConfig = data.modelConfig || { ...FIXED_PRESETS['1'] };
    const provName = PROVIDERS[modelConfig.provider]?.name || modelConfig.provider;
    const systemContent = buildSystemPrompt();
    const sessionObj: SessionData = {
      client: createClient(modelConfig.provider),
      modelConfig,
      messages: [{ role: 'system', content: systemContent }, ...data.messages],
      noToolTurns: 0,
      meta: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        title: data.title || `Imported ${new Date().toLocaleString()}`,
        modelLabel: data.modelLabel || `${PROVIDERS[modelConfig.provider]?.name || modelConfig.provider} — ${modelConfig.primary}`,
        firstUserMessage: '',
      },
    };
    sessions.set(id, sessionObj);
    saveSessionToDisk(id, sessionObj).catch(() => {});
    res.json({ sessionId: id });
  } catch (err: any) {
    res.status(400).json({ error: `Invalid session file: ${err.message}` });
  }
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

app.get('/api/tools', (_req, res) => {
  const tools = getAllTools().map(t => ({
    name: t.function.name,
    description: t.function.description?.split('.')[0] || '',
  }));
  res.json({ tools, count: tools.length });
});

app.get('/api/discover', async (_req, res) => {
  try {
    const all = await discoverAllProviders();
    const providers = [];
    for (const [provider, models] of Object.entries(all)) {
      if (models.length === 0) continue;
      const best = pickBestModel(models, ['large', 'medium', 'flash']);
      providers.push({ name: PROVIDERS[provider]?.name || provider, count: models.length, best });
    }
    res.json({ providers });
  } catch { res.json({ providers: [] }); }
});

app.get('/api/mcp', (_req, res) => {
  const servers = mcpManager.getServerNames().map(name => ({
    name,
    tools: mcpManager.getServerToolCount(name),
  }));
  res.json({ servers });
});

app.get('/api/mcp/status', (_req, res) => {
  res.json({ enabled: isMCPEnabled(), servers: mcpManager.getServerNames() });
});

app.post('/api/mcp/toggle', (_req, res) => {
  const enabled = !isMCPEnabled();
  setMCPEnabled(enabled);
  res.json({ enabled });
});

app.get('/api/lsp/status', (_req, res) => {
  res.json({ enabled: isLSPEnabled(), ready: lspManager.isAvailable(), languages: lspManager.getActiveLanguages() });
});

app.post('/api/lsp/toggle', (_req, res) => {
  const enabled = !isLSPEnabled();
  setLSPEnabled(enabled);
  res.json({ enabled, ready: lspManager.isAvailable(), languages: lspManager.getActiveLanguages() });
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
  let timeoutMs = isLocal ? getUserConfig().localTimeoutMs : getUserConfig().cloudTimeoutMs;

  s.messages.push({ role: 'user', content: message });
  if (!s.meta.firstUserMessage) {
    s.meta.firstUserMessage = message;
    if (s.meta.title.startsWith('Session ')) {
      s.meta.title = message.slice(0, 60) + (message.length > 60 ? '...' : '');
    }
  }
  saveSessionToDisk(req.params.sessionId, s).catch(() => {});

  const toolErrorCount = new Map<string, number>();

  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    const base: any = {
      model: s.modelConfig.primary,
      messages: s.messages,
      tools: getAllTools(),
      tool_choice: 'auto',
      stream: true,
    };

    if (s.modelConfig.provider === 'openrouter') {
      const models = [s.modelConfig.primary, ...s.modelConfig.fallbacks].filter(Boolean);
      base.extra_body = { models: [...new Set(models)] };
    }

    const ac = new AbortController();
    let to = setTimeout(() => ac.abort(), timeoutMs);

    try {
      const stream: any = await s.client.chat.completions.create(base, { signal: ac.signal });

      // Reset timeout on each token — idle timeout only
      clearTimeout(to);

      let content = '';
      const tcs = new Map<number, any>();
      let usedModel = '';

      for await (const chunk of stream) {
        clearTimeout(to);
        to = setTimeout(() => ac.abort(), timeoutMs);
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
      recordUsage(req.params.sessionId, s.modelConfig.provider, model, s.messages, content || '');

      if (tcs.size === 0) {
        s.noToolTurns++;
        if (s.noToolTurns >= 2) {
          // Undo the assistant message we just pushed
          s.messages.pop();
          if (tryNextRouteEntry(s)) {
            const fallbackInfo = `${PROVIDERS[s.modelConfig.provider]?.name || s.modelConfig.provider} — ${s.modelConfig.primary}`;
            send('error', { message: `No tool calls for 2 consecutive turns — falling back to ${fallbackInfo}` });
            continue;
          }
          // No more presets — push back the message and return
          s.messages.push({ role: 'assistant', content: content || null });
        }
        saveSessionToDisk(req.params.sessionId, s).catch(() => {});
        send('done', { toolCallsCount: 0, model: `${PROVIDERS[s.modelConfig.provider]?.name || s.modelConfig.provider} — ${model}` });
        res.end();
        return;
      }

      const calls = [...tcs.values()].filter((x: any) => x.name);
      // Tool calls were made — reset no-tool counter
      s.noToolTurns = 0;
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
          const prev = (toolErrorCount.get(tc.name) || 0) + 1;
          toolErrorCount.set(tc.name, prev);
          if (prev >= 3) {
            send('error', { message: `Tool "${tc.name}" failed ${prev} times — aborting` });
            depth = MAX_DEPTH;
            break;
          }
        }
      }
    } catch (err: any) {
      const errMsg = err?.message || 'API error';

      // Auto-correct invalid model name (e.g. "not a valid model ID")
      if (err?.status === 400 && errMsg.toLowerCase().includes('valid model')) {
        const oldModel = s.modelConfig.primary;
        send('error', { message: `Model "${oldModel}" invalid — discovering alternatives for ${s.modelConfig.provider}...` });
        const models = await discoverProviderModels(s.modelConfig.provider);
        const best = pickBestModel(models);
        if (best && best !== oldModel) {
          send('error', { message: `Auto-corrected: ${oldModel} → ${best}` });
          s.modelConfig.primary = best;
          continue; // retry same provider with new model
        }
        send('error', { message: `No alternative found for ${s.modelConfig.provider}.` });
      }

      if (tryNextRouteEntry(s)) {
        send('error', { message: `${errMsg} — falling back to ${s.modelConfig.provider}/${s.modelConfig.primary}` });
        const fallbackProvInfo = PROVIDERS[s.modelConfig.provider];
        const isLocalFallback = fallbackProvInfo && !fallbackProvInfo.apiKeyEnv;
        timeoutMs = isLocalFallback ? getUserConfig().localTimeoutMs : getUserConfig().cloudTimeoutMs;
        continue;
      }

      send('error', { message: errMsg });
      break;
    } finally {
      clearTimeout(to);
    }
  }

  saveSessionToDisk(req.params.sessionId, s).catch(() => {});
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
  // Initialize services
  (async () => {
    await loadSessionsFromDisk();

    const mcpConfig = loadMCPConfig();
    for (const [name, def] of Object.entries(mcpConfig)) {
      try {
        await mcpManager.connectServer(name, def);
        const n = mcpManager.getServerToolCount(name);
        console.log(`   🔌 MCP "${name}" connected (${n} tools)`);
      } catch (err: any) {
        console.log(`   ⚠️  MCP "${name}" failed: ${err.message}`);
      }
    }

    try {
      const lspConfigs = loadLSPConfig();
      for (const cfg of lspConfigs) {
        lspManager.addConfig(cfg);
      }
      const allowedDir = path.resolve(process.env.ALLOWED_DIR || './workspace');
      await lspManager.startForProject(allowedDir);
      if (lspManager.isAvailable()) {
        const langs = lspManager.getActiveLanguages().join(', ') || 'TypeScript';
        console.log(`   🔬 LSP ready (${langs}): code_definition, code_references, code_hover`);
      }
    } catch { /* LSP optional */ }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🌐 Web interface: http://localhost:${PORT}`);
      console.log(`   OpenAI-compatible API: http://localhost:${PORT}/v1/chat/completions`);
      console.log(`   Workspace: ${path.resolve(process.env.ALLOWED_DIR || './workspace')}`);
    });
  })();
}

export { app, createClient, sessions };
export type { SessionData };
