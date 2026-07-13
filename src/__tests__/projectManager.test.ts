import { describe, it, afterEach, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fsp from 'fs/promises';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectManager } from '../ProjectManager';
import { PlanManager } from '../PlanManager';

const TEST_DIR = path.join(process.cwd(), 'projects_test');

describe('ProjectManager', () => {
  let pm: ProjectManager;
  const origProjectsDir = process.env.PROJECTS_DIR;

  before(() => {
    process.env.NODE_ENV = 'test';
    process.env.PROJECTS_DIR = TEST_DIR;
  });

  after(() => {
    if (origProjectsDir) process.env.PROJECTS_DIR = origProjectsDir;
    else delete process.env.PROJECTS_DIR;
  });

  afterEach(async () => {
    pm.clear();
    try { await fsp.rm(TEST_DIR, { recursive: true }); } catch { /* ok */ }
  });

  it('should create a project', async () => {
    pm = new ProjectManager();
    const planManager = new PlanManager();
    planManager.parsePlan('1. Read file\n2. Write code\n3. Test');
    const data = await pm.create(planManager, 'My Project', 'A test project', 'session_1');
    assert.equal(data.title, 'My Project');
    assert.equal(data.description, 'A test project');
    assert.equal(data.status, 'active');
    assert.equal(data.planSteps.length, 3);
    assert(data.sessionIds.includes('session_1'));
  });

  it('should load projects from disk', async () => {
    pm = new ProjectManager();
    const planManager = new PlanManager();
    planManager.parsePlan('1. Step A\n2. Step B');
    const data = await pm.create(planManager, 'Disk Test', '', 's1');

    pm = new ProjectManager(); // fresh instance
    await pm.loadAll();
    const loaded = pm.get(data.id);
    assert(loaded);
    assert.equal(loaded.title, 'Disk Test');
    assert.equal(loaded.planSteps.length, 2);
  });

  it('should update plan steps', async () => {
    pm = new ProjectManager();
    const planManager = new PlanManager();
    planManager.parsePlan('1. Step A');
    const data = await pm.create(planManager, 'Update Test', '', 's1');

    planManager.markCompleted(0);
    await pm.updatePlan(data.id, planManager);

    const loaded = pm.get(data.id)!;
    assert.equal(loaded.planSteps[0].status, 'completed');
  });

  it('should set project status', async () => {
    pm = new ProjectManager();
    const planManager = new PlanManager();
    planManager.parsePlan('1. Step');
    const data = await pm.create(planManager, 'Status Test', '', 's1');
    await pm.setStatus(data.id, 'completed');
    assert.equal(pm.get(data.id)?.status, 'completed');
  });

  it('should add sessions to project', async () => {
    pm = new ProjectManager();
    const planManager = new PlanManager();
    planManager.parsePlan('1. Step');
    const data = await pm.create(planManager, 'Session Test', '', 's1');
    await pm.addSession(data.id, 's2');
    assert(pm.get(data.id)?.sessionIds.includes('s2'));
  });

  it('should find project for session', async () => {
    pm = new ProjectManager();
    const planManager = new PlanManager();
    planManager.parsePlan('1. Step');
    const data = await pm.create(planManager, 'Find Test', '', 's1');
    const found = pm.findForSession('s1');
    assert(found);
    assert.equal(found.id, data.id);
  });

  it('should restore plan from project', async () => {
    pm = new ProjectManager();
    const planManager = new PlanManager();
    planManager.parsePlan('1. Read\n2. Write\n3. Test');
    planManager.markCompleted(0);
    planManager.markCompleted(2);
    const data = await pm.create(planManager, 'Restore Test', '', 's1');

    const pm2 = new PlanManager();
    pm.restorePlan(data.id, pm2);
    assert.equal(pm2.getSteps().length, 3);
    assert.equal(pm2.getSteps()[0].status, 'completed');
    assert.equal(pm2.getSteps()[1].status, 'pending');
  });

  it('should generate summary', async () => {
    pm = new ProjectManager();
    const planManager = new PlanManager();
    planManager.parsePlan('1. A\n2. B\n3. C\n4. D');
    planManager.markCompleted(0);
    planManager.markCompleted(2);
    const data = await pm.create(planManager, 'Summary Test', '', 's1');
    const summary = pm.toSummary(data.id);
    assert(summary);
    assert.equal((summary as any).progress, 50);
    assert.equal((summary as any).done, 2);
    assert.equal((summary as any).steps, 4);
  });

  it('should list all projects sorted by updatedAt', async () => {
    pm = new ProjectManager();
    const planManager = new PlanManager();
    const p1 = await pm.create(planManager, 'First', '', 's1');
    await pm.setStatus(p1.id, 'completed');
    await new Promise(r => setTimeout(r, 5)); // ensure distinct timestamps
    const p2 = await pm.create(planManager, 'Second', '', 's2');
    const list = pm.getAll();
    assert.equal(list.length, 2);
    assert.equal(list[0].id, p2.id); // most recent first
  });

  it('should delete a project', async () => {
    pm = new ProjectManager();
    const planManager = new PlanManager();
    const data = await pm.create(planManager, 'Delete Test', '', 's1');
    assert(pm.get(data.id));
    await pm.delete(data.id);
    assert(!pm.get(data.id));
  });

  it('should get empty list when no projects', () => {
    pm = new ProjectManager();
    assert.equal(pm.getAll().length, 0);
    assert.equal(pm.listSummaries().length, 0);
  });

  it('should filter empty sessionId on create', async () => {
    pm = new ProjectManager();
    const plan = new PlanManager();
    const data = await pm.create(plan, 'No Session', '', '');
    assert.equal(data.sessionIds.length, 0);
  });

  it('should not add empty sessionId via addSession', async () => {
    pm = new ProjectManager();
    const plan = new PlanManager();
    const data = await pm.create(plan, 'Add Empty', '', 's1');
    assert.equal(data.sessionIds.length, 1);
    await pm.addSession(data.id, '');
    const loaded = pm.get(data.id)!;
    assert.equal(loaded.sessionIds.length, 1);
    assert(loaded.sessionIds.includes('s1'));
  });

  it('should filter empty sessionIds on loadAll from disk', async () => {
    pm = new ProjectManager();
    const plan = new PlanManager();
    const data = await pm.create(plan, 'Disk Filter', '', 's1');
    // Manually inject empty sessionId into the saved file
    const filePath = path.join(TEST_DIR, `${data.id}.json`);
    const raw = JSON.parse(await fsp.readFile(filePath, 'utf-8'));
    raw.sessionIds.push('');
    await fsp.writeFile(filePath, JSON.stringify(raw, null, 2), 'utf-8');

    pm = new ProjectManager(); // fresh instance
    await pm.loadAll();
    const loaded = pm.get(data.id)!;
    assert.equal(loaded.sessionIds.length, 1);
    assert(loaded.sessionIds.includes('s1'));
    assert(!loaded.sessionIds.includes(''));
  });

  it('should generate docs/ directory with 4 files on create', async () => {
    pm = new ProjectManager();
    const planManager = new PlanManager();
    planManager.parsePlan('1. Build API endpoint\n2. Create database schema\n3. Write tests');
    const data = await pm.create(planManager, 'Doc Test', 'Test documentation generation', 's1');
    const docsDir = pm.getDocsDir(data.id);
    assert(docsDir);
    const exists = fs.existsSync(docsDir);
    assert(exists);
    const files = await fsp.readdir(docsDir!);
    assert(files.includes('prd.md'));
    assert(files.includes('tech_design.md'));
    assert(files.includes('api_spec.md'));
    assert(files.includes('test_plan.md'));
  });

  it('should read a specific doc file', async () => {
    pm = new ProjectManager();
    const planManager = new PlanManager();
    planManager.parsePlan('1. Step one');
    const data = await pm.create(planManager, 'Read Doc', '', 's1');
    const prd = await pm.readDoc(data.id, 'prd.md');
    assert(prd);
    assert(prd.includes('Product Requirements Document'));
    assert(prd.includes('Read Doc'));
    const missing = await pm.readDoc(data.id, 'nonexistent.md');
    assert.equal(missing, null);
  });

  it('should list doc files', async () => {
    pm = new ProjectManager();
    const planManager = new PlanManager();
    planManager.parsePlan('1. Step');
    const data = await pm.create(planManager, 'List Doc', '', 's1');
    const docs = await pm.listDocs(data.id);
    assert.equal(docs.length, 4);
    assert(docs.includes('prd.md'));
  });

  it('should getAllDocsContent return combined content', async () => {
    pm = new ProjectManager();
    const planManager = new PlanManager();
    planManager.parsePlan('1. Step');
    const data = await pm.create(planManager, 'All Docs', '', 's1');
    const content = await pm.getAllDocsContent(data.id);
    assert(content);
    assert(content.includes('prd.md'));
    assert(content.includes('tech_design.md'));
    assert(content.includes('api_spec.md'));
    assert(content.includes('test_plan.md'));
  });

  it('should verifyAgainstSpec report plan progress', async () => {
    pm = new ProjectManager();
    const planManager = new PlanManager();
    planManager.parsePlan('1. Setup\n2. Implement\n3. Test\n4. Deploy');
    planManager.markCompleted(0);
    planManager.markCompleted(2);
    const data = await pm.create(planManager, 'Verify Test', '', 's1');
    const report = await pm.verifyAgainstSpec(data.id);
    assert(report.includes('Verify Test'));
    assert(report.includes('✅'));
    assert(report.includes('[completed]'));
    assert(report.includes('[pending]'));
    assert(report.includes('50%'));
    assert(report.includes('prd.md'));
  });
});
