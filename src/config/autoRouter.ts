import { ModelPreset, FIXED_PRESETS } from './models';

export type RouteType = 'coding' | 'fast' | 'cheap' | 'reasoning' | 'vision' | 'offline';

const ROUTE_MODEL_MAP: Record<RouteType, string[]> = {
  coding:    ['2', '4', '3', '5', '1'],
  fast:      ['1', '4', '2'],
  cheap:     ['1', '2', '4'],
  reasoning: ['3', '5', '2', '1'],
  vision:    ['3', '1'],
  offline:   ['6', '7', '8'],
};

const ROUTE_LABELS: Record<string, string> = {
  'auto/coding': 'Auto (Coding)',
  'auto/fast': 'Auto (Fast)',
  'auto/cheap': 'Auto (Cheap)',
  'auto/reasoning': 'Auto (Reasoning)',
  'auto/vision': 'Auto (Vision)',
  'auto/offline': 'Auto (Offline)',
};

export function resolveRoute(route: string): ModelPreset | null {
  const routeType = route.replace('auto/', '') as RouteType;
  const keys = ROUTE_MODEL_MAP[routeType];
  if (!keys) return null;

  for (const key of keys) {
    const preset = FIXED_PRESETS[key];
    if (preset) return { ...preset };
  }
  return null;
}

export function getRouteLabel(route: string): string {
  return ROUTE_LABELS[route] || route;
}

export function isAutoRoute(modelId: string): boolean {
  return modelId.startsWith('auto/');
}

export function listAutoRoutes(): string[] {
  return Object.keys(ROUTE_MODEL_MAP).map(r => `auto/${r}`);
}
