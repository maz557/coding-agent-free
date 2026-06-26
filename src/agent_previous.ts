import * as readline from 'readline/promises';
import { stdin, stdout } from 'process';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tools, executeTool } from './tools/fileManager';

// Local type shims for OpenAI SDK types not exported in this version
type ChatCompletionMessageParam = {
  role: string;
  content: string | null;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
};
type ChatCompletionTool = Record<string, any>;

dotenv.config();

// --- 1. Validation & Setup ---
const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_API_KEY_HERE') {
  console.error('❌ ERROR: Please set a valid OPENROUTER_API_KEY in the .env file.');
  process.exit(1);
}

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: apiKey,
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com',
    'X-Title': 'coding-agent-pro',
  },
});

// --- 2. Types & Interfaces ---
interface ModelPreset {
  primary: string;
  fallbacks: string[];
}

interface AgentResult {
  model: string;
  content: string | null;
  logs: string[];
}

// --- 3. Configurations ---
const FIXED_PRESETS: Record<string, ModelPreset> = {
  '1': { primary: 'openrouter/free', fallbacks: [] },
  '2': { primary: 'qwen/qwen3-next-80b-a3b-instruct:free', fallbacks: ['openrouter/free'] },
  '3': { primary: 'nvidia/nemotron-3-super-120b-a12b:free', fallbacks: ['openrouter/free'] },
  '4': { primary: 'openai/gpt-oss-120b:free', fallbacks: ['openrouter/free'] },
  '5': { primary: 'nvidia/nemotron-3-ultra-550b-a55b:free', fallbacks: ['openrouter/free'] },
};

const PRESETS_FILE = path.join(__dirname, '..', 'presets.json');

async function loadUserPresets(): Promise<Record<string, ModelPreset>> {
  try {
    const data = await fs.readFile(PRESETS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    for (const key in parsed) {
      if (!Array.isArray(parsed[key].fallbacks)) {
        parsed[key].fallbacks = [];
      }
    }
    return parsed;
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      console.log('⚠️ Warning: presets.json was corrupted or invalid. Starting with fresh presets.');
    }
    return {};
  }
}

async function saveUserPresets(presets: Record<string, ModelPreset>): Promise<void> {
  try {
    await fs.writeFile(PRESETS_FILE, JSON.stringify(presets, null, 2), 'utf-8');
  } catch (err: any) {
    console.error(`❌ Failed to save presets to disk: ${err.message}`);
  }
}

let userPresets: Record<string, ModelPreset> = {};
// Will be populated in startChat after async load

let activeModelConfig: ModelPreset = { ...FIXED_PRESETS['1'] };
let lastActualModel = '';

const SYSTEM_PROMPT = `You are a coding assistant that completes tasks step by step using tools.

Rules:
- After writing files, ALWAYS run tests/commands to verify they work.
- If a test fails, fix the source code and re-run until it passes.
- Use run_command to execute shell commands (python, npm, etc).
- Keep tool calls to a minimum — think before calling.
- When done, summarize what you did and what the results were.`;

// --- 4. Agent Class (Encapsulation & Logic Separation) ---
class CodingAgent {
  private client: OpenAI;
  private modelConfig: ModelPreset;
  private tools: ChatCompletionTool[];
  private toolCallsHistory: string[] = [];
  private readonly MAX_DEPTH = 12;

  constructor(client: OpenAI, tools: ChatCompletionTool[], modelConfig: ModelPreset) {
    this.client = client;
    this.tools = tools;
    this.modelConfig = modelConfig;
  }

  /**
   * Detects if the agent is stuck in a repetitive loop
   */
  private detectStuckState(): string | null {
    if (this.toolCallsHistory.length < 3) return null;

    const lastCall = this.toolCallsHistory[this.toolCallsHistory.length - 1];
    if (this.toolCallsHistory.filter(c => c === lastCall).length >= 3) {
      return `"${lastCall}" repeated 3+ times`;
    }

    const last5 = this.toolCallsHistory.slice(-5);
    const toolNames = last5.map(c => c.split('(')[0]);
    if (toolNames.length === 5 && toolNames.every(n => n === toolNames[0])) {
      return `"${toolNames[0]}" called 5 times consecutively`;
    }

    return null;
  }

  /**
   * Executes the main agent loop safely using a while-true structure instead of recursion
   */
  async execute(messages: ChatCompletionMessageParam[]): Promise<AgentResult> {
    const logs: string[] = [];
    let depth = 0;
    let usedModel = this.modelConfig.primary;

    while (depth < this.MAX_DEPTH) {
      depth++;
      
      try {
        const response = await this.client.chat.completions.create({
          model: this.modelConfig.primary,
          messages,
          tools: this.tools,
          tool_choice: 'auto',
          fallbacks: this.modelConfig.fallbacks,
        } as any);

        usedModel = response.model || this.modelConfig.primary;
        logs.push(`  [Model: ${usedModel}]`);

        const choice = response.choices[0];
        const assistantMessage = choice.message;

        // If no tool calls, we are done. Return the final text.
        if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
          return { model: usedModel, content: assistantMessage.content, logs };
        }

        // Log assistant's thought process if any
        if (assistantMessage.content) {
          logs.push(`\nAgent: ${assistantMessage.content}`);
        }

        // Add assistant message to history to maintain context for tool results
        messages.push(assistantMessage as ChatCompletionMessageParam);

        // Process each tool call sequentially
        for (const rawCall of assistantMessage.tool_calls) {
          const toolCall = rawCall as any;
          const functionName = toolCall.function.name;
          let functionArgs: Record<string, unknown>;

          try {
            functionArgs = JSON.parse(toolCall.function.arguments);
          } catch {
            logs.push(`  ⚠️ Failed to parse JSON for ${functionName}`);
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: `Error: Invalid JSON arguments provided: ${toolCall.function.arguments}`,
            });
            continue;
          }

          const callKey = `${functionName}(${JSON.stringify(functionArgs)})`;
          this.toolCallsHistory.push(callKey);
          logs.push(`  🔧 ${callKey}`);

          // Check for infinite loops before executing
          const stuckError = this.detectStuckState();
          if (stuckError) {
            logs.push(`  ⛔ Stuck detected: ${stuckError}`);
            return {
              model: usedModel,
              content: 'I seem to be stuck in a repetitive loop. I will stop here to prevent unnecessary usage.',
              logs
            };
          }

          // Execute the actual tool
          try {
            const result = await executeTool(functionName, functionArgs);
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: String(result),
            });
          } catch (err: any) {
            logs.push(`  ❌ Tool Error: ${err.message}`);
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: `Error executing tool: ${err.message}`,
            });
          }
        }
      } catch (err: any) {
        // Catch network or API errors
        logs.push(`  🚨 API Error: ${err.message}`);
        return {
          model: usedModel,
          content: `An error occurred while communicating with the AI model: ${err.message}`,
          logs
        };
      }
    }

    return {
      model: usedModel,
      content: `I have reached the maximum number of steps (${this.MAX_DEPTH}).`,
      logs
    };
  }
}

