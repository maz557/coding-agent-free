import * as readline from 'readline/promises';
import { stdin, stdout } from 'process';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';
import pino from 'pino';
import pinoPretty from 'pino-pretty';
import { tools, allowExtraPath, setSafeMode, isSafeModeEnabled } from './tools/fileManager';
import { ModelPreset, PROVIDERS, FIXED_PRESETS, SYSTEM_PROMPT } from './config/models';
import { ChatMessage } from './types';
import { CodingAgent } from './CodingAgent';
import {
  saveConversation, loadConversation, clearConversation,
  loadUserPresets, saveUserPresets,
} from './persistence';
import { getAllPresets, showModels } from './commands';
import { estimateTotalTokens } from './tokenEstimator';
import { OpenAITool } from './types';
import { detectLocalModel } from './detectLocalModel';

dotenv.config();

const logger = pino(
  { level: process.env.LOG_LEVEL || 'info' },
  pinoPretty({ destination: 2, sync: true })
);

const DEFAULT_CONTEXT_WINDOW = 128_000;

function createClient(providerId: string): OpenAI {
  const info = PROVIDERS[providerId] ?? PROVIDERS.openrouter;
  const apiKey = info.apiKeyEnv ? (process.env[info.apiKeyEnv] || '') : 'local';
  const headers: Record<string, string> = {};
  if (providerId === 'openrouter') {
    headers['HTTP-Referer'] = 'https://github.com';
    headers['X-Title'] = 'coding-agent-pro';
  }
  return new OpenAI({ baseURL: info.baseURL, apiKey, defaultHeaders: headers });
}

