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

  // ALLOWED_DIR
  console.log('\n── Workspace ─────────────────────────────\n');
  const dir = await rl.question('Workspace directory path (default: ./workspace): ');
  if (dir.trim()) {
    envLines.push(`ALLOWED_DIR=${dir.trim()}`);
  }

  // Write .env
  try {
    fs.writeFileSync(envPath, envLines.join('\n') + '\n', 'utf-8');
    console.log(`\n✅ .env created with ${envLines.filter(l => l && !l.startsWith('OLLAMA_HOST') && !l.startsWith('LMSTUDIO_HOST') && !l.startsWith('LLAMACPP_HOST')).length} API key(s) and ${envLines.filter(l => l.startsWith('OLLAMA_HOST') || l.startsWith('LMSTUDIO_HOST') || l.startsWith('LLAMACPP_HOST')).length} local provider(s).`);
    console.log('   Run `npm start` to begin.\n');
  } catch (err) {
    console.error(`\n❌ Failed to write .env: ${err.message}\n`);
  }

  rl.close();
}

main();
