import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('autoRouter', () => {
  function reload() {
    for (const key of Object.keys(require.cache)) {
      if (key.includes('autoRouter') || key.includes('models') || key.includes('loadProjectContext')) {
        delete require.cache[key];
      }
    }
  }

  it('isAutoRoute returns true for auto/*', () => {
    reload();
    const { isAutoRoute } = require('../config/autoRouter');
    assert.equal(isAutoRoute('auto/coding'), true);
    assert.equal(isAutoRoute('auto/fast'), true);
    assert.equal(isAutoRoute('auto/offline'), true);
    assert.equal(isAutoRoute('1'), false);
    assert.equal(isAutoRoute('auto'), false);
  });

  it('listAutoRoutes returns expected routes', () => {
    reload();
    const { listAutoRoutes } = require('../config/autoRouter');
    const routes = listAutoRoutes();
    assert.ok(routes.includes('auto/coding'));
    assert.ok(routes.includes('auto/fast'));
    assert.ok(routes.includes('auto/cheap'));
    assert.ok(routes.includes('auto/reasoning'));
    assert.ok(routes.includes('auto/vision'));
    assert.ok(routes.includes('auto/offline'));
    assert.equal(routes.length, 6);
  });

  it('getRouteLabel returns readable labels', () => {
    reload();
    const { getRouteLabel } = require('../config/autoRouter');
    assert.equal(getRouteLabel('auto/coding'), 'Auto (Coding)');
    assert.equal(getRouteLabel('auto/fast'), 'Auto (Fast)');
    assert.equal(getRouteLabel('auto/offline'), 'Auto (Offline)');
    assert.equal(getRouteLabel('unknown'), 'unknown');
  });

  it('getRouteMinQuality returns correct quality for routes', () => {
    reload();
    const { getRouteMinQuality } = require('../config/autoRouter');
    assert.equal(getRouteMinQuality('auto/coding'), 'high');
    assert.equal(getRouteMinQuality('auto/fast'), 'medium');
    assert.equal(getRouteMinQuality('auto/offline'), 'low');
    assert.equal(getRouteMinQuality('auto/unknown'), null);
  });

  it('getRouteEntries returns entries for known routes', () => {
    reload();
    const { getRouteEntries } = require('../config/autoRouter');
    const entries = getRouteEntries('auto/coding');
    assert.ok(Array.isArray(entries));
    assert.ok(entries.length > 0);
    assert.ok(entries.every((e: any) => e.provider && e.model));
  });

  it('getRouteEntries returns null for unknown route', () => {
    reload();
    const { getRouteEntries } = require('../config/autoRouter');
    assert.equal(getRouteEntries('auto/unknown'), null);
  });

  it('resolveRoute returns cloud preset when api key is set', () => {
    const oldKey = process.env.OPENROUTER_API_KEY;
    process.env.OPENROUTER_API_KEY = 'sk-test';
    reload();
    const { resolveRoute } = require('../config/autoRouter');
    const result = resolveRoute('auto/fast');
    assert.ok(result.preset !== null);
    assert.ok(result.preset.provider);
    assert.ok(result.preset.primary);
    assert.equal(result.suggestion, undefined);
    if (oldKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = oldKey;
  });

  it('resolveRoute suggests offline when no cloud keys set', () => {
    const oldOr = process.env.OPENROUTER_API_KEY;
    const oldG = process.env.GOOGLE_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    reload();
    const { resolveRoute } = require('../config/autoRouter');
    const result = resolveRoute('auto/coding');
    assert.equal(result.preset, null);
    assert.ok(result.suggestion);
    assert.ok(result.suggestion.includes('offline'));
    if (oldOr) process.env.OPENROUTER_API_KEY = oldOr;
    if (oldG) process.env.GOOGLE_API_KEY = oldG;
  });

  it('resolveRoute returns null for unknown route', () => {
    reload();
    const { resolveRoute } = require('../config/autoRouter');
    const result = resolveRoute('auto/unknown');
    assert.equal(result.preset, null);
    assert.equal(result.suggestion, undefined);
  });

  it('resolveRoute with only local provider available returns offline suggestion', () => {
    const oldOr = process.env.OPENROUTER_API_KEY;
    const oldG = process.env.GOOGLE_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    reload();
    const { resolveRoute } = require('../config/autoRouter');
    const result = resolveRoute('auto/coding');
    assert.equal(result.preset, null);
    assert.ok(result.suggestion);
    assert.ok(result.suggestion.includes('offline'));
    if (oldOr) process.env.OPENROUTER_API_KEY = oldOr;
    if (oldG) process.env.GOOGLE_API_KEY = oldG;
  });

  it('resolveRoute uses quality filtering correctly', () => {
    const oldKey = process.env.OPENROUTER_API_KEY;
    process.env.OPENROUTER_API_KEY = 'sk-test';
    reload();
    const { resolveRoute, getRouteMinQuality } = require('../config/autoRouter');
    const minQ = getRouteMinQuality('auto/coding');
    assert.equal(minQ, 'high');
    const result = resolveRoute('auto/coding');
    assert.ok(result.preset !== null);
    if (oldKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = oldKey;
  });

  it('resolveRoute for offline route returns llamacpp', () => {
    reload();
    const { resolveRoute } = require('../config/autoRouter');
    const result = resolveRoute('auto/offline');
    assert.ok(result.preset !== null);
    assert.equal(result.preset.provider, 'llamacpp');
    assert.equal(result.preset.primary, 'ornith-agent');
  });
});
