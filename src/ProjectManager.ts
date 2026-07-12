import * as path from 'path';
import * as fsp from 'fs/promises';
import * as fs from 'fs';
import { PlanManager, PlanStep } from './PlanManager';

/** Atomic file write: write to .tmp then rename (atomic on same filesystem) */
async function atomicWrite(filePath: string, data: string): Promise<void> {
  const tmpPath = filePath + '.tmp.' + process.pid;
  await fsp.writeFile(tmpPath, data, 'utf-8');
  await fsp.rename(tmpPath, filePath);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled';
}

export interface ProjectData {
  id: string;
  title: string;
  directory: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  planSteps: PlanStep[];
  sessionIds: string[];
}

const DEFAULT_PROJECTS_DIR = path.join(process.cwd(), 'projects');

function projectsDir(): string {
  return process.env.PROJECTS_DIR || DEFAULT_PROJECTS_DIR;
}

async function ensureDir(): Promise<void> {
  try { await fsp.mkdir(projectsDir(), { recursive: true }); } catch { /* exists */ }
}

function projectFilePath(id: string): string {
  return path.join(projectsDir(), `${id}.json`);
}

function projectDirPath(dirName: string): string {
  return path.join(projectsDir(), dirName);
}

async function getNextNumber(): Promise<number> {
  await ensureDir();
  let max = 0;
  try {
    const entries = await fsp.readdir(projectsDir(), { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory() && /^\d+$/.test(e.name)) {
        const n = parseInt(e.name, 10);
        if (n > max) max = n;
      }
    }
  } catch { /* empty dir */ }
  return max + 1;
}

export class ProjectManager {
  private projects = new Map<string, ProjectData>();

  async loadAll(): Promise<void> {
    await ensureDir();
    this.projects.clear();
    try {
      const entries = await fsp.readdir(projectsDir());
      for (const entry of entries) {
        if (!entry.endsWith('.json')) continue;
        const id = entry.slice(0, -5);
        try {
          const raw = await fsp.readFile(projectFilePath(id), 'utf-8');
          const data: ProjectData = JSON.parse(raw);
          if (!data.directory) {
            data.directory = slugify(data.title || id);
          }
          data.sessionIds = (data.sessionIds || []).filter(s => s);
          this.projects.set(id, data);
        } catch { /* skip corrupt */ }
      }
    } catch { /* no dir yet */ }
  }

  async create(planManager: PlanManager, title: string, description: string, sessionId: string): Promise<ProjectData> {
    await ensureDir();
    const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const num = await getNextNumber();
    const dirName = String(num);
    await fsp.mkdir(projectDirPath(dirName), { recursive: true });
    const now = new Date().toISOString();
    const data: ProjectData = {
      id,
      title,
      directory: dirName,
      description,
      createdAt: now,
      updatedAt: now,
      status: 'active',
      planSteps: [...planManager.getSteps()],
      sessionIds: sessionId ? [sessionId] : [],
    };
    this.projects.set(id, data);
    await this._save(id);
    return data;
  }

  async updatePlan(id: string, planManager: PlanManager): Promise<void> {
    const p = this.projects.get(id);
    if (!p) throw new Error(`Project "${id}" not found`);
    p.planSteps = [...planManager.getSteps()];
    p.updatedAt = new Date().toISOString();
    await this._save(id);
  }

  async setStatus(id: string, status: ProjectData['status']): Promise<void> {
    const p = this.projects.get(id);
    if (!p) throw new Error(`Project "${id}" not found`);
    p.status = status;
    p.updatedAt = new Date().toISOString();
    await this._save(id);
  }

  async addSession(id: string, sessionId: string): Promise<void> {
    const p = this.projects.get(id);
    if (!p) throw new Error(`Project "${id}" not found`);
    if (!sessionId) return;
    if (!p.sessionIds.includes(sessionId)) {
      p.sessionIds.push(sessionId);
      p.updatedAt = new Date().toISOString();
      await this._save(id);
    }
  }

  async removeSession(id: string, sessionId: string): Promise<void> {
    const p = this.projects.get(id);
    if (!p) return;
    const idx = p.sessionIds.indexOf(sessionId);
    if (idx === -1) return;
    p.sessionIds.splice(idx, 1);
    p.updatedAt = new Date().toISOString();
    await this._save(id);
  }

  clear(): void {
    this.projects.clear();
  }

  getDir(id: string): string | null {
    const p = this.projects.get(id);
    if (!p || !p.directory) return null;
    return projectDirPath(p.directory);
  }

  async listFiles(id: string): Promise<string[]> {
    const dir = this.getDir(id);
    if (!dir) return [];
    try {
      const entries = await fsp.readdir(dir, { withFileTypes: true });
      const result: string[] = [];
      for (const e of entries) {
        if (e.isFile()) result.push(e.name);
      }
      return result.sort();
    } catch {
      return [];
    }
  }

  async delete(id: string): Promise<void> {
    const p = this.projects.get(id);
    this.projects.delete(id);
    try { await fsp.unlink(projectFilePath(id)); } catch { /* ok */ }
    if (p?.directory) {
      try { await fsp.rm(projectDirPath(p.directory), { recursive: true, force: true }); } catch { /* ok */ }
    }
  }

  get(id: string): ProjectData | undefined {
    return this.projects.get(id);
  }

  getAll(): ProjectData[] {
    return Array.from(this.projects.values()).sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  findForSession(sessionId: string): ProjectData | undefined {
    return this.getAll().find(p => p.sessionIds.includes(sessionId));
  }

  restorePlan(id: string, planManager: PlanManager): void {
    const p = this.projects.get(id);
    if (p && p.planSteps.length > 0) {
      planManager.fromJSON({ steps: p.planSteps });
    }
  }

  toSummary(id: string): object | null {
    const p = this.projects.get(id);
    if (!p) return null;
    const steps = p.planSteps.length;
    const done = p.planSteps.filter(s => s.status === 'completed').length;
    const progress = steps > 0 ? Math.round((done / steps) * 100) : 0;
    let fileCount = 0;
    const dir = p.directory ? projectDirPath(p.directory) : null;
    if (dir && fs.existsSync(dir)) {
      try { fileCount = fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isFile()).length; } catch { /* ok */ }
    }
    return {
      id: p.id,
      title: p.title,
      directory: p.directory,
      status: p.status,
      progress,
      steps,
      done,
      files: fileCount,
      sessions: p.sessionIds.length,
      updatedAt: p.updatedAt,
    };
  }

  listSummaries(): object[] {
    return this.getAll().map(p => this.toSummary(p.id)).filter((s): s is object => s !== null);
  }

  private async _save(id: string): Promise<void> {
    const p = this.projects.get(id);
    if (!p) return;
    await ensureDir();
    await atomicWrite(projectFilePath(id), JSON.stringify(p, null, 2));
  }
}

export const projectManager = new ProjectManager();
