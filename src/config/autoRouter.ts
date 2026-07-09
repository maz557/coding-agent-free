import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { ModelPreset, FIXED_PRESETS, PROVIDERS, CodingQuality } from './models';

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
      { provider: 'google', model: 'gemini-2.0-flash', quality: 'premium' },
      { provider: 'openrouter', model: 'qwen/qwen3-next-80b-a3b-instruct:free', quality: 'premium' },
      { provider: 'openrouter', model: 'nvidia/nemotron-3-ultra-550b-a55b:free', quality: 'premium' },
      { provider: 'openrouter', model: 'openai/gpt-oss-120b:free', quality: 'high' },
      { provider: 'openrouter', model: 'nvidia/nemotron-3-super-120b-a12b:free', quality: 'high' },
      { provider: 'ollama', model: 'ornith-1.0-9b-Q4_K_M', quality: 'medium' },
    ],
    minQuality: 'high',
    label: 'Auto (Coding)',
  },
  fast: {
    entries: [
      { provider: 'openrouter', model: 'openrouter/free', quality: 'medium' },
      { provider: 'google', model: 'gemini-2.0-flash', quality: 'premium' },
      { provider: 'openrouter', model: 'openai/gpt-oss-120b:free', quality: 'high' },
      { provider: 'openrouter', model: 'qwen/qwen3-next-80b-a3b-instruct:free', quality: 'premium' },
    ],
    minQuality: 'medium',
    label: 'Auto (Fast)',
  },
  cheap: {
    entries: [
      { provider: 'openrouter', model: 'openrouter/free', quality: 'medium' },
      { provider: 'openrouter', model: 'qwen/qwen3-next-80b-a3b-instruct:free', quality: 'premium' },
      { provider: 'google', model: 'gemini-2.0-flash', quality: 'premium' },
      { provider: 'openrouter', model: 'openai/gpt-oss-120b:free', quality: 'high' },
    ],
    minQuality: 'medium',
    label: 'Auto (Cheap)',
  },
  reasoning: {
    entries: [
      { provider: 'openrouter', model: 'nvidia/nemotron-3-ultra-550b-a55b:free', quality: 'premium' },
      { provider: 'openrouter', model: 'nvidia/nemotron-3-super-120b-a12b:free', quality: 'high' },
      { provider: 'openrouter', model: 'qwen/qwen3-next-80b-a3b-instruct:free', quality: 'premium' },
      { provider: 'ollama', model: 'ornith-1.0-9b-Q4_K_M', quality: 'medium' },
    ],
    minQuality: 'high',
    label: 'Auto (Reasoning)',
  },
  vision: {
    entries: [
      { provider: 'openrouter', model: 'nvidia/nemotron-3-super-120b-a12b:free', quality: 'high' },
      { provider: 'openrouter', model: 'openrouter/free', quality: 'medium' },
    ],
    minQuality: 'medium',
    label: 'Auto (Vision)',
  },
  offline: {
    entries: [
      { provider: 'ollama', model: 'ornith-1.0-9b-Q4_K_M', quality: 'medium' },
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
  return { provider, model };
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
    return { preset: { provider: entry.provider, primary: entry.model, fallbacks: [] } };
  }

  if (isProviderAvailable('ollama')) {
    return { preset: null, suggestion: 'No high-quality cloud model available. Use your local model: /model auto/offline (ornith-1.0-9b via Ollama). Or try /model auto/fast if you prefer a cloud model with lower quality.' };
  }

  return { preset: null, suggestion: 'No provider configured. Set OPENROUTER_API_KEY or GOOGLE_API_KEY in .env, or run a local model: ollama pull ornith-1.0-9b-Q4_K_M && /model auto/offline' };
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
