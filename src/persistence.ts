import * as fs from 'fs/promises';
import * as path from 'path';
import pino from 'pino';
import pinoPretty from 'pino-pretty';
import { ChatMessage } from './types';
import { ModelPreset } from './config/models';

const logger = pino(
  { level: process.env.LOG_LEVEL || 'info' },
  pinoPretty({ destination: 2, sync: true })
);

const PRESETS_FILE = path.join(__dirname, '..', 'presets.json');
const CONVERSATION_FILE = path.join(__dirname, '..', 'conversation.json');

export interface SavedSession {
  messages: ChatMessage[];
  modelPreset: {
    provider: string;
    primary: string;
    fallbacks: string[];
    contextWindow?: number;
  } | null;
}

export async function saveConversation(messages: ReadonlyArray<ChatMessage>, modelPreset?: ModelPreset): Promise<void> {
  try {
    const session: SavedSession = { messages: messages as ChatMessage[], modelPreset: modelPreset ?? null };
    await fs.writeFile(CONVERSATION_FILE, JSON.stringify(session, null, 2), 'utf-8');
  } catch (err) {
    logger.error({ err }, 'Failed to save conversation');
  }
}

export async function loadConversation(): Promise<SavedSession | null> {
  try {
    const data = await fs.readFile(CONVERSATION_FILE, 'utf-8');
    const parsed = JSON.parse(data);
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

export async function clearConversation(): Promise<void> {
  try {
    await fs.unlink(CONVERSATION_FILE);
  } catch { }
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
