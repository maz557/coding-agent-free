import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { ModelPreset, FIXED_PRESETS, PROVIDERS, CodingQuality } from './models';
import { bestModels } from './modelDiscovery';

export type RouteType = 'coding' | 'fast' | 'cheap' | 'reasoning' | 'vision' | 'offline';

export type RouteEntry = { provider: string; model: string; quality?: CodingQuality };

interface RouteConfig {
  entries: RouteEntry[];
  minQuality: CodingQuality;
  label: string;
}

const DEFAULT_ROUTES: Record<RouteType, RouteConfig> = {
  coding: {
    entries: [
      { provider: 'mistral', model: 'mistral-medium-2604', quality: 'premium' },
      { provider: 'google', model: 'gemini-2.0-flash', quality: 'premium' },
      { provider: 'groq', model: 'llama-3.1-70b-versatile', quality: 'high' },
      { provider: 'openrouter', model: 'openai/gpt-oss-120b:free', quality: 'high' },
      { provider: 'xai', model: 'grok-beta', quality: 'high' },
      { provider: 'llamacpp', model: 'ornith-agent', quality: 'medium' },
    ],
    minQuality: 'high',
    label: 'Auto (Coding)',
  },
  fast: {
    entries: [
      { provider: 'google', model: 'gemini-2.0-flash', quality: 'premium' },
      { provider: 'groq', model: 'llama-3.1-70b-versatile', quality: 'high' },
      { provider: 'openrouter', model: 'openrouter/free', quality: 'medium' },
      { provider: 'xai', model: 'grok-beta', quality: 'high' },
      { provider: 'mistral', model: 'mistral-medium-2604', quality: 'premium' },
    ],
    minQuality: 'medium',
    label: 'Auto (Fast)',
  },
  cheap: {
    entries: [
      { provider: 'google', model: 'gemini-2.0-flash', quality: 'premium' },
      { provider: 'openrouter', model: 'openrouter/free', quality: 'medium' },
      { provider: 'groq', model: 'llama-3.1-70b-versatile', quality: 'high' },
      { provider: 'xai', model: 'grok-beta', quality: 'high' },
    ],
    minQuality: 'medium',
    label: 'Auto (Cheap)',
  },
  reasoning: {
    entries: [
      { provider: 'mistral', model: 'mistral-medium-2604', quality: 'premium' },
      { provider: 'xai', model: 'grok-beta', quality: 'high' },
      { provider: 'groq', model: 'llama-3.1-70b-versatile', quality: 'high' },
      { provider: 'openrouter', model: 'openai/gpt-oss-120b:free', quality: 'high' },
      { provider: 'llamacpp', model: 'ornith-agent', quality: 'medium' },
    ],
    minQuality: 'high',
    label: 'Auto (Reasoning)',
  },
  vision: {
    entries: [
      { provider: 'google', model: 'gemini-2.0-flash', quality: 'premium' },
      { provider: 'openrouter', model: 'openai/gpt-oss-120b:free', quality: 'high' },
    ],
    minQuality: 'medium',
    label: 'Auto (Vision)',
  },
  offline: {
    entries: [
      { provider: 'llamacpp', model: 'ornith-agent', quality: 'medium' },
    ],
    minQuality: 'low',
    label: 'Auto (Offline)',
  },
};

const ROUTE_LABELS: Record<string, string> = {
  'auto/coding': 'Auto (Coding)',
  'auto/fast': 'Auto (Fast)',
  'auto/cheap': 'Auto (Cheap)',
  'auto/reasoning': 'Auto (Reasoning)',
  'auto/vision': 'Auto (Vision)',
  'auto/offline': 'Auto (Offline)',
};

function findPresetQuality(provider: string, model: string): CodingQuality | undefined {
  for (const p of Object.values(FIXED_PRESETS)) {
    if (p.provider === provider && p.primary === model) return p.quality;
  }
  return undefined;
}

function parseModelRef(ref: string): { provider: string; model: string; quality?: CodingQuality } | null {
  const colon = ref.indexOf(':');
  if (colon < 0) return null;

  if (FIXED_PRESETS[ref]) {
    const p = FIXED_PRESETS[ref];
    return { provider: p.provider, model: p.primary, quality: p.quality };
  }

  const provider = ref.slice(0, colon);
  const model = ref.slice(colon + 1);
  if (!PROVIDERS[provider]) return null;
  const quality = findPresetQuality(provider, model) || 'medium';
  return { provider, model, quality };
}

