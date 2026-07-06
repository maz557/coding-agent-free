#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
const API_URL = 'http://localhost:3000/v1/chat/completions';
const API_KEY = 'coding-agent-free-local';

function log(label, msg) {
  console.log(`  ${label.padEnd(10)} ${msg}`);
}

function success(msg) { log('✅', msg); }
function skip(msg) { log('⏭️', msg); }
function fail(msg) { log('❌', msg); }

// ── Cline (VSCode Extension) ──
function setupCline() {
  const clineConfigDir = path.join(HOME, '.config', 'cline');
  const configPath = path.join(clineConfigDir, 'cline_config.json');
  if (!fs.existsSync(clineConfigDir)) {
    skip('Cline: not installed');
    return;
  }

  let config = {};
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch { /* ignore corrupt */ }

  config.apiProvider = 'openai';
  config.openAiBaseUrl = API_URL;
  config.openAiApiKey = API_KEY;
  config.openAiModel = 'openrouter/free';

  try {
    fs.mkdirSync(clineConfigDir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    success(`Cline: configured → ${API_URL}`);
  } catch (e) {
    fail(`Cline: ${e.message}`);
  }
}

// ── Continue.dev ──
function setupContinue() {
  const continueDir = path.join(HOME, '.continue');
  const configPath = path.join(continueDir, 'config.json');
  if (!fs.existsSync(continueDir)) {
    skip('Continue.dev: not installed');
    return;
  }

  let config = { models: [], contexts: [] };
  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch { /* ignore corrupt */ }

  // Add our model if not already present
  const exists = config.models?.some((m) => m?.apiBase === API_URL);
  if (exists) {
    success('Continue.dev: already configured');
    return;
  }

  const ourModel = {
    title: 'Coding Agent Free',
    provider: 'openai',
    model: 'openrouter/free',
    apiBase: API_URL,
    apiKey: API_KEY,
  };
  config.models = [...(config.models || []), ourModel];
  config.models.sort((a, b) => (a.title || '').localeCompare(b.title || ''));

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    success(`Continue.dev: added → ${API_URL}`);
  } catch (e) {
    fail(`Continue.dev: ${e.message}`);
  }
}

// ── Cursor ──
function setupCursor() {
  // Cursor stores settings in various places depending on version
  const possiblePaths = [
    path.join(HOME, '.cursor', 'config.json'),
    path.join(HOME, '.cursor', 'settings.json'),
    path.join(HOME, 'AppData', 'Roaming', 'Cursor', 'config.json'),
  ];
  const existingPath = possiblePaths.find(p => fs.existsSync(p));
  if (!existingPath) {
    skip('Cursor: config not found (may use built-in UI)');
    return;
  }

  try {
    let config = JSON.parse(fs.readFileSync(existingPath, 'utf-8'));
    config['openAiApiUrl'] = API_URL;
    config['openAiApiKey'] = API_KEY;
    fs.writeFileSync(existingPath, JSON.stringify(config, null, 2), 'utf-8');
    success(`Cursor: configured → ${API_URL}`);
  } catch (e) {
    fail(`Cursor: ${e.message}`);
  }
}

// ── VSCode settings ──
function setupVSCode() {
  const possiblePaths = [];
  // Windows
  if (process.platform === 'win32') {
    possiblePaths.push(path.join(HOME, 'AppData', 'Roaming', 'Code', 'User', 'settings.json'));
    possiblePaths.push(path.join(HOME, 'AppData', 'Roaming', 'Cursor', 'User', 'settings.json'));
  }
  // Linux / macOS
  possiblePaths.push(path.join(HOME, '.config', 'Code', 'User', 'settings.json'));
  possiblePaths.push(path.join(HOME, 'Library', 'Application Support', 'Code', 'User', 'settings.json'));

  for (const p of possiblePaths) {
    if (!fs.existsSync(p)) continue;
    try {
      let settings = JSON.parse(fs.readFileSync(p, 'utf-8'));
      // No standard OpenAI endpoint in VSCode settings, but we can note it
      success(`VSCode: found at ${p} (no OpenAI proxy setting available)`);
      return;
    } catch { /* skip */ }
  }
  skip('VSCode: settings not found');
}

// ── .env hint ──
function printEnvHint() {
  console.log('');
  console.log('  ── Reminder ─────────────────────────────');
  console.log('  Make sure the server is running:');
  console.log('    npm run web');
  console.log('  Then start your IDE and select "Coding Agent Free"');
  console.log('  as the OpenAI-compatible provider.');
  console.log('  ─────────────────────────────────────────');
}

// ── Main ──
console.log('');
console.log('  ⚙️  IDE Setup — Coding Agent Free');
console.log('  ─────────────────────────────────');
console.log('');

setupCline();
setupContinue();
setupCursor();
setupVSCode();
printEnvHint();

console.log('');
