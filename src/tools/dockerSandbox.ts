import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SandboxOptions {
  image?: string;
  workspaceDir: string;
  enabled: boolean;
}

export class DockerSandbox {
  private options: SandboxOptions;

  constructor(options: SandboxOptions) {
    this.options = options;
  }

  get enabled(): boolean {
    return this.options.enabled;
  }

  async exec(command: string, timeout?: number): Promise<{ stdout: string; stderr: string }> {
    const img = this.options.image || 'ubuntu:22.04';
    const mount = `-v "${this.options.workspaceDir}:/workspace"`;
    const dockerCmd = `docker run --rm ${mount} -w /workspace ${img} sh -c "${command.replace(/"/g, '\\"')}"`;
    const result = await execAsync(dockerCmd, { timeout, maxBuffer: 10 * 1024 * 1024 });
    return result;
  }
}
