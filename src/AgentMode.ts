import { OpenAITool } from './types';

export type AgentMode = 'build' | 'plan';

export interface AgentModeConfig {
  mode: AgentMode;
  label: string;
  description: string;
  instruction: string;
}

export const AGENT_MODES: Record<AgentMode, AgentModeConfig> = {
  build: {
    mode: 'build',
    label: 'Build',
    description: 'Full access — read, write, edit, run commands',
    instruction: 'You have full tool access. Read, write, edit files, run commands, and make changes. If you need to research the codebase first, call switch_mode("plan").',
  },
  plan: {
    mode: 'plan',
    label: 'Plan',
    description: 'Read-only — explore, search, ask questions',
    instruction: 'You are in read-only plan mode. Explore the codebase, search files, and answer questions. If you determine a change is needed, call switch_mode("build") to escalate.',
  },
};

const READ_ONLY_TOOLS = new Set([
  'read_file',
  'list_files',
  'grep',
  'glob',
  'web_search',
  'webfetch',
  'question',
  'code_definition',
  'code_references',
  'code_hover',
  'lookup_symbol',
  'get_diagnostics',
]);

export const SWITCH_MODE_TOOL: OpenAITool = {
  type: 'function',
  function: {
    name: 'switch_mode',
    description: 'Switch between build (full read/write access) and plan (read-only research) mode. Call this when you need to escalate from research to making changes, or vice versa.',
    parameters: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['build', 'plan'],
          description: 'Target mode: "build" for full access, "plan" for read-only research',
        },
        reason: {
          type: 'string',
          description: 'Brief explanation of why you are switching modes',
        },
      },
      required: ['mode', 'reason'],
    },
  },
};

export function filterToolsForMode(tools: readonly OpenAITool[], mode: AgentMode): OpenAITool[] {
  if (mode === 'build') return [...tools, SWITCH_MODE_TOOL];
  return [...tools.filter(t => READ_ONLY_TOOLS.has(t.function.name)), SWITCH_MODE_TOOL];
}

const READ_ONLY_PATTERNS = [
  /^(what|how|why|when|where|who|which|is|are|can|does|do|explain|describe|show|find|search|list|tell|summarize)/i,
  /^@explore\s/i,
];
const WRITE_PATTERNS = [
  /^(fix|update|change|add|create|write|implement|refactor|rename|delete|remove|migrate|convert|build|make|edit|modify|patch|improve)/i,
];

export function detectIntent(input: string): AgentMode | null {
  const trimmed = input.trim();
  for (const p of READ_ONLY_PATTERNS) {
    if (p.test(trimmed)) return 'plan';
  }
  for (const p of WRITE_PATTERNS) {
    if (p.test(trimmed)) return 'build';
  }
  return null;
}
