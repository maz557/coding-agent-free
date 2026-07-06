import { ChatMessage } from './types';

export function estimateMessageTokens(msg: ChatMessage): number {
  let tokens = 4;
  if (msg.name) tokens += Math.ceil(msg.name.length / 4);
  if (msg.content) {
    tokens += Math.ceil(msg.content.length / 4);
  }
  if ('tool_calls' in msg && msg.tool_calls) {
    for (const tc of msg.tool_calls) {
      tokens += Math.ceil(tc.function.name.length / 4);
      tokens += Math.ceil(tc.function.arguments.length / 4);
    }
  }
  return tokens;
}

export function estimateTotalTokens(messages: ReadonlyArray<ChatMessage>): number {
  return messages.reduce((sum, msg) => sum + estimateMessageTokens(msg), 0);
}
