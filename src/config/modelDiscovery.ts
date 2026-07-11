import { PROVIDERS, ModelPreset } from './models';

export interface ProviderModel {
  id: string;
  created?: number;
}

interface DiscoveryCache {
  timestamp: number;
  models: ProviderModel[];
}

const cache = new Map<string, DiscoveryCache>();
const CACHE_TTL = 3600_000; // 1 hour

const NON_CHAT_KEYWORDS = ['embed', 'tts', 'whisper', 'transcribe', 'voxtral', 'moderation', 'dall-e', 'stable-diffusion'];

function isChatModel(id: string): boolean {
  const lower = id.toLowerCase();
  return !NON_CHAT_KEYWORDS.some(k => lower.includes(k));
}

function getApiKey(provider: string): string | null {
  const info = PROVIDERS[provider];
  if (!info) return null;
  if (!info.apiKeyEnv) return null; // local providers
  const key = process.env[info.apiKeyEnv];
  return key && key.trim() ? key : null;
}

async function fetchJson(url: string, apiKey: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function discoverMistral(): Promise<ProviderModel[]> {
  const key = getApiKey('mistral');
  if (!key) return [];
  const json = await fetchJson('https://api.mistral.ai/v1/models', key);
  return (json.data || []).map((m: any) => ({ id: m.id, created: m.created }));
}

async function discoverOpenRouter(): Promise<ProviderModel[]> {
  const key = getApiKey('openrouter');
  if (!key) return [];
  const json = await fetchJson('https://openrouter.ai/api/v1/models', key);
  return (json.data || []).map((m: any) => ({ id: m.id, created: m.created }));
}

async function discoverGroq(): Promise<ProviderModel[]> {
  const key = getApiKey('groq');
  if (!key) return [];
  const json = await fetchJson('https://api.groq.com/openai/v1/models', key);
  return (json.data || []).map((m: any) => ({ id: m.id, created: m.created }));
}

async function discoverGoogle(): Promise<ProviderModel[]> {
  const key = getApiKey('google');
  if (!key) return [];
  const json = await fetchJson(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`, 'unused');
  return (json.models || []).map((m: any) => ({ id: m.name.replace('models/', ''), created: undefined }));
}

async function discoverXai(): Promise<ProviderModel[]> {
  const key = getApiKey('xai');
  if (!key) return [];
  const json = await fetchJson('https://api.x.ai/v1/models', key);
  return (json.data || []).map((m: any) => ({ id: m.id, created: m.created }));
}

async function discoverCohere(): Promise<ProviderModel[]> {
  const key = getApiKey('cohere');
  if (!key) return [];
  const json = await fetchJson('https://api.cohere.com/v2/models', key);
  return (json.models || []).map((m: any) => ({ id: m.id, created: undefined }));
}

const DISCOVERERS: Record<string, () => Promise<ProviderModel[]>> = {
  mistral: discoverMistral,
  openrouter: discoverOpenRouter,
  groq: discoverGroq,
  google: discoverGoogle,
  xai: discoverXai,
  cohere: discoverCohere,
};

export async function discoverProviderModels(provider: string): Promise<ProviderModel[]> {
  const now = Date.now();
  const cached = cache.get(provider);
  if (cached && now - cached.timestamp < CACHE_TTL) return cached.models;

  const discoverer = DISCOVERERS[provider];
  if (!discoverer) return [];

  try {
    const models = await discoverer();
    const filtered = models.filter(m => isChatModel(m.id));
    cache.set(provider, { timestamp: now, models: filtered });
    return filtered;
  } catch {
    return [];
  }
}

export async function discoverAllProviders(): Promise<Record<string, ProviderModel[]>> {
  const result: Record<string, ProviderModel[]> = {};
  for (const provider of Object.keys(DISCOVERERS)) {
    result[provider] = await discoverProviderModels(provider);
  }
  return result;
}

function modelRank(id: string): number {
  const lower = id.toLowerCase();
  if (lower.includes('large') || lower.includes('premium')) return 5;
  if (lower.includes('medium') || lower.includes('flash') || lower.includes('scout')) return 4;
  if (lower.includes('small') || lower.includes('sonar') || lower.includes('haiku')) return 3;
  if (lower.includes('nano') || lower.includes('tiny')) return 1;
  return 2;
}

export function pickBestModel(models: ProviderModel[], preferredKeywords: string[] = []): string | null {
  if (models.length === 0) return null;

  const scored = models.map(m => {
    let score = modelRank(m.id);
    if (preferredKeywords.some(k => m.id.toLowerCase().includes(k))) score += 2;
    return { ...m, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.created || 0) - (a.created || 0);
  });

  return scored[0].id;
}

const PROVDIER_BEST_KEYWORDS: Record<string, string[]> = {
  mistral: ['large'],
  openrouter: ['large', 'opus', 'premium', 'thinking'],
  groq: ['scout', 'large', 'versatile'],
  google: ['flash', 'pro'],
  xai: ['grok'],
  cohere: ['command', 'north'],
};

export let bestModels: Record<string, string> = {};

export async function runDiscovery(): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  const all = await discoverAllProviders();
  for (const [provider, models] of Object.entries(all)) {
    if (models.length === 0) continue;
    const keywords = PROVDIER_BEST_KEYWORDS[provider] || [];
    const best = pickBestModel(models, keywords);
    if (best) results[provider] = best;
  }
  bestModels = results;
  return results;
}

export function clearCache(): void {
  cache.clear();
}
