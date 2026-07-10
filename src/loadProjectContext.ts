import * as fs from 'fs';
import * as path from 'path';

const CANDIDATE_FILES = ['AGENTS.md', '.coding-agent.md'];

export function loadProjectContext(cwd?: string): string | null {
  const startDir = cwd || process.cwd();

  let current = path.resolve(startDir);
  for (let depth = 0; depth < 4; depth++) {
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

const CONFIG_FILES = ['package.json', 'tsconfig.json', 'pyproject.toml', 'Cargo.toml', 'composer.json', 'Gemfile', 'go.mod', 'CMakeLists.txt', 'Makefile'];
const ENTRY_POINTS = ['src/index.ts', 'src/main.ts', 'src/index.js', 'src/main.js', 'main.py', 'index.ts', 'index.js'];
const SRC_DIRS = ['src', 'lib', 'app', 'packages'];

interface ProjectStructure {
  configFiles: { name: string; content: string }[];
  dirs: string[];
  entryPoints: string[];
  testDirs: string[];
}

function scanStructure(root: string): ProjectStructure {
  const structure: ProjectStructure = { configFiles: [], dirs: [], entryPoints: [], testDirs: [] };

  if (!fs.existsSync(root)) return structure;

  for (const name of CONFIG_FILES) {
    const fp = path.join(root, name);
    if (fs.existsSync(fp)) {
      let content = '';
      try {
        if (name === 'package.json') {
          const pkg = JSON.parse(fs.readFileSync(fp, 'utf-8'));
          const summary: Record<string, string> = {};
          if (pkg.name) summary.name = pkg.name;
          if (pkg.version) summary.version = pkg.version;
          if (pkg.scripts) summary.scripts = Object.keys(pkg.scripts).join(', ');
          if (pkg.dependencies) summary.dependencies = Object.keys(pkg.dependencies).join(', ');
          if (pkg.devDependencies) summary.devDependencies = Object.keys(pkg.devDependencies).join(', ');
          if (pkg.type) summary.type = pkg.type;
          content = Object.entries(summary).map(([k, v]) => `  ${k}: ${v}`).join('\n');
        } else {
          const raw = fs.readFileSync(fp, 'utf-8').trim();
          content = raw.length > 500 ? raw.slice(0, 500) + '\n  ... (truncated)' : raw;
        }
      } catch {
        content = '(unreadable)';
      }
      structure.configFiles.push({ name, content });
    }
  }

  for (const name of SRC_DIRS) {
    const fp = path.join(root, name);
    if (fs.existsSync(fp) && fs.statSync(fp).isDirectory()) {
      structure.dirs.push(name);
    }
  }

  for (const ep of ENTRY_POINTS) {
    const fp = path.join(root, ep);
    if (fs.existsSync(fp)) {
      structure.entryPoints.push(ep);
    }
  }

  for (const dir of ['tests', '__tests__', 'test', 'spec']) {
    const fp = path.join(root, dir);
    if (fs.existsSync(fp) && fs.statSync(fp).isDirectory()) {
      structure.testDirs.push(dir);
    }
  }

  return structure;
}

export function generateProjectMap(root?: string): string | null {
  const projectRoot = root || process.cwd();
  const structure = scanStructure(projectRoot);

  const parts: string[] = [];
  parts.push(`## Project Map (${path.basename(projectRoot)})`);

  if (structure.configFiles.length > 0) {
    parts.push('\n### Config Files');
    for (const cf of structure.configFiles) {
      parts.push(`\n**${cf.name}:**\n${cf.content}`);
    }
  }

  if (structure.dirs.length > 0) {
    parts.push(`\n### Source Directories\n${structure.dirs.join(', ')}`);
  }

  if (structure.entryPoints.length > 0) {
    parts.push(`\n### Entry Points\n${structure.entryPoints.join(', ')}`);
  }

  if (structure.testDirs.length > 0) {
    parts.push(`\n### Test Directories\n${structure.testDirs.join(', ')}`);
  }

  if (parts.length === 1) return null; // nothing found
  return parts.join('\n');
}
