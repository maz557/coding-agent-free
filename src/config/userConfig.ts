import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

export interface UserConfig {
  localTimeoutMs: number;
  cloudTimeoutMs: number;
}

const DEFAULT_CONFIG: UserConfig = {
  localTimeoutMs: 600000,
  cloudTimeoutMs: 120000,
};

let cached: UserConfig | null = null;

function loadRaw(): Partial<UserConfig> {
  const configPath = resolve(process.cwd(), '.coding-agent.json');
  if (!existsSync(configPath)) return {};
  try {
    const raw = readFileSync(configPath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function getUserConfig(): UserConfig {
  if (cached) return cached;
  const raw = loadRaw();
  cached = {
    localTimeoutMs: raw.localTimeoutMs ?? DEFAULT_CONFIG.localTimeoutMs,
    cloudTimeoutMs: raw.cloudTimeoutMs ?? DEFAULT_CONFIG.cloudTimeoutMs,
  };
  return cached;
}

export function clearUserConfigCache(): void {
  cached = null;
}
