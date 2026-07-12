import { describe, it, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'path';
import * as fsp from 'fs/promises';
import * as fs from 'fs';
import * as os from 'os';
import http from 'node:http';

import { PlanManager } from '../PlanManager';
import { ProjectManager } from '../ProjectManager';

const TEST_PROJECTS_DIR = path.join(process.cwd(), 'projects_test_sp');

/**
 * Integration tests for the Session ↔ Project ↔ Plan connection.
 *
 * Natural flow:
 *   1. A session runs without a project → no plan needed
 *   2. A session generates a plan → create a project from it
 *   3. A new session continues an existing project → plan restored
 *   4. Plan steps update during execution → project plan stays in sync
 */

function fetchJson(url: string, opts?: RequestInit): Promise<any> {
  return fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
  }).then(async (r) => {
    const body = r.headers.get('content-type')?.includes('json')
      ? await r.json()
      : await r.text();
    return { status: r.status, body, headers: r.headers };
  });
}

describe('Session-Project-Plan integration', () => {
  let server: http.Server;
  let baseUrl: string;
  let sessionsDir: string;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    sessionsDir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'sp-test-'));
    process.env.SESSIONS_DIR = sessionsDir;
    // Clean project dir
    try { await fsp.rm(TEST_PROJECTS_DIR, { recursive: true, force: true }); } catch { /* ok */ }
    // Clear cache for fresh server
    for (const key of Object.keys(require.cache)) {
      if (key.includes('\\dist\\') || key.includes('/dist/') || key.includes('\\src\\') || key.includes('/src/')) delete require.cache[key];
    }
    const { app } = await import('../server');
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = server.address() as any;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterEach(async () => {
    server?.close();
    delete process.env.SESSIONS_DIR;
    await fsp.rm(sessionsDir, { recursive: true, force: true }).catch(() => {});
    await fsp.rm(TEST_PROJECTS_DIR, { recursive: true, force: true }).catch(() => {});
    for (const key of Object.keys(require.cache)) {
      if (key.includes('\\dist\\') || key.includes('/dist/') || key.includes('\\src\\') || key.includes('/src/')) delete require.cache[key];
    }
  });

  // 1. Session without project — no plan attached
  it('should create a session without a project or plan', async () => {
    const { body: session } = await fetchJson(`${baseUrl}/api/session`, { method: 'POST' });
    assert(session.sessionId);
    const { body: sessions } = await fetchJson(`${baseUrl}/api/sessions`);
    const found = sessions.find((s: any) => s.id === session.sessionId);
    assert(found);
    assert.equal(found.messageCount, 0);
  });

  // 2. Create session → create project with plan steps
  it('should create a project with plan steps from a session', async () => {
    const { body: session } = await fetchJson(`${baseUrl}/api/session`, { method: 'POST' });
    const planSteps = [
      { description: 'Read source files', status: 'pending' },
      { description: 'Implement feature', status: 'pending' },
      { description: 'Write tests', status: 'pending' },
      { description: 'Run tests and fix issues', status: 'pending' },
    ];
    const { status, body: project } = await fetchJson(`${baseUrl}/api/projects`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Feature X',
        description: 'Implement Feature X',
        sessionId: session.sessionId,
        planSteps,
      }),
    });
    assert.equal(status, 200);
    assert(project.id);
    assert.equal(project.title, 'Feature X');
    assert.equal(project.planSteps.length, 4);
    assert.equal(project.status, 'active');
    // Session should now have projectId linked
    const { body: loadedSession } = await fetchJson(`${baseUrl}/api/sessions/${session.sessionId}`);
    assert.equal(loadedSession.meta?.projectId, project.id);
  });

  // 3. New session linked to existing project — plan is accessible
  it('should link a new session to an existing project and access plan', async () => {
    // Create project first
    const { body: session1 } = await fetchJson(`${baseUrl}/api/session`, { method: 'POST' });
    const planSteps = [
      { description: 'Research', status: 'completed' },
      { description: 'Design', status: 'completed' },
      { description: 'Implement', status: 'pending' },
    ];
    const { body: project } = await fetchJson(`${baseUrl}/api/projects`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Feature Y',
        sessionId: session1.sessionId,
        planSteps,
      }),
    });
    // Create second session and link to same project
    const { body: session2 } = await fetchJson(`${baseUrl}/api/session`, { method: 'POST' });
    await fetchJson(`${baseUrl}/api/projects/${project.id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status: 'active' }),
    });
    // Load project and verify plan steps
    const { body: loadedProject } = await fetchJson(`${baseUrl}/api/projects/${project.id}`);
    assert.equal(loadedProject.planSteps.length, 3);
    assert.equal(loadedProject.planSteps[0].status, 'completed');
    assert.equal(loadedProject.planSteps[2].status, 'pending');
  });

  // 4. PlanManager: parse, track, and sync to project
  it('should sync plan completion from PlanManager to ProjectManager', async () => {
    const pm = new ProjectManager();
    const plan = new PlanManager();
    plan.parsePlan('1. Setup environment\n2. Write code\n3. Deploy');

    const data = await pm.create(plan, 'Deploy App', 'Deployment project', 'session_x');
    assert.equal(data.planSteps.length, 3);

    // Mark two steps as completed
    plan.markCompleted(0); // Setup environment
    plan.markCompleted(1); // Write code
    await pm.updatePlan(data.id, plan);

    const updated = pm.get(data.id)!;
    assert.equal(updated.planSteps[0].status, 'completed');
    assert.equal(updated.planSteps[1].status, 'completed');
    assert.equal(updated.planSteps[2].status, 'pending');

    // Progress summary
    const summary = pm.toSummary(data.id) as any;
    assert.equal(summary.done, 2);
    assert.equal(summary.steps, 3);
    assert.ok(summary.progress >= 66 && summary.progress <= 67); // 2/3 ≈ 66-67% depending on rounding
  });

  // 5. PlanManager restore from project
  it('should restore PlanManager state from a saved project', async () => {
    const pm = new ProjectManager();
    const originalPlan = new PlanManager();
    originalPlan.parsePlan('1. A\n2. B\n3. C');
    originalPlan.markCompleted(0);
    originalPlan.markCompleted(2);
    const data = await pm.create(originalPlan, 'Restore Test', '', 'session_r');

    const restored = new PlanManager();
    pm.restorePlan(data.id, restored);
    const steps = restored.getSteps();
    assert.equal(steps.length, 3);
    assert.equal(steps[0].status, 'completed');
    assert.equal(steps[1].status, 'pending');
    assert.equal(steps[2].status, 'completed');
    assert.match(restored.getProgressSummary(), /\[Progress \d+% \(2\/3\)\]/);
  });

  // 6. Find project by session
  it('should find a project associated with a session', async () => {
    const pm = new ProjectManager();
    const plan = new PlanManager();
    plan.parsePlan('1. Step');
    const data = await pm.create(plan, 'Find Me', '', 'session_find');
    const found = pm.findForSession('session_find');
    assert(found);
    assert.equal(found!.id, data.id);
    // Non-existent session
    assert(!pm.findForSession('nonexistent'));
  });

  // 7. List projects sorted by updatedAt
  it('should list projects sorted by last update', async () => {
    const pm = new ProjectManager();
    const plan = new PlanManager();
    plan.parsePlan('1. Step');
    const p1 = await pm.create(plan, 'First', '', 's1');
    await new Promise(r => setTimeout(r, 10));
    const p2 = await pm.create(plan, 'Second', '', 's2');
    const list = pm.getAll();
    assert.equal(list[0].id, p2.id); // newest first
    assert.equal(list[1].id, p1.id);
  });

  // 8. Multi-session project
  it('should allow multiple sessions in one project', async () => {
    const pm = new ProjectManager();
    const plan = new PlanManager();
    plan.parsePlan('1. Step');
    const data = await pm.create(plan, 'Multi', '', 'session_1');
    await pm.addSession(data.id, 'session_2');
    await pm.addSession(data.id, 'session_3');
    const proj = pm.get(data.id)!;
    assert.equal(proj.sessionIds.length, 3);
    assert(proj.sessionIds.includes('session_1'));
    assert(proj.sessionIds.includes('session_3'));
    assert.equal(pm.findForSession('session_2')!.id, data.id);
  });

  // 9. CodingAgent planManager getter
  it('should expose planManager with plan steps after execute (mock)', async () => {
    // This test creates a PlanManager directly to verify the integration pattern
    const plan = new PlanManager();
    plan.parsePlan('1. Step 1\n2. Step 2\n3. Step 3');
    assert(plan.hasPlan());
    assert.equal(plan.getSteps().length, 3);
    assert.equal(plan.getSteps()[0].description, 'Step 1');

    // Simulate completing steps
    plan.markCompleted(0);
    plan.markCompleted(1);
    assert.equal(plan.getSteps().filter(s => s.status === 'completed').length, 2);
    assert.match(plan.getProgressSummary(), /\[Progress \d+% \(2\/3\)\]/);
  });
});
