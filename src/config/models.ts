export interface ProviderInfo {
  name: string;
  baseURL: string;
  apiKeyEnv: string;
  defaultModel?: string;
}

export type CodingQuality = 'premium' | 'high' | 'medium' | 'low';

export interface ModelPreset {
  provider: string;
  primary: string;
  fallbacks: string[];
  contextWindow?: number;
  quality?: CodingQuality;
}

export const PROVIDERS: Record<string, ProviderInfo> = {
  openrouter: { name: 'OpenRouter', baseURL: 'https://openrouter.ai/api/v1', apiKeyEnv: 'OPENROUTER_API_KEY' },
  google:     { name: 'Google AI Studio', baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/', apiKeyEnv: 'GOOGLE_API_KEY', defaultModel: 'gemini-2.0-flash' },
  groq:       { name: 'Groq', baseURL: 'https://api.groq.com/openai/v1', apiKeyEnv: 'GROQ_API_KEY', defaultModel: 'mixtral-8x7b-32768' },
  deepseek:   { name: 'DeepSeek', baseURL: 'https://api.deepseek.com', apiKeyEnv: 'DEEPSEEK_API_KEY', defaultModel: 'deepseek-chat' },
  mistral:    { name: 'Mistral', baseURL: 'https://api.mistral.ai/v1', apiKeyEnv: 'MISTRAL_API_KEY', defaultModel: 'mistral-small-latest' },
  anthropic:  { name: 'Anthropic', baseURL: 'https://api.anthropic.com/v1', apiKeyEnv: 'ANTHROPIC_API_KEY', defaultModel: 'claude-3-haiku-20240307' },
  together:   { name: 'Together AI', baseURL: 'https://api.together.xyz/v1', apiKeyEnv: 'TOGETHER_API_KEY', defaultModel: 'mistralai/Mixtral-8x7B-Instruct-v0.1' },
  perplexity: { name: 'Perplexity', baseURL: 'https://api.perplexity.ai', apiKeyEnv: 'PERPLEXITY_API_KEY', defaultModel: 'llama-3.1-sonar-small-128k-online' },
  xai:        { name: 'xAI (Grok)', baseURL: 'https://api.x.ai/v1', apiKeyEnv: 'XAI_API_KEY', defaultModel: 'grok-beta' },
  cohere:     { name: 'Cohere', baseURL: 'https://api.cohere.com/v2', apiKeyEnv: 'COHERE_API_KEY', defaultModel: 'command-r-plus' },
  cerebras:   { name: 'Cerebras', baseURL: 'https://api.cerebras.ai/v1', apiKeyEnv: 'CEREBRAS_API_KEY', defaultModel: 'gpt-oss-120b' },
  ollama:     { name: 'Ollama', baseURL: process.env.OLLAMA_HOST || 'http://localhost:11434/v1', apiKeyEnv: '' },
  lmstudio:   { name: 'LM Studio', baseURL: process.env.LMSTUDIO_HOST || 'http://localhost:1234/v1', apiKeyEnv: '' },
  llamacpp:   { name: 'Llama.cpp', baseURL: process.env.LLAMACPP_HOST || 'http://localhost:8080/v1', apiKeyEnv: '' },
};

export const SYSTEM_PROMPT = `You are a coding assistant that completes tasks step by step using tools.

Available tools are provided to you via the tools[] parameter — use them directly. Do NOT read source code (fileManager.ts or any other file) to discover what tools you have. If the user asks about available tools, tell them to use the /tools command.

Rules:
- Before any action, reason step-by-step internally: (1) understand the request, (2) identify what files/directories you need to read, (3) plan the minimal set of tool calls, (4) execute, (5) verify.
- Focus strictly on the user's request. Do NOT explore random directories or files.
- Read only the files the user asks about. If you need more context, read the most important files first.
- After writing files, ALWAYS run tests/commands to verify they work. Use the run_tests tool to auto-detect and execute the test framework.
- If a test fails, fix the source code and re-run until it passes.
- If SCRATCH_DIR env var is set, ALWAYS write temporary test/output files there (e.g. ./scratch/). Never leave test artifacts in project or workspace root. Clean up scratch files after tests complete.
- Use run_command to execute shell commands.
- Keep tool calls to a minimum. Plan before you act.
- Always use the web_search tool for factual questions, current events, or when the user asks you to search the web. Do NOT answer from your training data if web_search is available.
- If a tool returns an error (e.g. access denied), tell the user and stop — do NOT retry with different paths.
- When done, summarize what you did and the results.
- This system runs on Windows with PowerShell 7+. Use PowerShell commands, not Unix/bash commands.
  For example: Get-Date instead of date, Get-ChildItem instead of ls, Select-String instead of grep.
  Do NOT use bash syntax like $(), TZ=, $(date), or pipes with | unless they are PowerShell-safe.

Clarifying questions:
- Only ask if the request is truly ambiguous (e.g. "delete something" without specifying what).
- If you understand 80%+ of the request, make reasonable assumptions and proceed. For example, if asked to "copy text files in a folder", just find .txt files and copy them — don't ask about naming convention or location.
- Prefer taking small actions first and adjust based on feedback, rather than asking multiple questions upfront.`;

export const FIXED_PRESETS: Record<string, ModelPreset> = {
  '1': { provider: 'mistral', primary: 'mistral-medium-2604', fallbacks: [], quality: 'premium' },
  '2': { provider: 'google', primary: 'gemini-2.0-flash', fallbacks: [], quality: 'premium' },
  '3': { provider: 'groq', primary: 'llama-3.1-70b-versatile', fallbacks: ['mixtral-8x7b-32768'], quality: 'high' },
  '4': { provider: 'openrouter', primary: 'openai/gpt-oss-120b:free', fallbacks: ['openrouter/free'], quality: 'high' },
  '5': { provider: 'xai', primary: 'grok-beta', fallbacks: [], quality: 'high' },
  '6': { provider: 'llamacpp', primary: 'ornith-agent', fallbacks: [], quality: 'medium' },
};
