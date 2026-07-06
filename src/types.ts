import OpenAI from 'openai';

export type ToolCallFunction = {
  name: string;
  arguments: string;
};

export type ToolCall = {
  id: string;
  type: 'function';
  function: ToolCallFunction;
};

export type ChatMessage =
  | { role: 'system'; content: string; name?: string }
  | { role: 'user'; content: string; name?: string }
  | { role: 'assistant'; content: string | null; name?: string; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string; name?: string };

export type OpenAITool = {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
};

export interface AgentResult {
  model: string;
  content: string | null;
  logs: string[];
  toolCallsCount: number;
}

export type OpenRouterCreateParams = OpenAI.ChatCompletionCreateParams & {
  extra_body?: {
    models?: string[];
  };
};
