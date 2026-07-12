import * as readline from 'readline/promises';
import { stdin, stdout } from 'process';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';
import pino from 'pino';
import pinoPretty from 'pino-pretty';
import { getAllTools, executeTool, allowExtraPath, setSafeMode, isSafeModeEnabled, setMCPEnabled, isMCPEnabled, setLSPEnabled, isLSPEnabled, setApprovalCallback, approvalStore, setGovernanceEnabled, isGovernanceEnabled } from './tools/toolRegistry';
import { mcpManager } from './mcp/MCPManager';
import { loadMCPConfig } from './mcp/config';
import { loadLSPConfig } from './lsp/config';
import { lspManager } from './lsp/index';
import { ModelPreset, PROVIDERS, FIXED_PRESETS, SYSTEM_PROMPT } from './config/models';
import { resolveRoute, isAutoRoute, getRouteLabel, listAutoRoutes } from './config/autoRouter';
import { ChatMessage } from './types';
import { CodingAgent } from './CodingAgent';
import {
  saveConversation, loadConversation, clearConversation,
  listSessions, loadSession, saveSession, deleteSession,
  loadUserPresets, saveUserPresets,
} from './persistence';
import { getAllPresets, showModels } from './commands';
import { discoverAllProviders, pickBestModel, runDiscovery as runModelDiscovery, clearCache as clearDiscoveryCache } from './config/modelDiscovery';
import { estimateTotalTokens } from './tokenEstimator';
import { OpenAITool } from './types';
import { detectLocalModel } from './detectLocalModel';
import { loadProjectContext, generateProjectMap } from './loadProjectContext';
import { projectManager } from './ProjectManager';
import { AgentMode, AGENT_MODES, filterToolsForMode } from './AgentMode';

dotenv.config();

const logger = pino(
  { level: process.env.LOG_LEVEL || 'info' },
  pinoPretty({ destination: 2, sync: true })
);

const DEFAULT_CONTEXT_WINDOW = 128_000;

