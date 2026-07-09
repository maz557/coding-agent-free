const readline = require('readline/promises');
const { stdin, stdout } = require('process');
const fs = require('fs');
const path = require('path');

const PROVIDERS = [
  { id: 'openrouter', name: 'OpenRouter', keyEnv: 'OPENROUTER_API_KEY', url: 'https://openrouter.ai/keys', default: true },
  { id: 'groq', name: 'Groq', keyEnv: 'GROQ_API_KEY', url: 'https://console.groq.com/keys' },
  { id: 'google', name: 'Google AI Studio', keyEnv: 'GOOGLE_API_KEY', url: 'https://aistudio.google.com/apikey' },
  { id: 'deepseek', name: 'DeepSeek', keyEnv: 'DEEPSEEK_API_KEY', url: 'https://platform.deepseek.com' },
  { id: 'mistral', name: 'Mistral', keyEnv: 'MISTRAL_API_KEY', url: 'https://console.mistral.ai' },
];

const LOCAL_PROVIDERS = [
  { id: 'ollama', name: 'Ollama', keyEnv: 'OLLAMA_HOST', defaultUrl: 'http://localhost:11434/v1' },
  { id: 'lmstudio', name: 'LM Studio', keyEnv: 'LMSTUDIO_HOST', defaultUrl: 'http://localhost:1234/v1' },
  { id: 'llamacpp', name: 'Llama.cpp', keyEnv: 'LLAMACPP_HOST', defaultUrl: 'http://localhost:8080/v1' },
];

