import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { PlanManager } from '../PlanManager';

describe('PlanManager - parsePlan', () => {
  it('should parse numbered plan with dots', () => {
    const pm = new PlanManager();
    const plan = `1. First step\n2. Second step\n3. Third step`;
    const steps = pm.parsePlan(plan);
    assert.equal(steps.length, 3);
    assert.equal(steps[0].number, 1);
    assert.equal(steps[0].description, 'First step');
    assert.equal(steps[0].status, 'pending');
    assert.equal(steps[2].number, 3);
    assert.equal(steps[2].description, 'Third step');
  });

  it('should parse numbered plan with parens', () => {
    const pm = new PlanManager();
    const plan = `1) Read the file\n2) Modify content\n3) Save changes`;
    const steps = pm.parsePlan(plan);
    assert.equal(steps.length, 3);
    assert.equal(steps[0].description, 'Read the file');
    assert.equal(steps[1].description, 'Modify content');
  });

  it('should handle extra whitespace and bullet markers', () => {
    const pm = new PlanManager();
    const plan = `  1.  - Create file\n  2.  * Write tests\n  3.  Run tests  `;
    const steps = pm.parsePlan(plan);
    assert.equal(steps.length, 3);
    assert.equal(steps[0].description, 'Create file');
    assert.equal(steps[1].description, 'Write tests');
    assert.equal(steps[2].description, 'Run tests');
  });

  it('should create fallback single step for unparseable text', () => {
    const pm = new PlanManager();
    const steps = pm.parsePlan('Just some random text without numbers');
    assert.equal(steps.length, 1);
    assert.equal(steps[0].number, 1);
    assert.equal(steps[0].description, 'Just some random text without numbers');
  });

  it('should return empty steps for empty text', () => {
    const pm = new PlanManager();
    const steps = pm.parsePlan('');
    assert.equal(steps.length, 1);
    assert.equal(steps[0].description, '');
  });
});

describe('PlanManager - step tracking', () => {
  it('should mark steps completed', () => {
    const pm = new PlanManager();
    pm.parsePlan('1. Read file\n2. Edit file\n3. Save');
    pm.markCompleted(0);
    assert.equal(pm.getSteps()[0].status, 'completed');
    assert.equal(pm.getSteps()[1].status, 'pending');
  });

  it('should mark steps skipped', () => {
    const pm = new PlanManager();
    pm.parsePlan('1. Read\n2. Write\n3. Test');
    pm.markSkipped(1);
    assert.equal(pm.getSteps()[0].status, 'pending');
    assert.equal(pm.getSteps()[1].status, 'skipped');
  });

  it('should record tool calls and mark in_progress', () => {
    const pm = new PlanManager();
    pm.parsePlan('1. Create file\n2. Run tests');
    pm.recordToolCall(0, 'write_file');
    assert.equal(pm.getSteps()[0].status, 'in_progress');
    assert.deepEqual(pm.getSteps()[0].toolCalls, ['write_file']);
    assert.equal(pm.getSteps()[1].status, 'pending');
  });

  it('should ignore out-of-range indices', () => {
    const pm = new PlanManager();
    pm.parsePlan('1. Step');
    pm.markCompleted(5);
    pm.markSkipped(-1);
    pm.recordToolCall(10, 'test');
    assert.equal(pm.getSteps()[0].status, 'pending');
  });

  it('should track completed count correctly', () => {
    const pm = new PlanManager();
    pm.parsePlan('1. A\n2. B\n3. C\n4. D');
    pm.markCompleted(0);
    pm.markCompleted(2);
    const done = pm.getSteps().filter(s => s.status === 'completed').length;
    assert.equal(done, 2);
  });
});

