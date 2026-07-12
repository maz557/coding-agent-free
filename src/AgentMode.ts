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
    instruction: 'You have full tool access. Read, write, edit files, run commands, and make changes.',
  },
  plan: {
    mode: 'plan',
    label: 'Plan',
    description: 'Read-only — explore, search, ask questions',
    instruction: 'You are in read-only plan mode. You can explore the codebase, search files, and answer questions, but you CANNOT write, edit, or execute commands.',
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

export function filterToolsForMode(tools: readonly { function: { name: string } }[], mode: AgentMode): typeof tools {
  if (mode === 'build') return tools;
  return tools.filter(t => READ_ONLY_TOOLS.has(t.function.name));
}