function loadRouteConfig(): Record<RouteType, RouteConfig> {
  const configPath = resolve(process.cwd(), 'route-presets.json');
  if (!existsSync(configPath)) return DEFAULT_ROUTES;

  try {
    const raw = readFileSync(configPath, 'utf-8');
    const data = JSON.parse(raw);
    const merged = { ...DEFAULT_ROUTES };

    for (const [route, cfg] of Object.entries(data)) {
      const rt = route as RouteType;
      if (!merged[rt]) continue;
      if (!cfg || typeof cfg !== 'object') continue;

      const c = cfg as any;

      if (Array.isArray(c.presets)) {
        const entries: RouteEntry[] = [];
        for (const item of c.presets) {
          if (typeof item === 'string') {
            const entry = parseModelRef(item);
            if (entry) entries.push(entry);
          } else if (item && typeof item === 'object') {
            const obj = item as any;
            if (obj.provider && obj.model && PROVIDERS[obj.provider]) {
              entries.push({
                provider: obj.provider,
                model: obj.model,
                quality: obj.quality,
              });
            }
          }
        }
        if (entries.length > 0) merged[rt].entries = entries;
      }

      if (c.minQuality && ['premium', 'high', 'medium', 'low'].includes(c.minQuality)) {
        merged[rt].minQuality = c.minQuality;
      }
    }
    return merged;
  } catch {
    return DEFAULT_ROUTES;
  }
}

const ROUTE_CONFIG = loadRouteConfig();

function isProviderAvailable(provider: string): boolean {
  const info = PROVIDERS[provider];
  if (!info) return false;
  if (!info.apiKeyEnv) return true;
  return !!process.env[info.apiKeyEnv];
}

function qualityToRank(q?: CodingQuality): number {
  const ranks: Record<CodingQuality, number> = { premium: 4, high: 3, medium: 2, low: 1 };
  return ranks[q ?? 'low'];
}

export function resolveRoute(route: string): { preset: ModelPreset | null; suggestion?: string } {
  const routeType = route.replace('auto/', '') as RouteType;
  const config = ROUTE_CONFIG[routeType];
  if (!config) return { preset: null };

  const minRank = qualityToRank(config.minQuality);

  for (const entry of config.entries) {
    if (qualityToRank(entry.quality) < minRank) continue;
    if (!isProviderAvailable(entry.provider)) continue;
    const discovered = bestModels[entry.provider];
    const model = discovered || entry.model;
    return { preset: { provider: entry.provider, primary: model, fallbacks: [] } };
  }

  if (isProviderAvailable('llamacpp') || isProviderAvailable('ollama')) {
    const prov = isProviderAvailable('llamacpp') ? 'Llama.cpp (llamacpp)' : 'Ollama';
    return { preset: null, suggestion: `No high-quality cloud model available. Use your local model: /model auto/offline (ornith-agent via ${prov}). Or try /model auto/fast if you prefer a cloud model with lower quality.` };
  }

  return { preset: null, suggestion: 'No provider configured. Set OPENROUTER_API_KEY or GOOGLE_API_KEY in .env, or run a local model: llama-server -m your-model.gguf -c 65536 --port 8080 && /model auto/offline' };
}

export function getRouteLabel(route: string): string {
  return ROUTE_LABELS[route] || route;
}

export function isAutoRoute(modelId: string): boolean {
  return modelId.startsWith('auto/');
}

export function listAutoRoutes(): string[] {
  return Object.keys(ROUTE_CONFIG).map(r => `auto/${r}`);
}

export function getRouteMinQuality(route: string): CodingQuality | null {
  const routeType = route.replace('auto/', '') as RouteType;
  return ROUTE_CONFIG[routeType]?.minQuality ?? null;
}

export function getRouteEntries(route: string): RouteEntry[] | null {
  const routeType = route.replace('auto/', '') as RouteType;
  return ROUTE_CONFIG[routeType]?.entries ?? null;
}
