import * as fs from 'fs';
import * as path from 'path';
import { MCPServerDefinition } from './MCPManager';

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

export function loadMCPConfig(): Record<string, MCPServerDefinition> {
  const configPath = findProjectRoot(process.cwd()) || getDefaultConfigPath();

  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed.mcpServers || {};
  } catch {
    return {};
  }
}
