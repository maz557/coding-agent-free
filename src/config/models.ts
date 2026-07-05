export interface ProviderInfo {
  name: string;
  baseURL: string;
  apiKeyEnv: string;
}

export interface ModelPreset {
  provider: string;
  primary: string;
  fallbacks: string[];
  contextWindow?: number;
}

export const PROVIDERS: Record<string, ProviderInfo> = {
  openrouter: { name: 'OpenRouter', baseURL: 'https://openrouter.ai/api/v1', apiKeyEnv: 'OPENROUTER_API_KEY' },
  google:     { name: 'Google AI Studio', baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/', apiKeyEnv: 'GOOGLE_API_KEY' },
  groq:       { name: 'Groq', baseURL: 'https://api.groq.com/openai/v1', apiKeyEnv: 'GROQ_API_KEY' },
  deepseek:   { name: 'DeepSeek', baseURL: 'https://api.deepseek.com', apiKeyEnv: 'DEEPSEEK_API_KEY' },
  mistral:    { name: 'Mistral', baseURL: 'https://api.mistral.ai/v1', apiKeyEnv: 'MISTRAL_API_KEY' },
  ollama:     { name: 'Ollama', baseURL: process.env.OLLAMA_HOST || 'http://localhost:11434/v1', apiKeyEnv: '' },
  lmstudio:   { name: 'LM Studio', baseURL: process.env.LMSTUDIO_HOST || 'http://localhost:1234/v1', apiKeyEnv: '' },
  llamacpp:   { name: 'Llama.cpp', baseURL: process.env.LLAMACPP_HOST || 'http://localhost:8080/v1', apiKeyEnv: '' },
};

export const SYSTEM_PROMPT = `You are a coding assistant that completes tasks step by step using tools.

Rules:
- Focus strictly on the user's request. Do NOT explore random directories or files.
- Read only the files the user asks about. If you need more context, read the most important files first.
- After writing files, ALWAYS run tests/commands to verify they work.
- If a test fails, fix the source code and re-run until it passes.
- Use run_command to execute shell commands.
- Keep tool calls to a minimum. Plan before you act.
- If a tool returns an error (e.g. access denied), tell the user and stop — do NOT retry with different paths.
- When done, summarize what you did and the results.

Clarifying questions:
- Only ask if the request is truly ambiguous (e.g. "delete something" without specifying what).
- If you understand 80%+ of the request, make reasonable assumptions and proceed. For example, if asked to "copy text files in a folder", just find .txt files and copy them — don't ask about naming convention or location.
- Prefer taking small actions first and adjust based on feedback, rather than asking multiple questions upfront.`;

export const FIXED_PRESETS: Record<string, ModelPreset> = {
  '1': { provider: 'openrouter', primary: 'openrouter/free', fallbacks: [] },
  '2': { provider: 'openrouter', primary: 'qwen/qwen3-next-80b-a3b-instruct:free', fallbacks: ['openrouter/free'] },
  '3': { provider: 'openrouter', primary: 'nvidia/nemotron-3-super-120b-a12b:free', fallbacks: ['openrouter/free'], contextWindow: 1_048_576 },
  '4': { provider: 'openrouter', primary: 'openai/gpt-oss-120b:free', fallbacks: ['openrouter/free'] },
  '5': { provider: 'openrouter', primary: 'nvidia/nemotron-3-ultra-550b-a55b:free', fallbacks: ['openrouter/free'], contextWindow: 1_048_576 },
};
