import * as fs from 'fs';
import * as path from 'path';

const CANDIDATE_FILES = ['AGENTS.md', '.coding-agent.md'];

export function loadProjectContext(cwd?: string): string | null {
  const startDir = cwd || process.cwd();

  let current = path.resolve(startDir);
  for (let depth = 0; depth < 3; depth++) {
    for (const name of CANDIDATE_FILES) {
      const fp = path.join(current, name);
      if (fs.existsSync(fp)) {
        const content = fs.readFileSync(fp, 'utf-8').trim();
        if (!content) return null;
        return `## Project Context (from ${name})\n\n${content}`;
      }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return null;
}