const LSP_SERVER_DEFS = [
  {
    pkg: 'typescript-language-server', lang: 'TypeScript/JavaScript',
    config: { command: 'typescript-language-server', args: ['--stdio'], languageId: 'typescript', filePatterns: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'] },
  },
  {
    pkg: 'pyright', lang: 'Python',
    config: { command: 'pyright-langserver', args: ['--stdio'], languageId: 'python', filePatterns: ['**/*.py'] },
  },
  {
    pkg: 'sql-language-server', lang: 'SQL',
    config: { command: 'sql-language-server', args: ['up', '--method', 'stdio'], languageId: 'sql', filePatterns: ['**/*.sql'] },
  },
];

async function main() {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  console.log('═══════════════════════════════════════════');
  console.log('  Coding Agent Free — Setup Wizard');
  console.log('═══════════════════════════════════════════\n');

  // Check if .env already exists
  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    const answer = await rl.question('.env file already exists. Overwrite? (y/N): ');
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('\nSetup cancelled. Existing .env kept.\n');
      rl.close();
      return;
    }
  }

  const envLines = [];

  console.log('── Cloud Providers ──────────────────────\n');

  for (const p of PROVIDERS) {
    const hint = p.default ? ' (recommended)' : '';
    const answer = await rl.question(`Add ${p.name}${hint}? (Y/n): `);
    if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') continue;

    const key = await rl.question(`  Enter your ${p.name} API key (or leave blank): `);
    if (key.trim()) {
      envLines.push(`${p.keyEnv}=${key.trim()}`);
      console.log(`  ✅ ${p.name} configured\n`);
    } else {
      console.log(`  Get a key at: ${p.url}\n`);
    }
  }

  console.log('── Local Providers ─────────────────────────\n');
  console.log('  Local providers are pre-configured with default URLs.');
  console.log('  Edit .env later if you need to change ports.\n');

  for (const p of LOCAL_PROVIDERS) {
    envLines.push(`${p.keyEnv}=${p.defaultUrl}`);
    console.log(`  ✅ ${p.name} → ${p.defaultUrl}`);
  }

  // Workspace
  console.log('\n── Workspace ─────────────────────────────\n');
  const dir = await rl.question('Workspace directory path (default: ./workspace): ');
  if (dir.trim()) {
    envLines.push(`ALLOWED_DIR=${dir.trim()}`);
  } else {
    envLines.push('ALLOWED_DIR=./workspace');
  }
  envLines.push(`READ_ALLOWED_DIR=.`);
  envLines.push(`SCRATCH_DIR=./scratch`);

  // Performance
  console.log('\n── Performance ────────────────────────────\n');
  const maxExchanges = await rl.question('Max conversation exchanges (default: 40): ');
  envLines.push(`MAX_EXCHANGES=${maxExchanges.trim() || '40'}`);
  const maxToolResult = await rl.question('Max tool result length in chars (default: 20000): ');
  envLines.push(`MAX_TOOL_RESULT_LENGTH=${maxToolResult.trim() || '20000'}`);

  // Timeouts
  console.log('\n── Timeouts ──────────────────────────────\n');
  console.log('  Timeout resets on each streaming token — only fires when idle.\n');
  const localTimeout = await rl.question('Local model timeout in ms (default: 600000 = 10 min): ');
  envLines.push(`LOCAL_TIMEOUT=${localTimeout.trim() || '600000'}`);
  const cloudTimeout = await rl.question('Cloud model timeout in ms (default: 120000 = 2 min): ');
  envLines.push(`CLOUD_TIMEOUT=${cloudTimeout.trim() || '120000'}`);

  // LSP servers (optional)
  console.log('\n── LSP Servers ────────────────────────────\n');
  console.log('  LSP enables code_definition, code_references, code_hover tools.');
  console.log('  Installed servers are also added to .coding-agent.json.\n');

  const installedLspServers = [];

  for (const srv of LSP_SERVER_DEFS) {
    const answer = await rl.question(`  Install ${srv.pkg} (${srv.lang})? (Y/n): `);
    if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') continue;
    try {
      const { execSync } = require('child_process');
      execSync(`npm install -g ${srv.pkg}`, { stdio: 'inherit', timeout: 120000 });
      installedLspServers.push(srv.config);
      console.log(`  ✅ ${srv.pkg} installed\n`);
    } catch (err) {
      console.log(`  ⚠️  ${srv.pkg} skipped (${err.message})\n`);
    }
  }

  // Write .env
  try {
    fs.writeFileSync(envPath, envLines.join('\n') + '\n', 'utf-8');
    console.log(`✅ .env created with ${envLines.filter(l => l && !l.startsWith('OLLAMA_HOST') && !l.startsWith('LMSTUDIO_HOST') && !l.startsWith('LLAMACPP_HOST') && !l.startsWith('READ_ALLOWED_DIR') && !l.startsWith('SCRATCH_DIR') && !l.startsWith('MAX_EXCHANGES') && !l.startsWith('MAX_TOOL_RESULT_LENGTH') && !l.startsWith('LOCAL_TIMEOUT') && !l.startsWith('CLOUD_TIMEOUT')).length} API key(s) and ${envLines.filter(l => l.startsWith('OLLAMA_HOST') || l.startsWith('LMSTUDIO_HOST') || l.startsWith('LLAMACPP_HOST')).length} local provider(s).`);
  } catch (err) {
    console.error(`\n❌ Failed to write .env: ${err.message}\n`);
  }

  // Write .coding-agent.json with LSP servers
  const codingAgentPath = path.resolve('.coding-agent.json');
  let codingAgentConfig = { mcpServers: {}, lspServers: [] };

  if (fs.existsSync(codingAgentPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(codingAgentPath, 'utf-8'));
      if (existing.mcpServers) codingAgentConfig.mcpServers = existing.mcpServers;
      if (existing.lspServers) codingAgentConfig.lspServers = existing.lspServers;
    } catch { /* start fresh */ }
  }

  // Merge new LSP servers (avoid duplicates by command name)
  for (const cfg of installedLspServers) {
    if (!codingAgentConfig.lspServers.some((s: any) => s.command === cfg.command)) {
      codingAgentConfig.lspServers.push(cfg);
    }
  }

  try {
    fs.writeFileSync(codingAgentPath, JSON.stringify(codingAgentConfig, null, 2) + '\n', 'utf-8');
    console.log(`✅ .coding-agent.json updated with ${installedLspServers.length} LSP server(s).`);
  } catch (err) {
    console.error(`\n❌ Failed to write .coding-agent.json: ${err.message}\n`);
  }

  console.log('\n   Run `npm start` to begin.\n');
  rl.close();
}

main();
