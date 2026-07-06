import { ChatMessage, ToolCall } from './types';
import { estimateMessageTokens, estimateTotalTokens } from './tokenEstimator';

const CONTEXT_USAGE_TARGET = 0.6;
const MAX_EXCHANGES = Number(process.env.MAX_EXCHANGES) || 20;
const MAX_TOOL_RESULT_LENGTH = Number(process.env.MAX_TOOL_RESULT_LENGTH) || 5000;

export class ConversationState {
  private readonly messages: ReadonlyArray<ChatMessage>;

  private constructor(messages: ReadonlyArray<ChatMessage>) {
    this.messages = messages;
  }

  static withSystemPrompt(prompt: string): ConversationState {
    return new ConversationState([{ role: 'system', content: prompt }]);
  }

  static fromMessages(messages: ReadonlyArray<ChatMessage>): ConversationState {
    return new ConversationState([...messages]);
  }

  addUserMessage(content: string): ConversationState {
    return new ConversationState([...this.messages, { role: 'user', content }]);
  }

  addAssistantMessage(content: string | null, toolCalls?: ToolCall[]): ConversationState {
    return new ConversationState([...this.messages, { role: 'assistant', content, tool_calls: toolCalls }]);
  }

  addToolResult(toolCallId: string, content: string, name?: string): ConversationState {
    return new ConversationState([...this.messages, { role: 'tool', tool_call_id: toolCallId, content, name }]);
  }

  removeLastToolResults(count: number): ConversationState {
    let removed = 0;
    const kept: ChatMessage[] = [];
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'tool' && removed < count) {
        removed++;
      } else {
        kept.unshift(this.messages[i]);
      }
    }
    return new ConversationState(kept);
  }

  removeLastAssistantTurn(): ConversationState {
    let idx = -1;
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'assistant' && (this.messages[i] as any).tool_calls?.length > 0) {
        idx = i;
        break;
      }
    }
    if (idx === -1) return this;
    return new ConversationState(this.messages.slice(0, idx));
  }

  addSystemMessage(content: string): ConversationState {
    const idx = this.messages.findIndex(m => m.role === 'system');
    if (idx >= 0) {
      const copy = [...this.messages];
      copy.splice(idx + 1, 0, { role: 'system', content });
      return new ConversationState(copy);
    }
    return new ConversationState([{ role: 'system', content }, ...this.messages]);
  }

  getAllMessages(): ReadonlyArray<ChatMessage> {
    return this.messages;
  }

  private truncateLongResults(messages: ChatMessage[]): ChatMessage[] {
    return messages.map(msg => {
      if (msg.role === 'tool' && msg.content && msg.content.length > MAX_TOOL_RESULT_LENGTH) {
        const truncated = msg.content.slice(0, MAX_TOOL_RESULT_LENGTH) +
          `\n... [truncated ${msg.content.length - MAX_TOOL_RESULT_LENGTH} more chars]`;
        return { ...msg, content: truncated };
      }
      return msg;
    });
  }

  trimToContextWindow(maxTokens: number): ConversationState {
    let messages = this.truncateLongResults([...this.messages]);

    const systemMsgs = messages.filter(m => m.role === 'system');
    const nonSystem = messages.filter(m => m.role !== 'system');

    const userCount = nonSystem.filter(m => m.role === 'user').length;
    if (userCount > MAX_EXCHANGES) {
      const toDrop = userCount - MAX_EXCHANGES;
      let dropped = 0;
      const kept: ChatMessage[] = [];
      for (const msg of nonSystem) {
        if (msg.role === 'user' && dropped < toDrop) {
          dropped++;
          continue;
        }
        kept.push(msg);
      }
      messages = [...systemMsgs, ...kept];
    }

    const safeMax = Math.floor(maxTokens * CONTEXT_USAGE_TARGET);
    const currentTokens = estimateTotalTokens(messages);
    if (currentTokens <= safeMax) return new ConversationState(messages);

    const otherMsgs = messages.filter(m => m.role !== 'system');
    let tokens = estimateTotalTokens(systemMsgs);
    const kept: ChatMessage[] = [];

    for (let i = otherMsgs.length - 1; i >= 0; i--) {
      const msgTokens = estimateMessageTokens(otherMsgs[i]);
      if (tokens + msgTokens <= safeMax) {
        tokens += msgTokens;
        kept.unshift(otherMsgs[i]);
      }
    }

    return new ConversationState([...systemMsgs, ...kept]);
  }
}
