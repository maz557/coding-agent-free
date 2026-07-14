import express, { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import { getAllTools, setSafeMode, isSafeModeEnabled, allowExtraPath, setMCPEnabled, isMCPEnabled, setLSPEnabled, isLSPEnabled, setGovernanceEnabled, isGovernanceEnabled, setApprovalCallback, approvalStore } from './tools/toolRegistry';
import { AgentMode, AGENT_MODES, filterToolsForMode } from './AgentMode';
import { CodingAgent } from './CodingAgent';
import { setCurrentSessionId, setOnProjectCreated } from './tools/fileManager';
import { projectManager } from './ProjectManager';
import { mcpManager } from './mcp/MCPManager';
import { loadMCPConfig } from './mcp/config';
import { loadLSPConfig } from './lsp/config';
import { lspManager } from './lsp/index';
import { PROVIDERS, FIXED_PRESETS, SYSTEM_PROMPT, ModelPreset } from './config/models';
import { resolveRoute, isAutoRoute, getRouteLabel, listAutoRoutes } from './config/autoRouter';
import { discoverProviderModels, discoverAllProviders, pickBestModel, runDiscovery as runModelDiscovery, loadBestModels, saveBestModels } from './config/modelDiscovery';
import { getUserConfig } from './config/userConfig';
import { recordUsage, getAggregatedUsage } from './usageTracker';
import * as path from 'path';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { loadProjectContext, generateProjectMap } from './loadProjectContext';
import { ChatMessage } from './types';

dotenv.config();

// Load persisted discovered models, then silently find best models for auto-routes
loadBestModels();
runModelDiscovery().catch(() => {});

const SUGGESTED_MODELS: Record<string, string> = {
  openrouter: 'google/gemma-4-31b-it:free',
  google: 'gemini-2.0-flash-exp',
  groq: 'llama3-70b-8192',
  deepseek: 'deepseek-chat',
  mistral: 'mistral-large-2512',
  ollama: '',
  lmstudio: '',
  llamacpp: '',
};

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
    projectId?: string;
    mode?: AgentMode;
  };
  governance?: { allowedTools: string[] };
  planSteps?: Array<{ description: string; status: string }>;
}

const SESSIONS_DIR = path.join(__dirname, '..', 'sessions');
const sessions = new Map<string, SessionData>();

// Global pending approvals keyed by sessionId — resolved by POST /api/approve
const globalPendingApproves = new Map<string, (ok: boolean) => void>();

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
  const meta: Record<string, any> = {
    name: s.meta.title,
    createdAt: s.meta.createdAt,
    updatedAt: s.meta.updatedAt,
    messageCount: filteredMsgs.length,
    modelPreset: { provider: s.modelConfig.provider, primary: s.modelConfig.primary, fallbacks: s.modelConfig.fallbacks, contextWindow: s.modelConfig.contextWindow },
  };
  if (s.meta.projectId) meta.projectId = s.meta.projectId;
  const governance = approvalStore.toJSON();
  const governanceData = governance.length > 0 ? { allowedTools: governance } : undefined;
  const planSteps = s.planSteps || undefined;
  const filePath = path.join(SESSIONS_DIR, `${id}.json`);
  const tmpPath = filePath + '.tmp.' + process.pid;
  await fsp.writeFile(tmpPath, JSON.stringify({ messages: filteredMsgs, meta, governance: governanceData, planSteps }, null, 2), 'utf-8');
  // Retry rename on Windows to mitigate EPERM race (antivirus/flush)
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await fsp.rename(tmpPath, filePath);
      break;
    } catch (err: any) {
      if (err.code !== 'EPERM') throw err;
      if (attempt === 4) throw err;
      await new Promise(r => setTimeout(r, 20 + attempt * 10));
    }
  }
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
            projectId: m.projectId || undefined,
          },
        });
        // Restore plan steps
        if (data.planSteps && Array.isArray(data.planSteps)) {
          const s = sessions.get(id);
          if (s) s.planSteps = data.planSteps;
        }

        // Restore governance state
        if (data.governance?.allowedTools?.length > 0) {
          const s = sessions.get(id);
          if (s) {
            s.governance = { allowedTools: data.governance.allowedTools };
            approvalStore.fromJSON(data.governance.allowedTools);
          }
        }

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
  const apiKey = info.apiKeyEnv ? (process.env[info.apiKeyEnv] || 'placeholder') : 'local';
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
        provider: String(item.provider ?? 'openrouter').toLowerCase(),
        primary: String(item.primary ?? '').trim(),
        fallbacks: Array.isArray(item.fallbacks) ? item.fallbacks.map((f: any) => String(f).trim()).filter(Boolean) : [],
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