export function createClient(providerId: string): OpenAI {
  const info = PROVIDERS[providerId] ?? PROVIDERS.openrouter;
  const apiKey = info.apiKeyEnv ? (process.env[info.apiKeyEnv] || '') : 'local';
  const headers: Record<string, string> = {};
  if (providerId === 'openrouter') {
    headers['HTTP-Referer'] = 'https://github.com';
    headers['X-Title'] = 'coding-agent-pro';
  }
  let baseURL = info.baseURL;
  if (providerId === 'google' && apiKey) {
    baseURL += (baseURL.endsWith('/') ? '' : '/') + '?key=' + encodeURIComponent(apiKey);
    return new OpenAI({ baseURL, apiKey: 'unused', defaultHeaders: headers });
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
  let consecutiveTextOnly = 0;

  const allowedDir = path.resolve(process.env.ALLOWED_DIR || './workspace');

  console.log('═══════════════════════════════════════════════');
  console.log('  Coding Agent Free');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Workspace: ${allowedDir}`);
  if (isSafeModeEnabled()) {
    console.log('  🛡️  Safe mode: ON (whitelist-only shell commands)');
  }
  console.log('  Commands:');
  console.log('    /model <n>         Switch to preset n');
  console.log('    /model auto/<r>    Auto-route: coding, fast, cheap, reasoning, vision, offline');
  console.log('    /save <n>    Save last used model as preset n');
  console.log('    /add <n> <m> Manually add model m as preset n (provider:model)');
  console.log('    /remove <n>  Remove a user preset');
  console.log('    /allow <p>   Allow model to access path outside workspace');
    console.log('    /safe        Toggle safe mode (whitelist-only shell commands)');
    console.log('    /lsp         Toggle LSP (code understanding) tools');
  console.log('    /reset       Clear conversation history (start fresh)');
  console.log('    /list-providers  Show available providers');
  console.log('    /tools       List all available tools');
  console.log('    /discover    Discover available models from providers');
  console.log('    /models      Show all presets');
  console.log('    /active      Show current active model');
    console.log('    /mcp list    Show connected MCP servers');
    console.log('    /mcp connect <name> <cmd>  Connect MCP server');
    console.log('    /session list           List all sessions');
    console.log('    /session <name>         Switch to a session (by name)');
    console.log('    /session new <name>     Create a new session');
    console.log('    /session rename <old> <new>  Rename a session');
    console.log('    /session delete <name>  Delete a session');
    console.log('    /session clear          Delete ALL sessions');
    console.log('    /mcp disconnect <name>     Disconnect MCP server');
    console.log('    /mcp toggle  Enable/disable MCP tools');
    console.log('    /mode build|plan  Switch mode (build=full, plan=read-only)');
    console.log('    @explore <q>  Spawn read-only subagent for research');
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

  // Load projects from disk
  await projectManager.loadAll();

  // Initialize MCP servers from config
  const mcpConfig = loadMCPConfig();
  const mcpNames = Object.keys(mcpConfig);
  if (mcpNames.length > 0) {
    for (const [name, def] of Object.entries(mcpConfig)) {
      try {
        await mcpManager.connectServer(name, def);
        const n = mcpManager.getServerToolCount(name);
        console.log(`  🔌 MCP "${name}" connected (${n} tools)`);
      } catch (err: any) {
        console.log(`  ⚠️  MCP "${name}" failed: ${err.message}`);
      }
    }
  }

  // Initialize LSP for code understanding
  try {
    const lspConfigs = loadLSPConfig();
    for (const cfg of lspConfigs) {
      lspManager.addConfig(cfg);
    }
    const allowedDir = path.resolve(process.env.ALLOWED_DIR || './workspace');
    await lspManager.startForProject(allowedDir);
    if (lspManager.isAvailable()) {
      console.log(`  🔬 LSP ready (code_definition, code_references, code_hover)`);
    }
  } catch { /* LSP is optional */ }

  // Proactive model discovery: silently find best models for auto-routes
  runModelDiscovery().catch(() => {});

  const typedTools = getAllTools() as OpenAITool[];
  const projectContext = loadProjectContext();
  const projectMap = generateProjectMap();
  let systemPrompt = SYSTEM_PROMPT;
  const contextParts: string[] = [];
  if (projectContext) {
    contextParts.push(projectContext);
    console.log(`  📄 Project context loaded (AGENTS.md)\n`);
  }
  if (projectMap) {
    contextParts.push(projectMap);
    console.log(`  🗺️  Project map generated\n`);
  }
  if (contextParts.length > 0) {
    systemPrompt = `${SYSTEM_PROMPT}\n\n${contextParts.join('\n\n')}`;
  }

  // Set up CLI approval callback for sensitive tools
  setApprovalCallback(async (toolName, args, level) => {
    const argStr = Object.entries(args).map(([k, v]) => `${k}=${JSON.stringify(v).slice(0, 80)}`).join(', ');
    console.log(`\n  ${level === 'dangerous' ? '🔴' : '🟡'} Tool "${toolName}" requires approval:`);
    console.log(`    ${argStr}`);
    const answer = await rl.question('  Allow? (y=yes, Y=always, n=no, N=never) ');
    const trimmed = answer.trim().toLowerCase();
    if (trimmed === 'y' || trimmed === 'yes') {
      return true;
    }
    if (trimmed === 'a' || trimmed === 'always') {
      approvalStore.allowPermanently(toolName);
      console.log(`  ✅ "${toolName}" will always be allowed in this session.`);
      return true;
    }
    if (trimmed === 'n' || trimmed === 'no') {
      return false;
    }
    if (trimmed === 'never') {
      console.log(`  ❌ "${toolName}" will always be denied in this session.`);
      return false;
    }
    return false;
  });

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

    if (input.toLowerCase() === '/tools') {
      const tools = getAllTools();
      if (tools.length === 0) {
        console.log('\n  No tools available.\n');
      } else {
        console.log(`\n── Available Tools (${tools.length}) ────────────────`);
        for (const t of tools) {
          const desc = (t.function.description || '').split('.')[0];
          console.log(`  ${t.function.name.padEnd(22)} ${desc}`);
        }
        console.log('──────────────────────────────────────────────────\n');
      }
      rl.prompt();
      continue;
    }

    if (input.toLowerCase() === '/discover') {
      console.log('\n  🔍 Discovering available models from all providers...\n');
      clearDiscoveryCache();
      const all = await discoverAllProviders();
      let found = false;
      for (const [provider, models] of Object.entries(all)) {
        if (models.length === 0) continue;
        found = true;
        const names = PROVIDERS[provider]?.name || provider;
        const best = pickBestModel(models);
        console.log(`  ${names}: ${models.length} model(s)`);
        console.log(`    Best: ${best}`);
        console.log(`    Models: ${models.slice(0, 5).map(m => m.id).join(', ')}${models.length > 5 ? '...' : ''}`);
      }
      if (!found) console.log('  No models discovered (check API keys).');
      console.log('');
      rl.prompt();
      continue;
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

    let modelMatch = input.match(/^\/model\s+(\d+)$/i);
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

    const routeMatch = input.match(/^\/model\s+(auto\/\w+)$/i);
    if (routeMatch) {
      const route = routeMatch[1];
      const resolved = resolveRoute(route);
      if (!resolved.preset) {
        console.log(`\n❌ ${resolved.suggestion || `No model available for ${route}.`}\n`);
        rl.prompt();
        continue;
      }
      activeModelConfig = resolved.preset;
      client = createClient(activeModelConfig.provider);
      const prov = PROVIDERS[activeModelConfig.provider]?.name ?? activeModelConfig.provider;
      const prevMessages = agent.getConversationMessages();
      agent = new CodingAgent(client, typedTools, activeModelConfig, systemPrompt, prevMessages as ChatMessage[]);
      console.log(`\n✅ Switched to ${getRouteLabel(route)}: [${prov}] ${activeModelConfig.primary}\n`);
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

    if (input.toLowerCase() === '/gov') {
      const now = !isGovernanceEnabled();
      setGovernanceEnabled(now);
      console.log(`\n🛡️  Governance ${now ? 'ENABLED' : 'DISABLED'} — sensitive tools ${now ? 'require' : 'bypass'} approval.\n`);
      rl.prompt();
      continue;
    }

    if (input.toLowerCase() === '/trust') {
      const list = approvalStore.toJSON();
      if (list.length === 0) {
        console.log('\n  No permanently trusted tools.\n');
      } else {
        console.log(`\n  Trusted tools (${list.length}): ${list.join(', ')}\n`);
      }
      rl.prompt();
      continue;
    }

    if (input.toLowerCase() === '/lsp') {
      const now = !isLSPEnabled();
      setLSPEnabled(now);
      typedTools.length = 0;
      typedTools.push(...getAllTools() as OpenAITool[]);
      console.log(`\n🔬 LSP ${now ? 'ENABLED' : 'DISABLED'} — ${lspManager.isAvailable() ? 'server ready' : 'no LSP server found'}.\n`);
      rl.prompt();
      continue;
    }

    const modeMatch = input.match(/^\/mode\s+(build|plan)$/i);
    if (modeMatch) {
      const newMode = modeMatch[1].toLowerCase() as AgentMode;
      const modeTools = filterToolsForMode(typedTools as any, newMode) as OpenAITool[];
      const prevMsgs = agent.getConversationMessages();
      agent = new CodingAgent(client, modeTools, activeModelConfig, systemPrompt, prevMsgs as ChatMessage[], newMode);
      console.log(`\n  Switched to ${AGENT_MODES[newMode].label} mode — ${AGENT_MODES[newMode].description}\n`);
      rl.prompt();
      continue;
    }

    if (input.toLowerCase().startsWith('/mode')) {
      console.log('\n  Usage: /mode build  (full access)');
      console.log('         /mode plan   (read-only)\n');
      rl.prompt();
      continue;
    }

    // @explore subagent: spawn a read-only agent to research a question
    const exploreMatch = input.match(/^@explore\s+(.+)$/is);
    if (exploreMatch) {
      const query = exploreMatch[1].trim();
      console.log(`\n  🔍 Exploring: ${query}\n`);
      const exploreTools = filterToolsForMode(typedTools as any, 'plan') as OpenAITool[];
      const exploreAgent = new CodingAgent(client, exploreTools, activeModelConfig,
        'You are a code exploration assistant. Use read-only tools to answer the user\'s question about the codebase. Be concise and direct.',
        undefined, 'plan');
      try {
        const result = await exploreAgent.execute(query);
        const answer = result.content || '(no answer)';
        console.log(`\n  📝 Exploration result:\n    ${answer}\n`);
        // Inject exploration result as system message for context
        const conv = agent.getConversationMessages();
        const newConv = [...conv, { role: 'system' as const, content: `[Exploration: ${query}]\n${answer}` }];
        agent = new CodingAgent(client, typedTools, activeModelConfig, systemPrompt, newConv as ChatMessage[]);
      } catch (err: any) {
        console.log(`  ❌ Exploration failed: ${err.message}\n`);
      }
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

    // Session management
    const sessionCmd = input.match(/^\/session\s+(.+)$/i);
    if (sessionCmd) {
      const sub = sessionCmd[1].trim();
      if (sub.toLowerCase() === 'list') {
        const allSessions = await listSessions();
        if (allSessions.length === 0) {
          console.log('\n  No saved sessions.\n');
        } else {
          console.log('\n── Sessions ──────────────────────────────────');
          for (const s of allSessions) {
            const active = s.name === 'default' ? ' ← current' : '';
            console.log(`  ${s.name} (${s.messageCount} msgs)${active}`);
          }
          console.log('──────────────────────────────────────────────\n');
        }
      } else if (sub.toLowerCase().startsWith('new ')) {
        const name = sub.slice(4).trim();
        if (!name) {
          console.log('\n  Usage: /session new <name>\n');
        } else {
          const existing = (await listSessions()).find(s => s.name === name);
          if (existing) {
            console.log(`\n⚠️  Session "${name}" already exists. Use /session delete "${name}" first or choose another name.\n`);
          } else {
            await saveSession(name, []);
            console.log(`\n✅ Session "${name}" created.\n`);
          }
        }
      } else if (sub.toLowerCase().startsWith('rename ')) {
        const rest = sub.slice(7).trim();
        const spaceIdx = rest.indexOf(' ');
        if (spaceIdx === -1) {
          console.log('\n  Usage: /session rename <old> <new>\n');
        } else {
          const oldName = rest.slice(0, spaceIdx);
          const newName = rest.slice(spaceIdx + 1).trim();
          const data = await loadSession(oldName);
          if (!data) {
            console.log(`\n❌ Session "${oldName}" not found.\n`);
          } else if (newName !== oldName && (await listSessions()).find(s => s.name === newName)) {
            console.log(`\n⚠️  Session "${newName}" already exists. Choose another name.\n`);
          } else {
            data.meta.name = newName;
            await saveSession(newName, data.messages, data.meta.modelPreset ?? undefined);
            await deleteSession(oldName);
            if (oldName === 'default') {
              // If we renamed default, save empty default
              await saveSession('default', []);
            }
            console.log(`\n✅ Session "${oldName}" renamed to "${newName}".\n`);
          }
        }
      } else if (sub.toLowerCase().startsWith('delete ')) {
        const name = sub.slice(7).trim();
        if (!name) {
          console.log('\n  Usage: /session delete <name>\n');
        } else {
          await deleteSession(name);
          console.log(`\n✅ Session "${name}" deleted.\n`);
        }
      } else if (sub.toLowerCase() === 'clear') {
        const sessions = await listSessions();
        if (sessions.length === 0) {
          console.log('\nℹ️  No sessions to clear.\n');
        } else {
          const confirmRl = readline.createInterface({ input: stdin, output: stdout });
          const ans = await confirmRl.question(`\n⚠️  Delete ALL ${sessions.length} session(s)? Type "yes" to confirm: `);
          confirmRl.close();
          if (ans.toLowerCase() !== 'yes') {
            console.log('Cancelled.\n');
          } else {
            for (const s of sessions) await deleteSession(s.name);
            console.log(`\n✅ ${sessions.length} session(s) cleared.\n`);
          }
        }
      } else {
        // Assume it's a session name to switch to
        const name = sub.trim();
        const data = await loadSession(name);
        if (!data) {
          console.log(`\n❌ Session "${name}" not found.\n`);
        } else {
          // Save current session first
          const currMessages = agent.getConversationMessages();
          if (currMessages.length > 1) {
            await saveSession('default', currMessages, activeModelConfig);
          }
          // Switch to new session
          const prevMessages = data.messages;
          agent = new CodingAgent(client, typedTools, activeModelConfig, systemPrompt, prevMessages as ChatMessage[]);
          if (data.meta.modelPreset) {
            activeModelConfig = { ...data.meta.modelPreset, fallbacks: data.meta.modelPreset.fallbacks ?? [] };
            client = createClient(activeModelConfig.provider);
          }
          console.log(`\n✅ Switched to session "${name}" (${data.messages.length} msgs).\n`);
        }
      }
      rl.prompt();
      continue;
    }

    const mcpCommand = input.match(/^\/mcp\s+(.+)$/i);
    if (mcpCommand) {
      const sub = mcpCommand[1].trim().toLowerCase();
      if (sub === 'list') {
        const names = mcpManager.getServerNames();
        if (names.length === 0) {
          console.log('\n  No MCP servers connected.\n');
        } else {
          console.log('\n── MCP Servers ──────────────────────────────');
          for (const name of names) {
            const n = mcpManager.getServerToolCount(name);
            console.log(`  ${name} (${n} tools)`);
          }
          console.log('──────────────────────────────────────────────\n');
        }
      } else if (sub.startsWith('connect ')) {
        const args = sub.slice(8).trim();
        const spaceIdx = args.indexOf(' ');
        if (spaceIdx === -1) {
          console.log('\n  Usage: /mcp connect <name> <command> [args...]\n');
        } else {
          const name = args.slice(0, spaceIdx);
          const rest = args.slice(spaceIdx + 1).split(' ');
          const command = rest[0];
          const cargs = rest.slice(1);
          try {
            await mcpManager.connectServer(name, { command, args: cargs });
            const n = mcpManager.getServerToolCount(name);
            const oldTools = typedTools.slice();
            const newTools = getAllTools() as OpenAITool[];
            typedTools.length = 0;
            typedTools.push(...newTools);
            console.log(`\n✅ MCP "${name}" connected (${n} tools). Recreate agent? (tools available for next turn)\n`);
          } catch (err: any) {
            console.log(`\n❌ MCP "${name}" failed: ${err.message}\n`);
          }
        }
      } else if (sub.startsWith('disconnect ')) {
        const name = sub.slice(11).trim();
        await mcpManager.disconnectServer(name);
        const newTools = getAllTools() as OpenAITool[];
        typedTools.length = 0;
        typedTools.push(...newTools);
        console.log(`\n✅ MCP "${name}" disconnected.\n`);
      } else if (sub === 'toggle') {
        setMCPEnabled(!isMCPEnabled());
        const newTools = getAllTools() as OpenAITool[];
        typedTools.length = 0;
        typedTools.push(...newTools);
        console.log(`\n MCP ${isMCPEnabled() ? 'enabled' : 'disabled'}.\n`);
      } else {
        console.log('\n  Commands: list, connect <name> <cmd> [args], disconnect <name>, toggle\n');
      }
      rl.prompt();
      continue;
    }

    const projectCommand = input.match(/^\/project\s+(.+)$/i);
    if (projectCommand) {
      const sub = projectCommand[1].trim().toLowerCase();
      if (sub === 'create') {
        const planSteps = agent.planManager?.getSteps() || [];
        if (planSteps.length === 0) {
          console.log('\n  No plan steps available. Start a session with a task first.\n');
        } else {
          const existing = projectManager.findForSession('default');
          if (existing) {
            console.log(`\n  Session already linked to project "${existing.title}".\n`);
          } else {
            const title = planSteps[0].description.slice(0, 50) || 'Untitled';
            const pm = agent.planManager!;
            await projectManager.loadAll();
            const data = await projectManager.create(pm, title, '', 'default');
            console.log(`\n  ✅ Project "${data.title}" created (id: ${data.id}).\n`);
          }
        }
      } else if (sub === 'list') {
        const list = projectManager.listSummaries();
        if (list.length === 0) {
          console.log('\n  No projects.\n');
        } else {
          console.log('\n── Projects ────────────────────────────────');
          for (const p of list) {
            const pj = p as any;
            console.log(`  ${pj.title} — ${pj.status} (${pj.progress}% — ${pj.done}/${pj.steps})`);
          }
          console.log('──────────────────────────────────────────────\n');
        }
      } else if (sub.startsWith('show ')) {
        const id = sub.slice(5).trim();
        const p = projectManager.get(id);
        if (!p) {
          console.log(`\n  Project "${id}" not found.\n`);
        } else {
          console.log(`\n  Title: ${p.title}`);
          console.log(`  Description: ${p.description || '(none)'}`);
          console.log(`  Status: ${p.status}`);
          console.log(`  Sessions: ${p.sessionIds.join(', ') || '(none)'}`);
          console.log(`  Created: ${p.createdAt}`);
          console.log(`  Updated: ${p.updatedAt}`);
          console.log('  Plan:');
          for (let i = 0; i < p.planSteps.length; i++) {
            const s = p.planSteps[i];
            const mark = s.status === 'completed' ? '✓' : s.status === 'in_progress' ? '…' : ' ';
            console.log(`    ${i + 1}. [${mark}] ${s.description}`);
          }
          console.log();
        }
      } else if (sub.startsWith('status ')) {
        const rest = sub.slice(7).trim();
        const spaceIdx = rest.indexOf(' ');
        if (spaceIdx === -1) {
          console.log('\n  Usage: /project status <id> <active|paused|completed|abandoned>\n');
        } else {
          const id = rest.slice(0, spaceIdx);
          const status = rest.slice(spaceIdx + 1).trim();
          try {
            await projectManager.setStatus(id, status as any);
            console.log(`\n  Project "${id}" status set to "${status}".\n`);
          } catch (err: any) {
            console.log(`\n  ${err.message}\n`);
          }
        }
      } else if (sub.startsWith('delete ')) {
        const id = sub.slice(7).trim();
        if (!id) {
          console.log('\n  Usage: /project delete <id>\n');
        } else {
          await projectManager.delete(id);
          console.log(`\n  Project "${id}" deleted.\n`);
        }
      } else {
        console.log('\n  Commands: list, show <id>, status <id> <val>, delete <id>\n');
      }
      rl.prompt();
      continue;
    }

    console.log('\n⏳ Thinking...\n');

    try {
      let result = await agent.execute(input);
      lastActualModel = result.model;

      // Auto-fallback on rate limit: try next available preset
      if (result.error === 'rate_limit') {
        const allPresets = getAllPresets(userPresets);
        const currentNum = Object.entries(allPresets).find(([, p]) =>
          p.primary === activeModelConfig.primary && p.provider === activeModelConfig.provider
        )?.[0];
        if (currentNum) {
          const entries = Object.entries(allPresets).sort(([a], [b]) => Number(a) - Number(b));
          const idx = entries.findIndex(([n]) => n === currentNum);
          for (let i = idx + 1; i < entries.length; i++) {
            const [nextNum, nextPreset] = entries[i];
            if (nextPreset.provider !== activeModelConfig.provider) {
              const prevProvider = PROVIDERS[activeModelConfig.provider]?.name ?? activeModelConfig.provider;
              const nextProvider = PROVIDERS[nextPreset.provider]?.name ?? nextPreset.provider;
              console.log(`  ⚠️ ${prevProvider} rate limited → auto-switching to [${nextNum}] ${nextProvider}`);
              activeModelConfig = { ...nextPreset };
              client = createClient(activeModelConfig.provider);
              const prevMessages = agent.getConversationMessages();
              agent = new CodingAgent(client, typedTools, activeModelConfig, systemPrompt, prevMessages as ChatMessage[]);
              result = await agent.execute(input);
              lastActualModel = result.model;
              break;
            }
          }
        }
      }

      // Track consecutive text-only responses (no tool calls)
      if (result.toolCallsCount === 0) {
        consecutiveTextOnly++;
      } else {
        consecutiveTextOnly = 0;
      }

      // Auto-fallback if model didn't call tools for 2 consecutive turns
      if (consecutiveTextOnly >= 2) {
        const allPresets = getAllPresets(userPresets);
        const currentNum = Object.entries(allPresets).find(([, p]) =>
          p.primary === activeModelConfig.primary && p.provider === activeModelConfig.provider
        )?.[0];
        if (currentNum) {
          const entries = Object.entries(allPresets).sort(([a], [b]) => Number(a) - Number(b));
          const idx = entries.findIndex(([n]) => n === currentNum);
          for (let i = idx + 1; i < entries.length; i++) {
            const [nextNum, nextPreset] = entries[i];
            if (nextPreset.provider !== activeModelConfig.provider) {
              const prevProvider = PROVIDERS[activeModelConfig.provider]?.name ?? activeModelConfig.provider;
              const nextProvider = PROVIDERS[nextPreset.provider]?.name ?? nextPreset.provider;
              console.log(`  ⚠️ ${prevProvider} responded without tool calls for 2 turns → auto-switching to [${nextNum}] ${nextProvider}`);
              activeModelConfig = { ...nextPreset };
              client = createClient(activeModelConfig.provider);
              const prevMessages = agent.getConversationMessages();
              agent = new CodingAgent(client, typedTools, activeModelConfig, systemPrompt, prevMessages as ChatMessage[]);
              result = await agent.execute(input);
              lastActualModel = result.model;
              consecutiveTextOnly = result.toolCallsCount === 0 ? 1 : 0;
              break;
            }
          }
        }
      }

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

if (require.main === module) {
  startChat();
}
