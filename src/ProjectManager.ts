import * as path from 'path';
import * as fsp from 'fs/promises';
import * as fs from 'fs';
import { PlanManager, PlanStep } from './PlanManager';

/** Generate a PRD (Product Requirements Document) from project metadata */
function generatePRD(title: string, description: string, planSteps: readonly PlanStep[]): string {
  const reqs = planSteps.map((s, i) => `${i + 1}. **${s.description}**`).join('\n');
  const now = new Date().toISOString().slice(0, 10);
  return `# Product Requirements Document — ${title}

**Date:** ${now}
**Status:** Draft (review and approve before implementation)

## 1. Purpose
${description || 'No description provided.'}

## 2. Target Users
(Define who will use this project and their primary goals.)

## 3. Core Requirements
${reqs || '*(To be defined)*'}

## 4. Success Criteria
- All core requirements implemented and verified.
- Code passes LSP diagnostics (no errors).
- Tests pass (if applicable).

---
*This document serves as the reference specification for the project. Update it as requirements evolve.*
`;
}

/** Generate a Technical Design Document */
function generateTechDesign(title: string, planSteps: readonly PlanStep[]): string {
  const files = planSteps
    .filter(s => /file|create|write|implement/i.test(s.description))
    .map((s, i) => `${i + 1}. \`${s.description}\``)
    .join('\n');
  return `# Technical Design — ${title}

**Date:** ${new Date().toISOString().slice(0, 10)}
**Status:** Draft

## 1. Architecture Overview
(Describe the high-level architecture, components, and how they interact.)

## 2. File Structure
${files || '*(To be defined during implementation)*'}

## 3. Data Flow
(Describe how data moves through the system — inputs, processing, outputs.)

## 4. Key Technical Decisions
(List important technology choices, libraries, patterns, and rationale.)

## 5. Dependencies
(List external libraries, services, or APIs required.)

---
*Update this document as the design evolves during implementation.*
`;
}

/** Generate an API Specification */
function generateAPISpec(title: string, planSteps: readonly PlanStep[]): string {
  const endpoints = planSteps
    .filter(s => /api|endpoint|route|function|method/i.test(s.description))
    .map((s, i) => `- \`${s.description}\``)
    .join('\n');
  return `# API Specification — ${title}

**Date:** ${new Date().toISOString().slice(0, 10)}
**Status:** Draft

## 1. Endpoints / Functions
${endpoints || '*(To be defined during implementation)*'}

## 2. Input / Output Formats
(Specify request/response structures, parameters, and types.)

## 3. Error Handling
(Describe error codes, messages, and recovery strategies.)

---
*Keep this document in sync with the actual implementation.*
`;
}

/** Generate a Test Plan */
function generateTestPlan(title: string, planSteps: readonly PlanStep[]): string {
  const cases = planSteps.map((s, i) =>
    `- **TC-${i + 1}:** Verify "${s.description}"`
  ).join('\n');
  return `# Test Plan — ${title}

**Date:** ${new Date().toISOString().slice(0, 10)}
**Status:** Draft

## 1. Test Strategy
(Describe the testing approach — unit tests, integration tests, manual verification.)

## 2. Test Cases
${cases || '*(To be defined)*'}

## 3. Expected Results
- All test cases pass.
- Edge cases handled (empty inputs, errors, boundary conditions).
- Performance within acceptable limits (if applicable).

---
*Update this plan as new test cases are identified.*
`;
}