// --- 5. CLI & UI Layer ---
function showModels() {
  console.log('\n── Fixed Presets ────────────────────────');
  Object.entries(FIXED_PRESETS).forEach(([k, v]) => {
    const fb = v.fallbacks.length ? ` → ${v.fallbacks[0]}` : '';
    console.log(`  /model ${k}  ${v.primary}${fb}`);
  });
  const userKeys = Object.keys(userPresets).sort();
  if (userKeys.length) {
    console.log('── User Presets ──────────────────────────');
    userKeys.forEach(k => {
      const v = userPresets[k];
      const fb = v.fallbacks.length ? ` → ${v.fallbacks[0]}` : '';
      console.log(`  /model ${k}  ${v.primary}${fb}`);
    });
  }
  console.log('──────────────────────────────────────────');
  const current = activeModelConfig;
  console.log(`  ✅ Active: ${current.primary}${current.fallbacks.length ? ` → ${current.fallbacks[0]}` : ''}`);
}

async function startChat() {
  userPresets = await loadUserPresets();

  console.log('═══════════════════════════════════════════════');
  console.log('  Interactive Coding Agent (OpenRouter) [Pro]');
  console.log('═══════════════════════════════════════════════');
  console.log('  Commands:');
  console.log('    /model <n>   Switch to preset n');
  console.log('    /save <n>    Save last used model as preset n');
  console.log('    /add <n> <m> Manually add model m as preset n');
  console.log('    /remove <n>  Remove a user preset');
  console.log('    /models      Show all presets');
  console.log('    /exit        Quit');
  console.log('═══════════════════════════════════════════════');
  showModels();
  console.log('');

  const rl = readline.createInterface({ input: stdin, output: stdout, prompt: 'You: ' });

  // Initialize message history with strict types
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  // Safely cast imported tools once at the beginning
  const typedTools = tools as ChatCompletionTool[];

  rl.prompt();

  for await (const line of rl) {
    const input = line.trim();
    if (!input) { rl.prompt(); continue; }

    // --- Command Handling ---
    if (input.toLowerCase() === '/exit') {
      console.log('Exiting...');
      rl.close();
      break;
    }

    if (input.toLowerCase() === '/models') {
      showModels();
      rl.prompt();
      continue;
    }

    const modelMatch = input.match(/^\/model\s+(\d+)$/i);
    if (modelMatch) {
      const num = modelMatch[1];
      const allPresets = { ...FIXED_PRESETS, ...userPresets };
      if (allPresets[num]) {
        activeModelConfig = { ...allPresets[num] };
        console.log(`\n✅ Switched to preset ${num}: ${activeModelConfig.primary}\n`);
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
        userPresets[num] = { primary: lastActualModel, fallbacks: ['openrouter/free'] };
        await saveUserPresets(userPresets);
        console.log(`\n✅ Saved as preset ${num}: ${lastActualModel}\n`);
      }
      rl.prompt();
      continue;
    }

    const addMatch = input.match(/^\/add\s+(\d+)\s+(.+)$/i);
    if (addMatch) {
      const num = addMatch[1];
      const modelId = addMatch[2].trim();
      if (FIXED_PRESETS[num]) {
        console.log(`\n❌ Cannot overwrite fixed preset ${num}.\n`);
      } else {
        userPresets[num] = { primary: modelId, fallbacks: ['openrouter/free'] };
        await saveUserPresets(userPresets);
        console.log(`\n✅ Added preset ${num}: ${modelId}\n`);
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

    // --- Agent Execution ---
    messages.push({ role: 'user', content: input });

    console.log('\n⏳ Thinking...\n');
    
    // Instantiate agent with current config for this specific query
    const agent = new CodingAgent(client, typedTools, activeModelConfig);
    
    try {
      const result = await agent.execute(messages);
      
      // Render logs (UI Layer responsibility)
      result.logs.forEach(log => console.log(log));
      
      // Store the actual model used by OpenRouter
      lastActualModel = result.model;
      
      // Store final response in history
      if (result.content) {
        messages.push({ role: 'assistant', content: result.content });
        console.log(`\nAgent: ${result.content}\n`);
      }
    } catch (err: any) {
      console.error(`\n🚨 Unexpected System Error: ${err.message}\n`);
    }

    rl.prompt();
  }
}

startChat();