import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import pino from 'pino';
import pinoPretty from 'pino-pretty';
import { z } from 'zod';
import { ChatMessage } from './types';
import { ModelPreset } from './config/models';

const logger = pino(
  { level: process.env.LOG_LEVEL || 'info' },
  pinoPretty({ destination: 2, sync: true })
);

const SESSIONS_DIR = path.join(__dirname, '..', 'sessions');
const PRESETS_FILE = path.join(__dirname, '..', 'presets.json');

function sessionsDir(): string {
  const dir = process.env.SESSIONS_DIR || SESSIONS_DIR;
  return dir;
}

async function ensureSessionsDir(): Promise<void> {
  const dir = sessionsDir();
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch { /* exists */ }
}

const chatMessageSchema: z.ZodType<ChatMessage> = z.lazy(() =>
  z.union([
    z.object({ role: z.literal('system'), content: z.string(), name: z.string().optional() }),
    z.object({ role: z.literal('user'), content: z.string(), name: z.string().optional() }),
    z.object({
      role: z.literal('assistant'),
      content: z.string().nullable(),
      name: z.string().optional(),
      tool_calls: z.array(z.object({
        id: z.string(),
        type: z.literal('function'),
        function: z.object({ name: z.string(), arguments: z.string() }),
      })).optional(),
    }),
    z.object({ role: z.literal('tool'), tool_call_id: z.string(), content: z.string(), name: z.string().optional() }),
  ])
);

const sessionMetaSchema = z.object({
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messageCount: z.number(),
  modelPreset: z.object({
    provider: z.string(),
    primary: z.string(),
    fallbacks: z.array(z.string()),
    contextWindow: z.number().optional(),
  }).nullable(),
});

export interface SessionMeta {
  name: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  modelPreset: ModelPreset | null;
}

export interface SessionData {
  messages: ChatMessage[];
  meta: SessionMeta;
}

export async function listSessions(): Promise<SessionMeta[]> {
  await ensureSessionsDir();
  const dir = sessionsDir();
  const results: SessionMeta[] = [];
  try {
    const entries = await fs.readdir(dir);
    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue;
      const name = entry.slice(0, -5);
      try {
        const meta = await getSessionMeta(name);
        if (meta) results.push(meta);
      } catch { /* skip corrupt */ }
    }
  } catch { /* empty */ }
  return results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function getSessionMeta(name: string): Promise<SessionMeta | null> {
  const dir = sessionsDir();
  const filePath = path.join(dir, `${name}.json`);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(data);
    if (parsed.meta) {
      const result = sessionMetaSchema.safeParse(parsed.meta);
      if (result.success) return result.data;
    }
    // Legacy: no meta, create one
    return {
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: Array.isArray(parsed) ? parsed.length : 0,
      modelPreset: null,
    };
  } catch { return null; }
}

function generateSessionName(messages: ReadonlyArray<ChatMessage>): string {
  const firstUser = messages.find(m => m.role === 'user');
  if (firstUser && typeof firstUser.content === 'string') {
    const text = firstUser.content.trim();
    return text.length > 40 ? text.slice(0, 40) + '...' : text;
  }
  return `Session ${new Date().toLocaleDateString()}`;
}

export async function saveSession(
  name: string,
  messages: ReadonlyArray<ChatMessage>,
  modelPreset?: ModelPreset | null,
): Promise<void> {
  await ensureSessionsDir();
  const dir = sessionsDir();
  const existing = await getSessionMeta(name);
  // Strip tool messages before persisting
  const filtered = messages.filter(m => m.role !== 'tool') as ChatMessage[];

  // Don't save sessions with no user messages
  const userMsgs = filtered.filter(m => m.role === 'user');
  if (userMsgs.length === 0) {
    // If file exists, delete it (session became empty after stripping)
    if (existing) {
      const filePath = path.join(dir, `${name}.json`);
      try { await fs.unlink(filePath); } catch { /* ignore */ }
    }
    return;
  }

  // Reject duplicate names for brand-new sessions
  if (existing && !messages.some(m => m.role === 'system')) {
    throw new Error(`Session "${name}" already exists`);
  }

  const meta: SessionMeta = {
    name,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messageCount: filtered.length,
    modelPreset: modelPreset !== undefined ? modelPreset : (existing?.modelPreset ?? null),
  };

  // Auto-title on first save
  if (!existing && filtered.length > 0) {
    meta.name = generateSessionName(filtered);
  }

  const data = { messages: filtered, meta };
  const filePath = path.join(dir, `${name}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function loadSession(name: string): Promise<SessionData | null> {
  const dir = sessionsDir();
  const filePath = path.join(dir, `${name}.json`);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(data);
    if (parsed.meta) {
      const metaResult = sessionMetaSchema.safeParse(parsed.meta);
      if (!metaResult.success) {
        // Fix meta
        parsed.meta = {
          name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messageCount: Array.isArray(parsed.messages) ? parsed.messages.length : 0,
          modelPreset: null,
        };
      }
      return parsed as SessionData;
    }
    // Legacy format: plain array of messages
    if (Array.isArray(parsed)) {
      return {
        messages: parsed as ChatMessage[],
        meta: {
          name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messageCount: parsed.length,
          modelPreset: null,
        },
      };
    }
    return null;
  } catch { return null; }
}

export async function deleteSession(name: string): Promise<void> {
  const dir = sessionsDir();
  const filePath = path.join(dir, `${name}.json`);
  try {
    await fs.unlink(filePath);
  } catch { /* not found */ }
}

export async function saveConversation(messages: ReadonlyArray<ChatMessage>, modelPreset?: ModelPreset | null): Promise<void> {
  // If modelPreset is undefined, keep existing; if null, explicitly clear
  await saveSession('default', messages, modelPreset);
}

export async function loadConversation(): Promise<{ messages: ChatMessage[]; modelPreset: ModelPreset | null } | null> {
  // Try new format first
  const data = await loadSession('default');
  if (data) return { messages: data.messages, modelPreset: data.meta.modelPreset };

  // Fallback: legacy conversation.json
  const LEGACY_FILE = path.join(__dirname, '..', 'conversation.json');
  try {
    const raw = await fs.readFile(LEGACY_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { messages: parsed as ChatMessage[], modelPreset: null };
    }
    if (parsed.messages) {
      return { messages: parsed.messages as ChatMessage[], modelPreset: parsed.modelPreset ?? null };
    }
  } catch { /* not found or corrupt */ }
  return null;
}

export async function clearConversation(): Promise<void> {
  await deleteSession('default');
  const LEGACY_FILE = path.join(__dirname, '..', 'conversation.json');
  try { await fs.unlink(LEGACY_FILE); } catch { }
}

export async function loadUserPresets(): Promise<Record<string, ModelPreset>> {
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

export async function saveUserPresets(presets: Record<string, ModelPreset>): Promise<void> {
  try {
    await fs.writeFile(PRESETS_FILE, JSON.stringify(presets, null, 2), 'utf-8');
  } catch (err) {
    logger.error({ err }, 'Failed to save presets');
  }
}
