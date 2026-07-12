import { describe, it, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import * as fsp from 'fs/promises';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectManager } from '../ProjectManager';
import { PlanManager } from '../PlanManager';

const TEST_DIR = path.join(process.cwd(), 'projects_test');

describe('ProjectManager', () => {
  let pm: ProjectManager;

  before(() => {
    process.env.NODE_ENV = 'test';
  });

  afterEach(async () => {
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
});
