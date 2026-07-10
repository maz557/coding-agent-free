import OpenAI from 'openai';
import pino from 'pino';
import pinoPretty from 'pino-pretty';
import { ChatMessage, ToolCall, OpenAITool, AgentResult, OpenRouterCreateParams } from './types';
import { ConversationState } from './ConversationState';
import { validateToolInput, validateToolOutput, isToolCallArray } from './validation';
import { executeTool } from './tools/toolRegistry';
import { ModelPreset, PROVIDERS } from './config/models';
import { getUserConfig } from './config/userConfig';

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

async function processStreamResponse(
  stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
): Promise<{ content: string; toolCalls: ToolCall[]; model: string }> {
  let content = '';
  const toolCallAccumulators = new Map<number, { id: string; name: string; arguments: string }>();
  let model = '';

  for await (const chunk of stream) {
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

  async execute(userInput: string): Promise<AgentResult> {
    this.toolHistory = [];

    this.conversation = this.conversation.addUserMessage(userInput);

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

        const stream = await withRetryAndTimeout(
          signal => this.client.chat.completions.create(
            { ...request, stream: true },
            { signal }
          ),
          3,
          timeoutMs
        );

        const { content, toolCalls, model } = await processStreamResponse(stream);
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
