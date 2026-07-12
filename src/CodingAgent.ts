import OpenAI from 'openai';
import pino from 'pino';
import pinoPretty from 'pino-pretty';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { ChatMessage, ToolCall, OpenAITool, AgentResult, OpenRouterCreateParams } from './types';
import { ConversationState } from './ConversationState';
import { validateToolInput, validateToolOutput, isToolCallArray } from './validation';
import { executeTool } from './tools/toolRegistry';
import { ModelPreset, PROVIDERS } from './config/models';
import { getUserConfig } from './config/userConfig';
import { discoverProviderModels, pickBestModel } from './config/modelDiscovery';
import { PlanManager, PlanStep } from './PlanManager';
import { AgentMode, AGENT_MODES, filterToolsForMode, detectIntent, SWITCH_MODE_TOOL } from './AgentMode';

export interface AgentCallbacks {
  onToken?: (token: string) => void;
  onToolCall?: (name: string, args: string) => void;
  onToolResult?: (name: string, content: string) => void;
  onDiff?: (path: string, before: string, after: string) => void;
  onStatus?: (text: string) => void;
  onModel?: (model: string) => void;
  onPlan?: (steps: PlanStep[]) => void;
  onError?: (message: string) => void;
}

const logger = pino(
  { level: process.env.LOG_LEVEL || 'info' },
  pinoPretty({ destination: 2, sync: true })
);

const DEFAULT_CONTEXT_WINDOW = 128_000;

async function withRetryAndTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  maxRetries = 3,
  timeoutMs = 120000,
  baseDelay = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await fn(controller.signal);
      clearTimeout(timeoutId);
      return result;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;

      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ attempt, message }, 'Request attempt failed');

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  const finalMessage = lastError instanceof Error ? lastError.message : String(lastError);
  const finalErr = lastError instanceof Error ? lastError : new Error(finalMessage);
  if (!finalErr.message.startsWith('All ')) {
    finalErr.message = `All ${maxRetries} attempts failed. Last error: ${finalMessage}`;
  }
  throw finalErr;
}

/**
 * Wraps an async iterable stream with an idle timeout that resets on each chunk.
 * Uses the same AbortController (ac) that was passed to the initial API call,
 * so aborting it cancels the underlying HTTP fetch (matching server.ts pattern).
 */
async function processStreamWithIdleTimeout(
  stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
  timeoutMs: number,
  ac: AbortController,
  onToken?: (token: string) => void,
): Promise<{ content: string; toolCalls: ToolCall[]; model: string }> {
  let content = '';
  const toolCallAccumulators = new Map<number, { id: string; name: string; arguments: string }>();
  let model = '';
  let idleTo: ReturnType<typeof setTimeout>;

  const resetIdle = () => {
    clearTimeout(idleTo);
    idleTo = setTimeout(() => { if (!ac.signal.aborted) ac.abort(); }, timeoutMs);
  };

  // Start idle timeout (covers time between chunks)
  idleTo = setTimeout(() => { if (!ac.signal.aborted) ac.abort(); }, timeoutMs);

  try {
    for await (const chunk of stream) {
      if (ac.signal.aborted) break;
      resetIdle();

      if (chunk.model) model = chunk.model;

      const choice = chunk.choices?.[0];
      if (!choice) continue;

      const delta = choice.delta;
      if (!delta) continue;

      if (delta.content) {
        content += delta.content;
        process.stdout.write(delta.content);
        onToken?.(delta.content);
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const index = tc.index ?? 0;
          if (!toolCallAccumulators.has(index)) {
            toolCallAccumulators.set(index, { id: '', name: '', arguments: '' });
          }
          const acc = toolCallAccumulators.get(index)!;
          if (tc.id) acc.id += tc.id;
          if (tc.function?.name) acc.name += tc.function.name;
          if (tc.function?.arguments) acc.arguments += tc.function.arguments;
        }
      }
    }
  } finally {
    clearTimeout(idleTo);
  }

  const toolCalls: ToolCall[] = [];
  for (const [, acc] of toolCallAccumulators) {
    if (acc.name) {
      toolCalls.push({
        id: acc.id,
        type: 'function',
        function: { name: acc.name, arguments: acc.arguments },
      });
    }
  }

  return { content, toolCalls, model };
}

export class CodingAgent {
  private toolHistory: string[] = [];
  private readonly MAX_DEPTH = 20;
  private conversation: ConversationState;
  private _planManager: PlanManager | null = null;
  private _mode: AgentMode;
  private callbacks?: AgentCallbacks;

  get planManager(): PlanManager | null {
    return this._planManager;
  }

  get mode(): AgentMode {
    return this._mode;
  }

