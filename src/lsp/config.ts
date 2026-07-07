import * as fs from 'fs';
import * as path from 'path';
import { LSPServerConfig } from './LSPManager';

const CONFIG_FILENAME = '.coding-agent.json';

function findProjectRoot(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 20; i++) {
    if (fs.existsSync(path.join(dir, CONFIG_FILENAME))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

function getDefaultConfigPath(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(home, CONFIG_FILENAME);
}

export function loadLSPConfig(): LSPServerConfig[] {
  const configDir = findProjectRoot(process.cwd()) || getDefaultConfigPath();
  const configPath = configDir.endsWith(CONFIG_FILENAME) ? configDir : path.join(configDir, CONFIG_FILENAME);
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    const servers = parsed.lspServers;
    if (!Array.isArray(servers)) return [];

    return servers.filter((s: any) =>
      s && typeof s.command === 'string' && Array.isArray(s.args) &&
      typeof s.languageId === 'string' && Array.isArray(s.filePatterns)
    ) as LSPServerConfig[];
  } catch {
    return [];
  }
}