export const DOC_FILES = ['prd.md', 'tech_design.md', 'api_spec.md', 'test_plan.md'] as const;
export type DocType = typeof DOC_FILES[number];


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
    const projectDir = projectDirPath(dirName);
    await fsp.mkdir(projectDir, { recursive: true });
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
    // Generate project documentation
    await this.generateDocs(id, title, description, planManager.getSteps());
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

  /** Generate all 4 doc files in the project's docs/ directory */
  async generateDocs(id: string, title: string, description: string, planSteps: readonly PlanStep[]): Promise<{ [key: string]: string }> {
    const docsDir = this.getDocsDir(id);
    if (!docsDir) return {};
    await fsp.mkdir(docsDir, { recursive: true });
    const docs: { [key: string]: string } = {
      'prd.md': generatePRD(title, description, planSteps),
      'tech_design.md': generateTechDesign(title, planSteps),
      'api_spec.md': generateAPISpec(title, planSteps),
      'test_plan.md': generateTestPlan(title, planSteps),
    };
    for (const [file, content] of Object.entries(docs)) {
      await atomicWrite(path.join(docsDir, file), content);
    }
    await this.touch(id);
    return docs;
  }

  /** Get the docs directory path for a project */
  getDocsDir(id: string): string | null {
    const dir = this.getDir(id);
    if (!dir) return null;
    return path.join(dir, 'docs');
  }

  /** Read a specific doc file */
  async readDoc(id: string, docFile: string): Promise<string | null> {
    const docsDir = this.getDocsDir(id);
    if (!docsDir) return null;
    const filePath = path.join(docsDir, docFile);
    try {
      return await fsp.readFile(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  /** List all doc files in the project */
  async listDocs(id: string): Promise<string[]> {
    const docsDir = this.getDocsDir(id);
    if (!docsDir) return [];
    try {
      return (await fsp.readdir(docsDir)).filter(f => f.endsWith('.md')).sort();
    } catch {
      return [];
    }
  }

  /** Get content of all docs as a single string (for injection) */
  async getAllDocsContent(id: string): Promise<string | null> {
    const docsDir = this.getDocsDir(id);
    if (!docsDir) return null;
    const files = DOC_FILES.filter(f => {
      try { return fs.existsSync(path.join(docsDir, f)); } catch { return false; }
    });
    if (files.length === 0) return null;
    const parts: string[] = [];
    for (const f of files) {
      const content = await this.readDoc(id, f);
      if (content) {
        parts.push(`## ${f}\n${content}`);
      }
    }
    return parts.length > 0 ? parts.join('\n\n---\n\n') : null;
  }

  /** Verify project implementation against spec docs and plan */
  async verifyAgainstSpec(id: string): Promise<string> {
    const p = this.projects.get(id);
    if (!p) return `⚠️ Project "${id}" not found.`;

    const lines: string[] = [];
    lines.push(`# Spec Verification Report — ${p.title}`);
    lines.push(`**Status:** ${p.status}`);
    lines.push(`**Files:** ${await this.listFiles(id).then(f => f.join(', ')) || '(none)'}`);
    lines.push('');

    // Plan step status
    lines.push('## Plan Steps');
    for (const step of p.planSteps) {
      const icon = step.status === 'completed' ? '✅' : step.status === 'in_progress' ? '🔄' : '⬜';
      lines.push(`${icon} [${step.status}] ${step.description}`);
    }
    lines.push('');

    // Check if spec docs exist
    const docsDir = this.getDocsDir(id);
    let docsExist = false;
    if (docsDir) {
      try {
        const docFiles = await fsp.readdir(docsDir);
        docsExist = docFiles.length > 0;
        lines.push(`## Specification Documents (${docFiles.length} file(s))`);
        for (const f of docFiles.sort()) {
          lines.push(`- \`docs/${f}\``);
        }
      } catch {
        lines.push('## Specification Documents\n_(none)_');
      }
    }
    lines.push('');

    // Summary
    const total = p.planSteps.length;
    const done = p.planSteps.filter(s => s.status === 'completed').length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    lines.push(`## Summary\n- **Progress:** ${done}/${total} steps (${pct}%)`);
    lines.push(`- **Docs present:** ${docsExist ? '✅ Yes' : '❌ No'}`);
    lines.push(pct === 100 && docsExist
      ? '\n✅ **All requirements met. Project is complete.**'
      : `\n⚠️ **${total - done} step(s) remaining or docs missing.** Review and complete before closing.`);

    return lines.join('\n');
  }

  private async touch(id: string): Promise<void> {
    const p = this.projects.get(id);
    if (!p) return;
    p.updatedAt = new Date().toISOString();
    await this._save(id);
  }

  private async _save(id: string): Promise<void> {
    const p = this.projects.get(id);
    if (!p) return;
    await ensureDir();
    await atomicWrite(projectFilePath(id), JSON.stringify(p, null, 2));
  }
}

export const projectManager = new ProjectManager();
