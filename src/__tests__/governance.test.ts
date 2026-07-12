import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('governance - tool safety levels', () => {
  it('should classify safe tools properly', () => {
    const gov = require('../tools/governance');
    assert.equal(gov.getToolSafetyLevel('read_file'), 'safe');
    assert.equal(gov.getToolSafetyLevel('search_content'), 'safe');
    assert.equal(gov.getToolSafetyLevel('list_files'), 'safe');
    assert.equal(gov.getToolSafetyLevel('web_search'), 'safe');
    assert.equal(gov.getToolSafetyLevel('git_log'), 'safe');
  });

  it('should classify sensitive tools properly', () => {
    const gov = require('../tools/governance');
    assert.equal(gov.getToolSafetyLevel('write_file'), 'sensitive');
    assert.equal(gov.getToolSafetyLevel('replace_in_file'), 'sensitive');
    assert.equal(gov.getToolSafetyLevel('run_command'), 'sensitive');
    assert.equal(gov.getToolSafetyLevel('git_commit'), 'sensitive');
    assert.equal(gov.getToolSafetyLevel('run_tests'), 'sensitive');
    assert.equal(gov.getToolSafetyLevel('delete_file'), 'sensitive');
    assert.equal(gov.getToolSafetyLevel('delete_folder'), 'sensitive');
    assert.equal(gov.getToolSafetyLevel('move_file'), 'sensitive');
  });

  it('should default unknown tools to sensitive', () => {
    const gov = require('../tools/governance');
    assert.equal(gov.getToolSafetyLevel('nonexistent_tool'), 'sensitive');
  });

  it('should return category labels', () => {
    const gov = require('../tools/governance');
    assert(gov.getToolCategory('read_file').includes('Safe'));
    assert(gov.getToolCategory('write_file').includes('Sensitive'));
  });
});

describe('governance - ApprovalStore', () => {
  it('should start empty', () => {
    const gov = require('../tools/governance');
    const store = new gov.ApprovalStore();
    assert.equal(store.isPermanentlyAllowed('write_file', {}), false);
    assert.equal(store.toJSON().length, 0);
  });

  it('should allow permanent access for a tool', () => {
    const gov = require('../tools/governance');
    const store = new gov.ApprovalStore();
    store.allowPermanently('write_file');
    assert.equal(store.isPermanentlyAllowed('write_file', {}), true);
    assert.equal(store.toJSON().includes('write_file'), true);
  });

  it('should serialize and deserialize', () => {
    const gov = require('../tools/governance');
    const store = new gov.ApprovalStore();
    store.allowPermanently('run_command');
    store.allowPermanently('git_commit');
    const json = store.toJSON();
    assert.deepEqual(json, ['run_command', 'git_commit']);

    const store2 = new gov.ApprovalStore();
    store2.fromJSON(json);
    assert.equal(store2.isPermanentlyAllowed('run_command', {}), true);
    assert.equal(store2.isPermanentlyAllowed('git_commit', {}), true);
    assert.equal(store2.isPermanentlyAllowed('write_file', {}), false);
  });

  it('should clear all entries', () => {
    const gov = require('../tools/governance');
    const store = new gov.ApprovalStore();
    store.allowPermanently('write_file');
    store.clear();
    assert.equal(store.isPermanentlyAllowed('write_file', {}), false);
    assert.equal(store.toJSON().length, 0);
  });
});

describe('governance - toolRegistry integration', () => {
  it('should bypass governance for safe tools', async () => {
    const reg = require('../tools/toolRegistry');
    reg.setGovernanceEnabled(true);
    let callbackCalled = false;
    reg.setApprovalCallback(async () => { callbackCalled = true; return true; });
    await reg.executeTool('read_file', { path: 'package.json' });
    assert.equal(callbackCalled, false, 'safe tool should not trigger approval');
  });

  it('should call approval callback for sensitive tools', async () => {
    const reg = require('../tools/toolRegistry');
    reg.setGovernanceEnabled(true);
    let capturedTool = '';
    reg.setApprovalCallback(async (toolName: string) => { capturedTool = toolName; return true; });
    await reg.executeTool('write_file', { path: 'test.txt', content: 'hello' });
    assert.equal(capturedTool, 'write_file', 'sensitive tool should trigger approval');
  });

  it('should return rejection message when user denies', async () => {
    const reg = require('../tools/toolRegistry');
    reg.setGovernanceEnabled(true);
    reg.setApprovalCallback(async () => false);
    const result = await reg.executeTool('write_file', { path: 'test.txt', content: 'hello' });
    assert(result.includes('rejected'), 'should return rejection message');
  });

  it('should respect permanently allowed tools', async () => {
    const reg = require('../tools/toolRegistry');
    reg.setGovernanceEnabled(true);
    reg.approvalStore.allowPermanently('write_file');
    let callbackCalled = false;
    reg.setApprovalCallback(async () => { callbackCalled = true; return true; });
    await reg.executeTool('write_file', { path: 'test.txt', content: 'hello' });
    assert.equal(callbackCalled, false, 'permanently allowed tool should not trigger approval');
    reg.approvalStore.clear(); // cleanup
  });

  it('should bypass governance when disabled', async () => {
    const reg = require('../tools/toolRegistry');
    reg.setGovernanceEnabled(false);
    let callbackCalled = false;
    reg.setApprovalCallback(async () => { callbackCalled = true; return true; });
    await reg.executeTool('write_file', { path: 'test.txt', content: 'hello' });
    assert.equal(callbackCalled, false, 'disabled governance should not trigger approval');
    reg.setGovernanceEnabled(true);
  });

  it('should execute tool when governance approves', async () => {
    const reg = require('../tools/toolRegistry');
    reg.setGovernanceEnabled(true);
    reg.setApprovalCallback(async () => true);
    const result = await reg.executeTool('read_file', { path: 'package.json' });
    assert(typeof result === 'string' && result.length > 0, 'should execute tool normally');
  });
});