  constructor(
    private readonly client: OpenAI,
    private readonly tools: OpenAITool[],
    private readonly modelConfig: ModelPreset,
    systemPrompt: string,
    savedMessages?: ReadonlyArray<ChatMessage>,
    mode: AgentMode = 'build',
    callbacks?: AgentCallbacks,
  ) {
    this._mode = mode;
    this.callbacks = callbacks;
    if (savedMessages && savedMessages.length > 0) {
      this.conversation = ConversationState.fromMessages(savedMessages);
    } else {
      this.conversation = ConversationState.withSystemPrompt(systemPrompt);
    }
  }

  getConversationMessages(): ReadonlyArray<ChatMessage> {
    return this.conversation.getAllMessages();
  }

  getModelConfig(): ModelPreset {
    return this.modelConfig;
  }

  private detectStuckState(): string | null {
    if (this.toolHistory.length < 5) return null;

    const lastCall = this.toolHistory[this.toolHistory.length - 1];
    const repeatedCount = this.toolHistory.filter(c => c === lastCall).length;
    if (repeatedCount >= 3) return `"${lastCall}" repeated 3+ times`;

    const last5 = this.toolHistory.slice(-5);
    if (last5.every(c => c === last5[0])) return `"${last5[0]}" called 5 times consecutively`;

    return null;
  }

  private buildModelList(): string[] {
    return Array.from(new Set([this.modelConfig.primary, ...this.modelConfig.fallbacks].filter(Boolean)));
  }

  private buildRequest(messages: ReadonlyArray<ChatMessage>): OpenAI.ChatCompletionCreateParams {
    const modeTools = filterToolsForMode(this.tools, this._mode);
    const base: OpenAI.ChatCompletionCreateParams = {
      model: this.modelConfig.primary,
      messages: messages as OpenAI.ChatCompletionMessageParam[],
      tools: modeTools as OpenAI.ChatCompletionTool[],
      tool_choice: 'auto',
    };
    if (this.modelConfig.provider === 'openrouter') {
      (base as OpenRouterCreateParams).extra_body = {
        models: this.buildModelList(),
      };
    }
    return base;
  }

