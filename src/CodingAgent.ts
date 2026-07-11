import OpenAI from 'openai';
import pino from 'pino';
import pinoPretty from 'pino-pretty';
import { ChatMessage, ToolCall, OpenAITool, AgentResult, OpenRouterCreateParams } from './types';
import { ConversationState } from './ConversationState';
import { validateToolInput, validateToolOutput, isToolCallArray } from './validation';
import { executeTool } from './tools/toolRegistry';
import { ModelPreset, PROVIDERS } from './config/models';
import { getUserConfig } from './config/userConfig';
import { discoverProviderModels, pickBestModel } from './config/modelDiscovery';

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

  constructor(
    private readonly client: OpenAI,
    private readonly tools: OpenAITool[],
    private readonly modelConfig: ModelPreset,
    systemPrompt: string,
    savedMessages?: ReadonlyArray<ChatMessage>,
  ) {
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
    const base: OpenAI.ChatCompletionCreateParams = {
      model: this.modelConfig.primary,
      messages: messages as OpenAI.ChatCompletionMessageParam[],
      tools: this.tools as OpenAI.ChatCompletionTool[],
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

    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
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
      return '';
    }
  }

  async execute(userInput: string): Promise<AgentResult> {
    this.toolHistory = [];

    this.conversation = this.conversation.addUserMessage(userInput);

    // Planning phase: create a plan before execution
    const planText = await this.plan(userInput);
    if (planText) {
      this.conversation = this.conversation.addSystemMessage(`[Plan]\n${planText}`);
    }

    let depth = 0;
    let usedModel = this.modelConfig.primary;
    let totalToolCalls = 0;
    const toolErrorCount = new Map<string, number>();

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
        const { content, toolCalls, model } = await processStreamWithIdleTimeout(stream, timeoutMs, ac);
        usedModel = model || this.modelConfig.primary;
        console.log();
        console.log(`  [Model: ${usedModel}]`);

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
          } catch (err: any) {
            const msg = err?.message || 'Unknown tool error';
            console.log(`  ❌ Tool Error: ${msg}`);
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
