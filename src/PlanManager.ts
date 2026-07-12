export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export type PlanStep = {
  number: number;
  description: string;
  status: StepStatus;
  toolCalls: string[];
};

const STEP_REGEX = /^(\d+)[.)]\s*(.+)/;

export class PlanManager {
  private steps: PlanStep[] = [];
  private lastMarked = -1;

  parsePlan(text: string): PlanStep[] {
    this.steps = [];
    this.lastMarked = -1;

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      const m = line.match(STEP_REGEX);
      if (m) {
        this.steps.push({
          number: parseInt(m[1], 10),
          description: m[2].replace(/^[-*]\s*/, ''),
          status: 'pending',
          toolCalls: [],
        });
      }
    }

    if (this.steps.length === 0) {
      this.steps = [{ number: 1, description: text.slice(0, 120), status: 'pending', toolCalls: [] }];
    }

    return this.steps;
  }

  markCompleted(stepIndex: number): void {
    if (stepIndex >= 0 && stepIndex < this.steps.length) {
      this.steps[stepIndex].status = 'completed';
      this.lastMarked = stepIndex;
    }
  }

  markSkipped(stepIndex: number): void {
    if (stepIndex >= 0 && stepIndex < this.steps.length) {
      this.steps[stepIndex].status = 'skipped';
    }
  }

  recordToolCall(stepIndex: number, toolName: string): void {
    if (stepIndex >= 0 && stepIndex < this.steps.length) {
      this.steps[stepIndex].toolCalls.push(toolName);
      if (this.steps[stepIndex].status === 'pending') {
        this.steps[stepIndex].status = 'in_progress';
      }
    }
  }

  matchToolToStep(toolName: string, args: Record<string, unknown>): number {
    const pathArg = typeof args.path === 'string' ? args.path.toLowerCase() : '';
    const fileArg = typeof args.file === 'string' ? args.file.toLowerCase() : '';

    for (let i = 0; i < this.steps.length; i++) {
      if (this.steps[i].status === 'completed' || this.steps[i].status === 'skipped') continue;

      const desc = this.steps[i].description.toLowerCase();
      if (this.toolMatchesStep(toolName, pathArg, fileArg, desc)) return i;
    }

    for (let i = this.steps.length - 1; i >= 0; i--) {
      if (this.steps[i].status === 'completed' || this.steps[i].status === 'skipped') continue;
      return i;
    }

    return -1;
  }

  private toolMatchesStep(toolName: string, pathArg: string, fileArg: string, desc: string): boolean {
    const keywords = desc.replace(/[.,!?]/g, '').split(/\s+/).filter(w => w.length > 3);

    if (pathArg && keywords.some(k => pathArg.includes(k) || pathArg.endsWith(k))) return true;
    if (fileArg && keywords.some(k => fileArg.includes(k) || fileArg.endsWith(k))) return true;

    if (toolName === 'read_file' && desc.includes('read')) return true;
    if (toolName === 'write_file' && (desc.includes('creat') || desc.includes('writ') || desc.includes('add') || desc.includes('implement'))) return true;
    if (toolName === 'run_command' && (desc.includes('run') || desc.includes('test') || desc.includes('instal') || desc.includes('build'))) return true;
    if (toolName === 'replace_in_file' && (desc.includes('modif') || desc.includes('edit') || desc.includes('update') || desc.includes('chang'))) return true;
    if (toolName === 'search_content' && (desc.includes('search') || desc.includes('find') || desc.includes('locat'))) return true;
    if (toolName === 'run_tests' && desc.includes('test')) return true;
    if (toolName === 'web_search' && (desc.includes('search') || desc.includes('research') || desc.includes('look up'))) return true;

    return false;
  }

  getProgressSummary(): string {
    if (this.steps.length === 0) return '';

    const total = this.steps.length;
    const done = this.steps.filter(s => s.status === 'completed').length;
    const progress = Math.round((done / total) * 100);

    const lines = this.steps.map(s => {
      const icon = s.status === 'completed' ? '[✓]' : s.status === 'in_progress' ? '[→]' : s.status === 'skipped' ? '[–]' : '[ ]';
      return `${icon} ${s.number}. ${s.description}`;
    });

    return `[Progress ${progress}% (${done}/${total})]\n${lines.join('\n')}`;
  }

  toJSON(): { steps: PlanStep[] } {
    return { steps: this.steps };
  }

  fromJSON(data: { steps: PlanStep[] }): void {
    this.steps = data.steps || [];
  }

  getSteps(): ReadonlyArray<PlanStep> {
    return this.steps;
  }

  hasPlan(): boolean {
    return this.steps.length > 0;
  }
}
