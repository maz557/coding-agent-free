export type ToolSafetyLevel = 'safe' | 'sensitive' | 'dangerous';

export interface ApprovalEntry {
  toolName: string;
  args: Record<string, unknown>;
  granted: boolean;
  permanent: boolean;
}

const TOOL_SAFETY: Record<string, ToolSafetyLevel> = {
  read_file: 'safe',
  write_file: 'sensitive',
  replace_in_file: 'sensitive',
  append_file: 'safe',
  list_files: 'safe',
  create_folder: 'safe',
  delete_file: 'sensitive',
  delete_folder: 'sensitive',
  file_info: 'safe',
  search_content: 'safe',
  copy_file: 'safe',
  move_file: 'sensitive',
  run_command: 'sensitive',
  run_tests: 'sensitive',
  web_search: 'safe',
  git_diff: 'safe',
  git_log: 'safe',
  git_commit: 'sensitive',
  create_project: 'safe',
  code_definition: 'safe',
  code_references: 'safe',
  code_hover: 'safe',
  lookup_symbol: 'safe',
  get_diagnostics: 'safe',
};

export function getToolSafetyLevel(name: string): ToolSafetyLevel {
  return TOOL_SAFETY[name] || 'sensitive';
}

export function getToolCategory(name: string): string {
  const s = getToolSafetyLevel(name);
  if (s === 'dangerous') return '🔴 Dangerous';
  if (s === 'sensitive') return '🟡 Sensitive';
  return '🟢 Safe';
}

export class ApprovalStore {
  private permanentAllow = new Set<string>();

  isPermanentlyAllowed(toolName: string, args: Record<string, unknown>): boolean {
    return this.permanentAllow.has(toolName);
  }

  allowPermanently(toolName: string): void {
    this.permanentAllow.add(toolName);
  }

  clear(): void {
    this.permanentAllow.clear();
  }

  toJSON(): string[] {
    return [...this.permanentAllow];
  }

  fromJSON(data: string[]): void {
    this.permanentAllow = new Set(data);
  }
}