  private async plan(userInput: string): Promise<string> {
    const planMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: 'You are a planning assistant. Given a user request, output a concise numbered plan (3-7 steps) covering what needs to be done. Respond with ONLY the plan, no extra text.' },
      { role: 'user', content: userInput },
    ];

    const provInfo = PROVIDERS[this.modelConfig.provider];
    const isLocal = provInfo && !provInfo.apiKeyEnv;
    const timeoutMs = isLocal ? getUserConfig().localTimeoutMs : getUserConfig().cloudTimeoutMs;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const stream = await this.client.chat.completions.create(
        { model: this.modelConfig.primary, messages: planMessages, stream: true },
        { signal: controller.signal }
      );
      clearTimeout(id);
      let planText = '';
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) planText += delta;
      }
      console.log(`\n  📋 Plan:\n${planText.split('\n').filter(l => l.trim()).map(l => `    ${l}`).join('\n')}\n`);
      return planText.trim();
    } catch {
      clearTimeout(id);
      return '';
    }
  }

  async execute(userInput: string, modeOverride?: AgentMode): Promise<AgentResult> {
    this.toolHistory = [];

    // Auto-detect intent if no explicit override
    if (!modeOverride) {
      const detected = detectIntent(userInput);
      if (detected && detected !== this._mode) {
        this._mode = detected;
        console.log(`  [Auto-switched to ${AGENT_MODES[detected].label} mode]`);
      }
    } else {
      this._mode = modeOverride;
    }

    this.conversation = this.conversation.addUserMessage(userInput);

    // Inject mode instruction
    const modeConfig = AGENT_MODES[this._mode];
    this.conversation = this.conversation.addSystemMessage(`[Mode: ${modeConfig.label}]\n${modeConfig.instruction}`);

    // Planning phase: create a plan before execution
    this._planManager = new PlanManager();
    this.callbacks?.onStatus?.('planning');
    const planText = await this.plan(userInput);
    if (planText) {
      const parsed = this._planManager.parsePlan(planText);
      this.conversation = this.conversation.addSystemMessage(`[Plan]\n${planText}`);
      console.log(`  📋 Plan (${parsed.length} steps)`);
      this.callbacks?.onPlan?.(parsed);
    }
    this.callbacks?.onStatus?.('executing');

    let depth = 0;
    let usedModel = this.modelConfig.primary;
    let totalToolCalls = 0;
    const toolErrorCount = new Map<string, number>();
    let lastProgressUpdate = -1;

    while (depth < this.MAX_DEPTH) {
      depth++;

      try {
        const contextWindow = this.modelConfig.contextWindow ?? DEFAULT_CONTEXT_WINDOW;
        this.conversation = this.conversation.trimToContextWindow(contextWindow);
        const request = this.buildRequest(this.conversation.getAllMessages());

        const provInfo = PROVIDERS[this.modelConfig.provider];
        const isLocal = provInfo && !provInfo.apiKeyEnv;
        const timeoutMs = isLocal ? getUserConfig().localTimeoutMs : getUserConfig().cloudTimeoutMs;

        // Shared AbortController for idle timeout — matches server.ts pattern
        // The same signal is passed to the HTTP fetch, so aborting it cancels the stream
        const ac = new AbortController();

        const stream = await withRetryAndTimeout(
          signal => {
            // Link per-attempt signal to shared controller so retry timeout also aborts
            signal.addEventListener('abort', () => { if (!ac.signal.aborted) ac.abort(); });
            return this.client.chat.completions.create(
              { ...request, stream: true },
              { signal: ac.signal }
            );
          },
          3,
          timeoutMs
        );

        // Idle timeout handled entirely inside processStreamWithIdleTimeout
        // (covers first token + resets on each subsequent chunk)
        const { content, toolCalls, model } = await processStreamWithIdleTimeout(
          stream, timeoutMs, ac,
          this.callbacks?.onToken,
        );
        usedModel = model || this.modelConfig.primary;
        console.log();
        console.log(`  [Model: ${usedModel}]`);
        this.callbacks?.onModel?.(usedModel);

        if (!isToolCallArray(toolCalls) || toolCalls.length === 0) {
          this.conversation = this.conversation.addAssistantMessage(content || null);
          return {
            model: usedModel,
            content: null,
            logs: [],
            toolCallsCount: totalToolCalls,
          };
        }

        this.conversation = this.conversation.addAssistantMessage(content || null, toolCalls);
        console.log();

        const seenCalls = new Set<string>();

        for (const toolCall of toolCalls) {
          const functionName = toolCall.function.name;

          const knownToolNames = this.tools.map(t => t.function.name);
          if (!knownToolNames.includes(functionName)) {
            const errorMsg = `Unknown tool "${functionName}". Available: ${knownToolNames.join(', ')}`;
            console.log(`  ⚠️ ${errorMsg}`);
            this.conversation = this.conversation.addToolResult(toolCall.id, `Error: ${errorMsg}`, functionName);
            continue;
          }

          let parsedArgs: unknown;
          let callKey: string;
          try {
            parsedArgs = validateToolInput(functionName, JSON.parse(toolCall.function.arguments));
            callKey = `${functionName}(${JSON.stringify(parsedArgs)})`;
          } catch (err: any) {
            const errorMsg = `Invalid arguments for ${functionName}: ${err?.message || String(err)}`;
            console.log(`  ⚠️ ${errorMsg}`);
            this.conversation = this.conversation.addToolResult(toolCall.id, `Error: ${errorMsg}`, functionName);
            continue;
          }

          if (seenCalls.has(callKey)) {
            console.log(`  ⚠️ Duplicate skipped: ${callKey}`);
            this.conversation = this.conversation.addToolResult(toolCall.id, `Warning: Duplicate skipped. Already called: ${callKey}`, functionName);
            continue;
          }
          seenCalls.add(callKey);

          const functionArgs = parsedArgs as Record<string, unknown>;
          this.toolHistory.push(callKey);
          console.log(`  🔧 ${callKey}`);
          totalToolCalls++;

          // Match tool call to plan step and track progress
          if (this._planManager.hasPlan()) {
            const stepIdx = this._planManager.matchToolToStep(functionName, functionArgs);
            if (stepIdx >= 0) {
              this._planManager.recordToolCall(stepIdx, callKey);
              this._planManager.markCompleted(stepIdx);
            }
          }

          const stuckError = this.detectStuckState();
          if (stuckError) {
            console.log(`  ⛔ Stuck detected: ${stuckError}`);
            this.conversation = this.conversation
              .removeLastAssistantTurn()
              .addSystemMessage(
                `[RECOVERY] You were stuck: ${stuckError}. The last assistant turn has been undone. ` +
                `Think carefully about what went wrong and try a COMPLETELY DIFFERENT approach. ` +
                `Do NOT repeat the same tool call with identical arguments.`
              );
            break;
          }

          // Handle switch_mode tool internally
          if (functionName === 'switch_mode') {
            const targetMode = functionArgs.mode as string;
            const reason = functionArgs.reason as string || '';
            if (targetMode === 'build' || targetMode === 'plan') {
              const oldMode = this._mode;
              this._mode = targetMode;
              this.conversation = this.conversation.addToolResult(toolCall.id, `Switched from ${AGENT_MODES[oldMode].label} to ${AGENT_MODES[this._mode].label} mode. Reason: ${reason}`, functionName);
              this.conversation = this.conversation.addSystemMessage(`[Mode: ${AGENT_MODES[this._mode].label}]\n${AGENT_MODES[this._mode].instruction}`);
              console.log(`  🔄 Switched to ${AGENT_MODES[this._mode].label} mode: ${reason}`);
            } else {
              this.conversation = this.conversation.addToolResult(toolCall.id, `Error: Invalid mode "${targetMode}". Use "build" or "plan".`, functionName);
            }
            continue;
          }

          // Capture diff for file-writing tools
          const fileWriteTools = ['write_file', 'replace_in_file', 'append_file'];
          let beforeContent: string | null = null;
          if (this.callbacks?.onDiff && fileWriteTools.includes(functionName)) {
            const filePathArg = functionArgs.path as string;
            if (filePathArg) {
              try {
                const allowedDir = path.resolve(process.env.ALLOWED_DIR || './workspace');
                const fullPath = path.resolve(allowedDir, filePathArg);
                beforeContent = await fsp.readFile(fullPath, 'utf-8');
              } catch { /* file may not exist yet */ }
            }
          }

          this.callbacks?.onToolCall?.(functionName, toolCall.function.arguments);

          try {
            const rawResult = await executeTool(functionName, functionArgs);
            const validatedResult = validateToolOutput(functionName, rawResult);
            const content =
              typeof validatedResult === 'string'
                ? validatedResult
                : validatedResult === undefined
                  ? ''
                  : JSON.stringify(validatedResult);

            this.conversation = this.conversation.addToolResult(toolCall.id, content, functionName);

            // Emit diff event after file write
            if (this.callbacks?.onDiff && fileWriteTools.includes(functionName)) {
              const filePathArg = functionArgs.path as string;
              if (filePathArg) {
                try {
                  const allowedDir = path.resolve(process.env.ALLOWED_DIR || './workspace');
                  const fullPath = path.resolve(allowedDir, filePathArg);
                  const afterContent = await fsp.readFile(fullPath, 'utf-8');
                  if (afterContent !== beforeContent) {
                    this.callbacks.onDiff(filePathArg, beforeContent || '', afterContent);
                  }
                } catch { /* ignore */ }
              }
            }

            this.callbacks?.onToolResult?.(functionName, content);

            // Inject progress summary every 3 steps or on completion
            if (this._planManager.hasPlan()) {
              const done = this._planManager.getSteps().filter(s => s.status === 'completed').length;
              if (done > lastProgressUpdate && (done % 3 === 0 || done === this._planManager.getSteps().length)) {
                lastProgressUpdate = done;
                this.conversation = this.conversation.addSystemMessage(this._planManager.getProgressSummary());
              }
            }
          } catch (err: any) {
            const msg = err?.message || 'Unknown tool error';
            console.log(`  ❌ Tool Error: ${msg}`);
            this.callbacks?.onError?.(msg);
            const errCount = (toolErrorCount.get(functionName) || 0) + 1;
            toolErrorCount.set(functionName, errCount);
            if (errCount >= 3) {
              this.conversation = this.conversation
                .removeLastAssistantTurn()
                .addSystemMessage(
                  `[RECOVERY] Tool "${functionName}" failed ${errCount} consecutive times with error: ${msg}. ` +
                  `The last assistant turn has been undone. Think carefully about what went wrong and try a COMPLETELY DIFFERENT approach.`
                );
              break;
            }
            this.conversation = this.conversation.addToolResult(toolCall.id, `Error executing tool: ${msg}`, functionName);
          }
        }
      } catch (err: any) {
        const msg = err?.message || 'Unknown API error';
        console.log(`  🚨 API Error: ${msg}`);
        this.callbacks?.onError?.(msg);
        logger.error({ error: err, depth }, 'Agent execution failed');
        const isRateLimit = err?.status === 429 || err?.code === 'rate_limit_exceeded';

        // Auto-correct invalid model (e.g. "not a valid model ID")
        if (err?.status === 400 && msg.toLowerCase().includes('valid model')) {
          const oldModel = this.modelConfig.primary;
          console.log(`  🔍 Model "${oldModel}" invalid — discovering alternatives for ${this.modelConfig.provider}...`);
          const models = await discoverProviderModels(this.modelConfig.provider);
          const best = pickBestModel(models);
          if (best && best !== oldModel) {
            console.log(`  ✅ Auto-corrected: ${oldModel} → ${best}`);
            this.modelConfig.primary = best;
            continue; // retry with new model
          }
          console.log(`  ❌ No alternative found for ${this.modelConfig.provider}.`);
        }

        return {
          model: usedModel,
          content: `An error occurred while communicating with the AI model: ${msg}`,
          logs: [],
          toolCallsCount: totalToolCalls,
          error: isRateLimit ? 'rate_limit' : 'api_error',
        };
      }
    }

    return {
      model: usedModel,
      content: `I have reached the maximum number of steps (${this.MAX_DEPTH}).`,
      logs: [],
      toolCallsCount: totalToolCalls,
    };
  }
}