// Static files — placed after API routes so /api/* paths are not intercepted.
// When tests import { app } and listen on their own port, express.static is attached
// here (at module level) — API routes registered before it take priority.
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
  res.json({ messages: msgs, modelLabel: s.meta.modelLabel, meta: { projectId: s.meta.projectId } });
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

app.get('/api/models/:provider', async (req, res) => {
  const { provider } = req.params;
  if (!PROVIDERS[provider]) return res.status(404).json({ error: `Unknown provider: ${provider}` });
  try {
    const models = await discoverProviderModels(provider);
    if (provider === 'openrouter') {
      const free = models.filter(m => m.id.endsWith(':free')).map(m => m.id);
      const paid = models.filter(m => !m.id.endsWith(':free')).map(m => m.id);
      res.json({ provider, name: PROVIDERS[provider].name, free, paid });
    } else {
      res.json({ provider, name: PROVIDERS[provider].name, models: models.map(m => m.id) });
    }
  } catch {
    res.status(500).json({ error: `Failed to discover models for ${provider}` });
  }
});

app.post('/api/presets', express.json(), async (req, res) => {
  const { num, model } = req.body || {};
  if (!num || !model) return res.status(400).json({ error: 'Missing num or model' });
  const numStr = String(num);
  if (FIXED_PRESETS[numStr]) return res.status(400).json({ error: `Cannot overwrite fixed preset ${numStr}` });
  const colon = model.indexOf(':');
  let providerId: string;
  let modelId: string;
  if (colon > 0) {
    const rawProvider = model.slice(0, colon).toLowerCase();
    if (!PROVIDERS[rawProvider]) {
      return res.status(400).json({ error: `Unknown provider "${rawProvider}". Use one of: ${Object.keys(PROVIDERS).join(', ')}` });
    }
    providerId = rawProvider;
    modelId = model.slice(colon + 1).trim();
  } else {
    return res.status(400).json({ error: 'Format: provider:model (e.g. xai:grok-beta)' });
  }
  const presets = loadUserPresets();
  presets[numStr] = { provider: providerId, primary: modelId, fallbacks: ['google/gemma-4-31b-it:free'] };
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

app.get('/api/mode/:sessionId', (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  res.json({ mode: s.meta.mode || 'build' });
});

app.post('/api/mode/:sessionId', (req, res) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  const { mode } = req.body || {};
  if (mode !== 'build' && mode !== 'plan') {
    return res.status(400).json({ error: 'mode must be "build" or "plan"' });
  }
  const newMode = mode as AgentMode;
  s.meta.mode = newMode;
  s.messages.push({ role: 'system', content: `[Mode: ${AGENT_MODES[newMode].label}]\n${AGENT_MODES[newMode].instruction}` });
  saveSessionToDisk(req.params.sessionId, s).catch(() => {});
  res.json({ mode: newMode, label: AGENT_MODES[newMode].label, description: AGENT_MODES[newMode].description });
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
  // Remove all sessionIds from all projects before clearing sessions
  for (const [sid, s] of sessions) {
    if (s.meta.projectId) {
      await projectManager.removeSession(s.meta.projectId, sid).catch(() => {});
    }
  }
  sessions.clear();
  try { await fsp.rm(SESSIONS_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
  await ensureSessionsDir();
  res.json({ status: 'ok' });
});

app.delete('/api/sessions/:sessionId', async (req, res) => {
  const id = req.params.sessionId;
  const s = sessions.get(id);
  // Remove sessionId from linked project
  if (s?.meta.projectId) {
    await projectManager.removeSession(s.meta.projectId, id).catch(() => {});
  }
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

app.post('/api/approve/:sessionId', (req: Request<{ sessionId: string }>, res: Response) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  const { allow, permanent } = req.body;
  if (typeof allow !== 'boolean') return res.status(400).json({ error: 'allow (boolean) is required' });
  if (permanent) {
    const name = req.body.tool || '';
    if (name) approvalStore.allowPermanently(name);
  }
  // Resolve the pending approval promise (handled in SSE loop)
  if (globalPendingApproves && globalPendingApproves.has(req.params.sessionId)) {
    const resolve = globalPendingApproves.get(req.params.sessionId)!;
    globalPendingApproves.delete(req.params.sessionId);
    resolve(allow);
  }
  res.json({ approved: allow });
});

app.get('/api/gov', (_req, res) => {
  res.json({ enabled: isGovernanceEnabled() });
});

app.post('/api/gov', (_req, res) => {
  const now = !isGovernanceEnabled();
  setGovernanceEnabled(now);
  res.json({ enabled: now });
});

app.get('/api/trust', (_req, res) => {
  res.json({ tools: approvalStore.toJSON() });
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
    // Re-run full discovery — updates bestModels + persists to route-presets.json _discovered
    await runModelDiscovery();
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

app.post('/api/lsp/install', async (req, res) => {
  const { filePath } = req.body || {};
  if (!filePath || typeof filePath !== 'string') {
    return res.status(400).json({ error: 'filePath is required' });
  }
  const fullPath = path.resolve(filePath);
  const cwd = process.cwd();
  const result = await lspManager.autoInstallAndStart(fullPath, cwd);
  res.json({ result });
});

// --- Project API ---
app.get('/api/projects', async (_req, res) => {
  await projectManager.loadAll();
  res.json({ projects: projectManager.listSummaries() });
});

app.get('/api/projects/:id', (req, res) => {
  const p = projectManager.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  res.json(p);
});

app.post('/api/projects', async (req, res) => {
  const { title, description, sessionId, planSteps } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
  const s = sessions.get(sessionId);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  await projectManager.loadAll();
  const { PlanManager } = require('./PlanManager');
  const pm = new PlanManager();
  if (planSteps && planSteps.length > 0) pm.fromJSON({ steps: planSteps });
  const data = await projectManager.create(pm, title, description || '', sessionId);
  s.meta.projectId = data.id;
  saveSessionToDisk(sessionId, s).catch(() => {});
  res.json(data);
});

app.post('/api/projects/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['active', 'paused', 'completed', 'abandoned'].includes(status))
    return res.status(400).json({ error: 'Invalid status' });
  try {
    await projectManager.setStatus(req.params.id, status);
    res.json({ status });
  } catch (e: any) {
    res.status(404).json({ error: e.message });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  const projectId = req.params.id;
  // Clean up projectId from all linked sessions before deleting project
  for (const [sid, s] of sessions) {
    if (s.meta.projectId === projectId) {
      s.meta.projectId = undefined;
      saveSessionToDisk(sid, s).catch(() => {});
    }
  }
  await projectManager.delete(projectId);
  res.json({ deleted: true });
});

app.post('/api/chat/:sessionId', async (req: Request<{ sessionId: string }>, res: Response) => {
  const s = sessions.get(req.params.sessionId);
  if (!s) return res.status(404).json({ error: 'Session not found' });

  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  // Intercept per-provider model listing commands (e.g. /openrouter, /mistral, ...)
  const PROVIDER_COMMANDS: Record<string, string> = {
    openrouter: 'openrouter', mistral: 'mistral', groq: 'groq',
    google: 'google', xai: 'xai', cerebras: 'cerebras',
    cohere: 'cohere', deepseek: 'deepseek', anthropic: 'anthropic',
    together: 'together', perplexity: 'perplexity',
  };
  const cmd = message.trim().toLowerCase().replace(/^\//, '');
  const providerId = PROVIDER_COMMANDS[cmd];
  if (providerId) {
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
    const pInfo = PROVIDERS[providerId];
    if (!pInfo) { send('token', { token: `❌ Unknown provider: ${providerId}` }); send('done', {}); res.end(); return; }
    if (pInfo.apiKeyEnv && !process.env[pInfo.apiKeyEnv]) {
      send('token', { token: `⚠️  No API key (${pInfo.apiKeyEnv}) for ${pInfo.name}. Set it in .env` });
      send('done', {}); res.end(); return;
    }
    const models = await discoverProviderModels(providerId);
    if (models.length === 0) {
      send('token', { token: `No models found for ${pInfo.name}.` });
    } else {
      let text = `**${pInfo.name}: ${models.length} model(s)**\n\n`;
      if (providerId === 'openrouter') {
        const freeModels = models.filter((m: any) => m.id.endsWith(':free'));
        const paidModels = models.filter((m: any) => !m.id.endsWith(':free'));
        if (freeModels.length > 0) {
          text += `🆓 **Free models (${freeModels.length}):**\n`;
          for (const m of freeModels) text += `- \`${m.id}\`\n`;
        }
        if (paidModels.length > 0) {
          text += `\n💰 **Paid models (${paidModels.length}):**\n`;
          for (const m of paidModels) text += `- \`${m.id}\`\n`;
        }
      } else {
        for (const m of models) text += `- \`${m.id}\`\n`;
      }
      send('token', { token: text });
    }
    send('done', {});
    res.end();
    return;
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

  // Pending approval state — resolved by POST /api/approve

  if (!s.meta.firstUserMessage) {
    s.meta.firstUserMessage = message;
    if (s.meta.title.startsWith('Session ')) {
      s.meta.title = message.slice(0, 60) + (message.length > 60 ? '...' : '');
    }
  }

  // Web UI approval: auto-approve unless governance enabled
  const sessionId = req.params.sessionId;
  const prevCallback = setApprovalCallback(async (toolName, args, level) => {
    const wasEnabled = isGovernanceEnabled();
    if (!wasEnabled) return true;
    send('approval_request', { tool: toolName, args, level });
    return new Promise(resolve => {
      globalPendingApproves.set(sessionId, resolve);
      // Safety timeout: auto-deny after 120s
      setTimeout(() => {
        globalPendingApproves.delete(sessionId);
        resolve(false);
      }, 120_000).unref();
    });
  });
  const cleanup = () => {
    globalPendingApproves.delete(sessionId);
    setApprovalCallback(prevCallback);
  };
  res.on('close', cleanup);
  res.on('finish', cleanup);
  res.on('error', cleanup);

  const currentMode = s.meta.mode || 'build';
  const systemContent = buildSystemPrompt();

  const modeTools = filterToolsForMode(getAllTools(), currentMode) as any;

  const keepaliveTo = setInterval(() => {
    try { send('status', { text: 'Working...' }); } catch { /* ignore */ }
  }, 15000);

  let prevOnProjectCreated: ((sid: string, pid: string) => void) | null = null;
  try {
    setCurrentSessionId(sessionId);
    // When create_project tool fires, link projectId to session
    prevOnProjectCreated = setOnProjectCreated((sid, projectId) => {
      const target = sessions.get(sid);
      if (target) {
        target.meta.projectId = projectId;
        saveSessionToDisk(sid, target).catch(() => {});
      }
    });
    const agent = new CodingAgent(
      s.client,
      modeTools,
      {
        provider: s.modelConfig.provider,
        primary: s.modelConfig.primary,
        fallbacks: s.modelConfig.fallbacks || [],
        contextWindow: s.modelConfig.contextWindow,
      } as ModelPreset,
      systemContent,
      s.messages as ChatMessage[],
      currentMode,
      {
        onToken: (token) => send('token', { token }),
        onToolCall: (name, args) => send('tool_call', { name, args }),
        onToolResult: (name, content) => send('tool_result', { name, content: content.slice(0, 300) }),
        onDiff: (path, before, after) => send('diff', { path, before, after }),
        onStatus: (text) => send('status', { text }),
        onModel: (model) => send('model', { model: `${PROVIDERS[s.modelConfig.provider]?.name || s.modelConfig.provider} — ${model}` }),
        onPlan: (steps) => { s.planSteps = steps; },
        onError: (msg) => send('error', { message: msg }),
      }
    );

    const result = await agent.execute(message);

    // Sync messages back to session (includes system, user, assistant, tool messages)
    s.messages = [...agent.getConversationMessages()];

    // Sync plan steps from agent's PlanManager
    if (agent.planManager?.hasPlan()) {
      s.planSteps = [...agent.planManager.getSteps()];
    }

    // Sync plan steps to linked project
    if (s.meta.projectId && s.planSteps && s.planSteps.length > 0) {
      const { PlanManager } = require('./PlanManager');
      const pm = new PlanManager();
      pm.fromJSON({ steps: s.planSteps });
      projectManager.updatePlan(s.meta.projectId, pm).catch(() => {});
    }

    setOnProjectCreated(prevOnProjectCreated);
    recordUsage(req.params.sessionId, s.modelConfig.provider, result.model || s.modelConfig.primary, s.messages, '');

    if (!res.destroyed) {
      send('done', {
        toolCallsCount: result.toolCallsCount || 0,
        model: `${PROVIDERS[s.modelConfig.provider]?.name || s.modelConfig.provider} — ${result.model || s.modelConfig.primary}`,
      });
    }
  } catch (err: any) {
    setOnProjectCreated(prevOnProjectCreated);
    const errMsg = err?.message || 'Unknown error';
    send('error', { message: errMsg });
  } finally {
    clearInterval(keepaliveTo);
    saveSessionToDisk(req.params.sessionId, s).catch(() => {});
    if (!res.destroyed) res.end();
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

    // Align PROJECTS_DIR with workspace BEFORE loading projects
    const allowedDir = path.resolve(process.env.ALLOWED_DIR || './workspace');
    process.env.PROJECTS_DIR = allowedDir;
    await projectManager.loadAll();

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
      // Also start for the main project directory so TypeScript/other LSP is available
      const projectDir = path.resolve(__dirname, '..');
      if (projectDir !== allowedDir) {
        await lspManager.startForProject(projectDir, true);
      }
      if (lspManager.isAvailable()) {
        const langs = lspManager.getActiveLanguages().join(', ') || 'TypeScript';
        console.log(`   🔬 LSP ready (${langs}): code_definition, code_references, code_hover`);
      }
    } catch { /* LSP optional */ }

    // Static files AFTER all API routes to avoid catching /api/* paths
    app.use(express.static(PUBLIC_DIR));

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🌐 Web interface: http://localhost:${PORT}`);
      console.log(`   OpenAI-compatible API: http://localhost:${PORT}/v1/chat/completions`);
      console.log(`   Workspace: ${path.resolve(process.env.ALLOWED_DIR || './workspace')}`);
    });
  })();
}

export { app, createClient, sessions };
export type { SessionData };
