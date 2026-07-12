import * as path from 'path';
import * as fsp from 'fs/promises';
import * as fs from 'fs';
import { PlanManager, PlanStep } from './PlanManager';

export interface ProjectData {
  id: string;
  title: string;
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
          this.projects.set(id, data);
        } catch { /* skip corrupt */ }
      }
    } catch { /* no dir yet */ }
  }

  async create(planManager: PlanManager, title: string, description: string, sessionId: string): Promise<ProjectData> {
    await ensureDir();
    const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const data: ProjectData = {
      id,
      title,
      description,
      createdAt: now,
      updatedAt: now,
      status: 'active',
      planSteps: [...planManager.getSteps()],
      sessionIds: [sessionId],
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
    if (!p.sessionIds.includes(sessionId)) {
      p.sessionIds.push(sessionId);
      p.updatedAt = new Date().toISOString();
      await this._save(id);
    }
  }

  /** Clear all in-memory projects (for testing). */
  clear(): void {
    this.projects.clear();
  }

  async delete(id: string): Promise<void> {
    this.projects.delete(id);
    try { await fsp.unlink(projectFilePath(id)); } catch { /* ok */ }
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
    return {
      id: p.id,
      title: p.title,
      status: p.status,
      progress,
      steps,
      done,
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
    await fsp.writeFile(projectFilePath(id), JSON.stringify(p, null, 2), 'utf-8');
  }
}

export const projectManager = new ProjectManager();