async function startChat() {
  if (process.argv.includes('--safe')) {
    setSafeMode(true);
  }

  const missingKeys: string[] = [];
  const localProviders: string[] = [];
  for (const [id, info] of Object.entries(PROVIDERS)) {
    if (!info.apiKeyEnv) {
      localProviders.push(info.name);
      continue;
    }
    const val = process.env[info.apiKeyEnv];
    if (!val || val.trim() === '' || val === 'YOUR_API_KEY_HERE') {
      missingKeys.push(`${info.name} (${info.apiKeyEnv})`);
    }
  }
  const allCloudMissing = missingKeys.length === Object.keys(PROVIDERS).length - localProviders.length;
  if (allCloudMissing && localProviders.length === 0) {
    console.error('❌ ERROR: No API keys found and no local providers available. Add at least one to .env:');
    Object.values(PROVIDERS).filter(p => p.apiKeyEnv).forEach(p => console.error(`   ${p.apiKeyEnv}=your-key`));
    console.error('   Get keys: OpenRouter=openrouter.ai/keys, Google=aistudio.google.com/apikey, Groq=console.groq.com/keys, DeepSeek=platform.deepseek.com, Mistral=console.mistral.ai');
    process.exit(1);
  }
  if (allCloudMissing && localProviders.length > 0) {
    console.log('ℹ️  No cloud API keys found. Local-only mode.');
    console.log(`   Available local providers: ${localProviders.join(', ')}`);
    console.log('   Run the local server first, then use /add to configure:');
    console.log('     /add 6 ollama:auto        (Ollama)');
    console.log('     /add 7 lmstudio:auto      (LM Studio)');
    console.log('     /add 8 llamacpp:auto      (Llama.cpp)');
  }

  let client = createClient('openrouter');
  let userPresets = await loadUserPresets();
  let activeModelConfig: ModelPreset = { ...FIXED_PRESETS['1'] };
  let lastActualModel = '';

  const allowedDir = path.resolve(process.env.ALLOWED_DIR || './workspace');

  console.log('═══════════════════════════════════════════════');
  console.log('  Coding Agent Free');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Workspace: ${allowedDir}`);
  if (isSafeModeEnabled()) {
    console.log('  🛡️  Safe mode: ON (whitelist-only shell commands)');
  }
  console.log('  Commands:');
  console.log('    /model <n>   Switch to preset n');
  console.log('    /save <n>    Save last used model as preset n');
  console.log('    /add <n> <m> Manually add model m as preset n (provider:model)');
  console.log('    /remove <n>  Remove a user preset');
  console.log('    /allow <p>   Allow model to access path outside workspace');
  console.log('    /safe        Toggle safe mode (whitelist-only shell commands)');
  console.log('    /reset       Clear conversation history (start fresh)');
  console.log('    /list-providers  Show available providers');
  console.log('    /models      Show all presets');
  console.log('    /active      Show current active model');
  console.log('    /exit        Quit');
  console.log('═══════════════════════════════════════════════');
  console.log(`  💡 Tip: Set ALLOWED_DIR=. in .env to access the project root.`);
  console.log('');

  showModels(userPresets, activeModelConfig);
  console.log('');

  let savedMessages: ChatMessage[] | null = null;
  const savedSession = await loadConversation();
  if (savedSession && savedSession.messages.length > 0) {
    const resumeRl = readline.createInterface({ input: stdin, output: stdout });
    const answer = (await resumeRl.question('A previous conversation was found. Resume it? (y/n): ')).trim().toLowerCase();
    resumeRl.close();
    if (answer === 'y' || answer === 'yes') {
      savedMessages = savedSession.messages;
      if (savedSession.modelPreset) {
        const savedPreset: ModelPreset = { ...savedSession.modelPreset, fallbacks: savedSession.modelPreset.fallbacks ?? [] };
        activeModelConfig = savedPreset;
        client = createClient(savedPreset.provider);
        const prov = PROVIDERS[savedPreset.provider]?.name ?? savedPreset.provider;
        console.log(`✅ Conversation restored with [${prov}] ${savedPreset.primary}\n`);
      } else {
        console.log('✅ Conversation restored.\n');
      }
    } else {
      await clearConversation();
    }
  }

  const rl = readline.createInterface({ input: stdin, output: stdout, prompt: 'You: ' });
  const typedTools = tools as OpenAITool[];
  const systemPrompt = SYSTEM_PROMPT;

  let agent = new CodingAgent(client, typedTools, activeModelConfig, systemPrompt, savedMessages ?? undefined);

  // Graceful shutdown: save conversation before exit
  let shuttingDown = false;
  const handleShutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('\n\n⚠️  Shutting down gracefully...');
    try {
      const conversationMessages = agent.getConversationMessages();
      if (conversationMessages.length > 1) {
        await saveConversation(conversationMessages as ChatMessage[], activeModelConfig);
        console.log('✅ Conversation saved.');
      }
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
    }
    rl.close();
    process.exit(0);
  };

  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);

  rl.prompt();

  for await (const line of rl) {
    if (shuttingDown) break;

    const input = line.trim();
    if (!input) {
      rl.prompt();
      continue;
    }

    if (input.toLowerCase() === '/exit') {
      console.log('Exiting...');
      await handleShutdown();
      break;
    }

    if (input.toLowerCase() === '/models') {
      showModels(userPresets, activeModelConfig);
      rl.prompt();
      continue;
    }

    if (input.toLowerCase() === '/active') {
      const prov = PROVIDERS[activeModelConfig.provider]?.name ?? activeModelConfig.provider;
      console.log(`\n  ✅ Active: [${prov}] ${activeModelConfig.primary}${activeModelConfig.fallbacks.length ? ` → ${activeModelConfig.fallbacks.join(', ')}` : ''}\n`);
      rl.prompt();
      continue;
    }

    if (input.toLowerCase() === '/list-providers') {
      console.log('\n── Available Providers ────────────────────');
      for (const [id, info] of Object.entries(PROVIDERS)) {
        if (info.apiKeyEnv) {
          const key = process.env[info.apiKeyEnv] ? '🔑' : '❌';
          console.log(`  ${key} ${info.name.padEnd(20)} ${info.apiKeyEnv}`);
        } else {
          console.log(`  ✅ ${info.name.padEnd(20)} (local, no key needed)`);
        }
      }
      console.log('──────────────────────────────────────────');
      console.log('  (❌ = add key to .env; ✅ = ready)\n');
      rl.prompt();
      continue;
    }

    const modelMatch = input.match(/^\/model\s+(\d+)$/i);
    if (modelMatch) {
      const num = modelMatch[1];
      const allPresets = getAllPresets(userPresets);
      if (allPresets[num]) {
        activeModelConfig = { ...allPresets[num] };
        client = createClient(activeModelConfig.provider);
        const prov = PROVIDERS[activeModelConfig.provider]?.name ?? activeModelConfig.provider;
        const prevMessages = agent.getConversationMessages();
        agent = new CodingAgent(client, typedTools, activeModelConfig, systemPrompt, prevMessages as ChatMessage[]);
        console.log(`\n✅ Switched to preset ${num}: [${prov}] ${activeModelConfig.primary}\n`);
      } else {
        console.log(`\n❌ Preset ${num} not found.\n`);
      }
      rl.prompt();
      continue;
    }

    const saveMatch = input.match(/^\/save\s+(\d+)$/i);
    if (saveMatch) {
      const num = saveMatch[1];
      if (FIXED_PRESETS[num]) {
        console.log(`\n❌ Cannot overwrite fixed preset ${num}.\n`);
      } else if (!lastActualModel) {
        console.log(`\n❌ No model to save. Send a message first.\n`);
      } else {
        const prov = PROVIDERS[activeModelConfig.provider]?.name ?? activeModelConfig.provider;
        userPresets[num] = { provider: activeModelConfig.provider, primary: lastActualModel, fallbacks: ['openrouter/free'] };
        await saveUserPresets(userPresets);
        console.log(`\n✅ Saved as preset ${num}: [${prov}] ${lastActualModel}\n`);
      }
      rl.prompt();
      continue;
    }

    const addMatch = input.match(/^\/add\s+(\d+)\s+(.+)$/i);
    if (addMatch) {
      const num = addMatch[1];
      const raw = addMatch[2].trim();
      if (FIXED_PRESETS[num]) {
        console.log(`\n❌ Cannot overwrite fixed preset ${num}.\n`);
      } else {
        const colon = raw.indexOf(':');
        let providerId: string;
        let modelId: string;
        if (colon > 0 && PROVIDERS[raw.slice(0, colon)]) {
          providerId = raw.slice(0, colon);
          modelId = raw.slice(colon + 1);
        } else {
          providerId = activeModelConfig.provider;
          modelId = raw;
        }

        const provInfo = PROVIDERS[providerId];
        if (provInfo && !provInfo.apiKeyEnv && modelId.toLowerCase() === 'auto') {
          try {
            modelId = await detectLocalModel(providerId);
          } catch (err: any) {
            console.log(`\n❌ ${err.message}\n`);
            rl.prompt();
            continue;
          }
        }

        const prov = PROVIDERS[providerId]?.name ?? providerId;
        userPresets[num] = { provider: providerId, primary: modelId, fallbacks: ['openrouter/free'] };
        await saveUserPresets(userPresets);
        console.log(`\n✅ Added preset ${num}: [${prov}] ${modelId}\n`);
      }
      rl.prompt();
      continue;
    }

    const removeMatch = input.match(/^\/remove\s+(\d+)$/i);
    if (removeMatch) {
      const num = removeMatch[1];
      if (FIXED_PRESETS[num]) {
        console.log(`\n❌ Cannot remove fixed preset ${num}.\n`);
      } else if (userPresets[num]) {
        delete userPresets[num];
        await saveUserPresets(userPresets);
        console.log(`\n✅ Removed preset ${num}.\n`);
      } else {
        console.log(`\n❌ Preset ${num} not found.\n`);
      }
      rl.prompt();
      continue;
    }

    const allowMatch = input.match(/^\/allow\s+(.+)$/i);
    if (allowMatch) {
      const p = allowMatch[1].trim().replace(/^"(.*)"$/, '$1');
      allowExtraPath(p);
      console.log(`\n✅ Allowed: ${path.resolve(p)}\n`);
      rl.prompt();
      continue;
    }

    if (input.toLowerCase() === '/safe') {
      const now = !isSafeModeEnabled();
      setSafeMode(now);
      console.log(`\n🛡️  Safe mode ${now ? 'ENABLED' : 'DISABLED'} — only whitelisted shell commands are allowed.\n`);
      rl.prompt();
      continue;
    }

    if (input.toLowerCase() === '/reset') {
      agent = new CodingAgent(client, typedTools, activeModelConfig, systemPrompt);
      await clearConversation();
      console.log('\n🧹 Conversation cleared. Starting fresh.\n');
      rl.prompt();
      continue;
    }

    console.log('\n⏳ Thinking...\n');

    try {
      const result = await agent.execute(input);
      lastActualModel = result.model;

      const conversationMessages = agent.getConversationMessages();
      await saveConversation(conversationMessages as ChatMessage[], activeModelConfig);

      const tokens = estimateTotalTokens(conversationMessages);
      const maxCtx = activeModelConfig.contextWindow ?? DEFAULT_CONTEXT_WINDOW;
      console.log(`  📊 ~${tokens}/${(maxCtx / 1000).toFixed(0)}K tokens`);

      if (result.content) {
        console.log(`\nAgent: ${result.content}\n`);
      }

      logger.info({ model: result.model, toolCalls: result.toolCallsCount }, 'Agent completed');
    } catch (err: any) {
      logger.error({ error: err }, 'Unexpected system error');
      console.error(`\n🚨 Unexpected System Error: ${err.message}\n`);
    }

    rl.prompt();
  }
}

startChat();