describe('PlanManager - matchToolToStep', () => {
  it('should match write_file to create/write steps', () => {
    const pm = new PlanManager();
    pm.parsePlan('1. Read the file\n2. Create a new module\n3. Run tests');
    const idx = pm.matchToolToStep('write_file', { path: 'src/module.ts' });
    assert.equal(idx, 1); // step "Create a new module"
  });

  it('should match run_command to run/install steps', () => {
    const pm = new PlanManager();
    pm.parsePlan('1. Install dependencies\n2. Fix bugs');
    const idx = pm.matchToolToStep('run_command', { command: 'npm install' });
    assert.equal(idx, 0);
  });

  it('should match replace_in_file to modify/edit steps', () => {
    const pm = new PlanManager();
    pm.parsePlan('1. Modify the config file\n2. Verify changes');
    const idx = pm.matchToolToStep('replace_in_file', { path: 'config.json' });
    assert.equal(idx, 0);
  });

  it('should skip completed steps and pick first pending', () => {
    const pm = new PlanManager();
    pm.parsePlan('1. Read file\n2. Write file\n3. Test');
    pm.markCompleted(0);
    const idx = pm.matchToolToStep('write_file', {});
    assert.equal(idx, 1);
  });

  it('should skip completed steps and return last pending if no keyword match', () => {
    const pm = new PlanManager();
    pm.parsePlan('1. Read file\n2. Something else\n3. Done');
    pm.markCompleted(0);
    pm.markCompleted(2);
    const idx = pm.matchToolToStep('write_file', {});
    assert.equal(idx, 1);
  });

  it('should return -1 when all steps complete', () => {
    const pm = new PlanManager();
    pm.parsePlan('1. Read\n2. Write');
    pm.markCompleted(0);
    pm.markCompleted(1);
    const idx = pm.matchToolToStep('read_file', {});
    assert.equal(idx, -1);
  });

  it('should match by path in arguments', () => {
    const pm = new PlanManager();
    pm.parsePlan('1. Create config file\n2. Deploy');
    const idx = pm.matchToolToStep('write_file', { path: 'config.json' });
    assert.equal(idx, 0);
  });
});

describe('PlanManager - progress summary', () => {
  it('should return empty for no steps', () => {
    const pm = new PlanManager();
    assert.equal(pm.getProgressSummary(), '');
  });

  it('should format progress correctly', () => {
    const pm = new PlanManager();
    pm.parsePlan('1. Read\n2. Write\n3. Test\n4. Deploy');
    pm.markCompleted(0);
    pm.markCompleted(2);
    const summary = pm.getProgressSummary();
    assert(summary.includes('50%'));
    assert(summary.includes('(2/4)'));
    assert(summary.includes('[✓] 1. Read'));
    assert(summary.includes('[✓] 3. Test'));
    assert(summary.includes('[ ] 2. Write'));
  });

  it('should show in_progress indicator', () => {
    const pm = new PlanManager();
    pm.parsePlan('1. Read\n2. Write');
    pm.recordToolCall(1, 'write_file("test.txt")');
    const summary = pm.getProgressSummary();
    assert(summary.includes('[→] 2. Write'));
  });

  it('should show skipped indicator', () => {
    const pm = new PlanManager();
    pm.parsePlan('1. Read\n2. Write');
    pm.markSkipped(1);
    const summary = pm.getProgressSummary();
    assert(summary.includes('[–] 2. Write'));
  });
});

describe('PlanManager - serialization', () => {
  it('should round-trip through JSON', () => {
    const pm = new PlanManager();
    pm.parsePlan('1. Read\n2. Write\n3. Test');
    pm.markCompleted(0);
    pm.recordToolCall(1, 'write_file("x.txt")');
    const json = pm.toJSON();
    const pm2 = new PlanManager();
    pm2.fromJSON(json);
    assert.equal(pm2.getSteps().length, 3);
    assert.equal(pm2.getSteps()[0].status, 'completed');
    assert.equal(pm2.getSteps()[1].status, 'in_progress');
    assert.deepEqual(pm2.getSteps()[1].toolCalls, ['write_file("x.txt")']);
  });

  it('fromJSON should handle empty data', () => {
    const pm = new PlanManager();
    pm.fromJSON({ steps: [] });
    assert.equal(pm.getSteps().length, 0);
    assert.equal(pm.hasPlan(), false);
  });
});

describe('PlanManager - hasPlan', () => {
  it('should return false initially', () => {
    const pm = new PlanManager();
    assert.equal(pm.hasPlan(), false);
  });

  it('should return true after parsing', () => {
    const pm = new PlanManager();
    pm.parsePlan('1. Do something');
    assert.equal(pm.hasPlan(), true);
  });
});
