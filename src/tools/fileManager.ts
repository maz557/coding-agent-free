import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

dotenv.config();

// --- Structured Error Classes ---
export class FileNotFoundError extends Error {
  constructor(filePath: string) {
    super(`File not found: ${filePath}`);
    this.name = 'FileNotFoundError';
  }
}

export class PermissionError extends Error {
  constructor(filePath: string) {
    super(`Permission denied: ${filePath}`);
    this.name = 'PermissionError';
  }
}

export class CommandExecutionError extends Error {
  constructor(command: string, exitCode: number | string, stderr: string) {
    super(`Command failed: ${command}\nExit code: ${exitCode}\nStderr: ${stderr}`);
    this.name = 'CommandExecutionError';
  }
}

export class DangerousCommandError extends Error {
  constructor(command: string) {
    super(`Dangerous command blocked: ${command}`);
    this.name = 'DangerousCommandError';
  }
}

export class ReplaceContentError extends Error {
  constructor(filePath: string) {
    super(`Could not find the specified text to replace in: ${filePath}`);
    this.name = 'ReplaceContentError';
  }
}

// --- Dangerous Command Denylist ---
const DENYLISTED_COMMANDS = [
  'rm -rf', 'rm -fr',
  'dd',
  'mkfs', 'mkfs.ext', 'mkfs.ntfs', 'mkfs.fat', 'format',
  'fdisk', 'parted', 'mkswap',
  'chmod -R 0',
  'chown -R 0:0',
  'mv / ', 'mv /* ',
  'cp -r / ', 'cp -rf / ',
  '> /dev/sd', '> /dev/nvme',
  'wget -O /', 'curl -o /',
  ':(){ :|:& };:',
  'shutdown', 'reboot', 'halt', 'poweroff',
  'init 0', 'init 6',
  'sudo rm', 'sudo dd', 'sudo mkfs', 'sudo fdisk', 'sudo shutdown',
  'reg delete', 'reg add',
  'diskpart',
  'Stop-Computer', 'Restart-Computer',
  'Remove-Item -Recurse -Force',
];

function isCommandDangerous(command: string): boolean {
  return DENYLISTED_COMMANDS.some((denied) => command.toLowerCase().includes(denied));
}

// --- Safe Mode Whitelist ---
const WHITELISTED_COMMANDS = [
  'ls', 'dir', 'cat', 'type', 'head', 'tail', 'grep', 'findstr', 'rg', 'find', 'where',
  'echo', 'printf', 'pwd', 'cd',
  'node', 'npm', 'npx', 'python', 'python3', 'pip', 'pip3', 'deno', 'bun', 'yarn', 'pnpm',
  'tsc', 'ts-node',
  'git', 'cargo', 'rustc', 'go', 'dotnet', 'java', 'mvn', 'gradle',
  'docker', 'docker-compose',
  'mkdir', 'copy', 'xcopy', 'robocopy', 'move', 'ren', 'del', 'erase', 'attrib',
  'curl', 'wget', 'ping', 'ipconfig', 'netstat', 'nslookup', 'tracert',
  'tar', 'gzip', 'gunzip', 'zip', 'unzip',
  'chmod', 'chown',
  'date', 'time', 'ver', 'whoami', 'hostname', 'systeminfo', 'tasklist', 'taskkill',
  'sort', 'uniq', 'wc', 'cut', 'tee', 'awk', 'sed',
  'powershell', 'pwsh',
  'Get-', 'Set-', 'Write-', 'Read-', 'New-', 'Remove-', 'Copy-', 'Move-', 'Rename-',
  'Invoke-', 'Test-', 'Join-', 'Split-', 'Resolve-', 'ConvertTo-', 'ConvertFrom-',
  'Format-', 'Out-', 'Clear-', 'Select-', 'Sort-', 'Group-', 'Measure-', 'Where-',
  'ForEach-', 'Add-', 'Start-Process',
];

function isCommandWhitelisted(command: string): boolean {
  const lower = command.toLowerCase().trimStart();
  return WHITELISTED_COMMANDS.some((allowed) => lower.startsWith(allowed.toLowerCase()));
}

let safeModeEnabled = false;

export function setSafeMode(enabled: boolean): void {
  safeModeEnabled = enabled;
}

export function isSafeModeEnabled(): boolean {
  return safeModeEnabled;
}

// --- 1. Strict Type Definitions for Tool Arguments ---
interface ReadFileArgs { path: string; }
interface WriteFileArgs { path: string; content: string; }
interface ListFilesArgs { directory?: string; details?: boolean; }
interface CreateFolderArgs { path: string; }
interface DeleteFileArgs { path: string; }
interface DeleteFolderArgs { path: string; recursive?: boolean; }
interface FileInfoArgs { path: string; }
interface SearchContentArgs { pattern: string; directory?: string; filePattern?: string; maxResults?: number; }
interface ReplaceInFileArgs { path: string; old_str: string; new_str: string; }
interface RunCommandArgs { command: string; timeout?: number; }
interface AppendFileArgs { path: string; content: string; }
interface CopyFileArgs { source: string; destination: string; }
interface MoveFileArgs { source: string; destination: string; }

export type ToolArguments = 
  | ReadFileArgs 
  | WriteFileArgs 
  | ListFilesArgs 
  | CreateFolderArgs 
  | DeleteFileArgs 
  | DeleteFolderArgs
  | FileInfoArgs
  | SearchContentArgs
  | ReplaceInFileArgs
  | RunCommandArgs
  | AppendFileArgs
  | CopyFileArgs
  | MoveFileArgs;

// --- 2. Workspace Manager Class (Encapsulation) ---
class WorkspaceManager {
  private allowedDir: string;
  private extraAllowedPaths: string[] = [];

  constructor() {
    // Resolve and normalize the base directory once
    this.allowedDir = path.resolve(process.env.ALLOWED_DIR || './workspace');
  }

  setAllowedDir(dir: string): void {
    this.allowedDir = path.resolve(dir);
  }

  allowExtraPath(p: string): void {
    const resolved = path.resolve(p);
    if (!this.extraAllowedPaths.includes(resolved)) {
      this.extraAllowedPaths.push(resolved);
    }
  }

  /**
   * Secures the path to prevent directory traversal attacks
   */
  private sanitizePath(inputPath: string): string {
    if (!inputPath) throw new Error('Path cannot be empty.');
    
    const resolvedPath = path.resolve(this.allowedDir, inputPath);
    const normalizedAllowed = this.allowedDir + path.sep;
    
    // Check if the resolved path is strictly inside the allowed directory
    if (resolvedPath !== this.allowedDir && !resolvedPath.startsWith(normalizedAllowed)) {
      // Check user-approved extra paths
      for (const extra of this.extraAllowedPaths) {
        const normalizedExtra = extra + path.sep;
        if (resolvedPath === extra || resolvedPath.startsWith(normalizedExtra)) {
          return resolvedPath;
        }
      }
      throw new Error(`Access denied: "${inputPath}" is outside the allowed directory "${this.allowedDir}". Use command: /allow "${inputPath}"`);
    }
    
    return resolvedPath;
  }

  // --- Tool Implementations ---

  async readFile(args: ReadFileArgs): Promise<string> {
    try {
      const fullPath = this.sanitizePath(args.path);
      return await fs.readFile(fullPath, 'utf-8');
    } catch (err: any) {
      return `Error reading file: ${err.message}`;
    }
  }

  async writeFile(args: WriteFileArgs): Promise<string> {
    try {
      const fullPath = this.sanitizePath(args.path);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, args.content, 'utf-8');
      return `File written successfully: ${args.path}`;
    } catch (err: any) {
      return `Error writing file: ${err.message}`;
    }
  }

  async listFiles(args: ListFilesArgs): Promise<string> {
    try {
      const dirPath = this.sanitizePath(args.directory || '.');
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      if (entries.length === 0) return '(empty directory)';

      if (args.details) {
        const detailed = await Promise.all(
          entries.map(async (e) => {
            const entryPath = path.join(dirPath, e.name);
            const stat = await fs.stat(entryPath);
            const size = stat.size < 1024 ? `${stat.size} B` :
                         stat.size < 1024 * 1024 ? `${(stat.size / 1024).toFixed(1)} KB` :
                         `${(stat.size / (1024 * 1024)).toFixed(1)} MB`;
            const mtime = stat.mtime.toISOString().substring(0, 19);
            const type = e.isDirectory() ? '[DIR]' : '[FILE]';
            return `${type} ${e.name} (${size}, ${mtime})`;
          })
        );
        return detailed.join('\n');
      }

      return entries
        .map((e) => `${e.isDirectory() ? '[DIR]' : '[FILE]'} ${e.name}`)
        .join('\n');
    } catch (err: any) {
      return `Error listing directory: ${err.message}`;
    }
  }

  async createFolder(args: CreateFolderArgs): Promise<string> {
    try {
      const fullPath = this.sanitizePath(args.path);
      await fs.mkdir(fullPath, { recursive: true });
      return `Folder created successfully: ${args.path}`;
    } catch (err: any) {
      return `Error creating folder: ${err.message}`;
    }
  }

  async deleteFile(args: DeleteFileArgs): Promise<string> {
    try {
      const fullPath = this.sanitizePath(args.path);
      await fs.unlink(fullPath);
      return `File deleted successfully: ${args.path}`;
    } catch (err: any) {
      if (err.code === 'ENOENT') throw new FileNotFoundError(args.path);
      if (err.code === 'EACCES') throw new PermissionError(args.path);
      return `Error deleting file: ${err.message}`;
    }
  }

  async appendFile(args: AppendFileArgs): Promise<string> {
    try {
      const fullPath = this.sanitizePath(args.path);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.appendFile(fullPath, args.content, 'utf-8');
      return `Content appended successfully to: ${args.path}`;
    } catch (err: any) {
      return `Error appending to file: ${err.message}`;
    }
  }

  async copyFile(args: CopyFileArgs): Promise<string> {
    try {
      const sourcePath = this.sanitizePath(args.source);
      const destPath = this.sanitizePath(args.destination);
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.copyFile(sourcePath, destPath);
      return `File copied from ${args.source} to ${args.destination}`;
    } catch (err: any) {
      if (err.code === 'ENOENT') throw new FileNotFoundError(args.source);
      if (err.code === 'EACCES') throw new PermissionError(args.source);
      return `Error copying file: ${err.message}`;
    }
  }

  async moveFile(args: MoveFileArgs): Promise<string> {
    try {
      const sourcePath = this.sanitizePath(args.source);
      const destPath = this.sanitizePath(args.destination);
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.rename(sourcePath, destPath);
      return `File moved from ${args.source} to ${args.destination}`;
    } catch (err: any) {
      if (err.code === 'ENOENT') throw new FileNotFoundError(args.source);
      if (err.code === 'EACCES') throw new PermissionError(args.source);
      return `Error moving file: ${err.message}`;
    }
  }

  // --- New enhanced tools ---

  async deleteFolder(args: DeleteFolderArgs): Promise<string> {
    try {
      const fullPath = this.sanitizePath(args.path);
      await fs.rm(fullPath, { recursive: args.recursive ?? false, force: false });
      return `Folder deleted successfully: ${args.path}${args.recursive ? ' (recursively)' : ''}`;
    } catch (err: any) {
      if (err.code === 'ENOENT') throw new FileNotFoundError(args.path);
      if (err.code === 'ENOTEMPTY' || err.code === 'ERR_FS_EISDIR') return `Error: folder is not empty. Use recursive:true to delete it.`;
      return `Error deleting folder: ${err.message}`;
    }
  }

  async fileInfo(args: FileInfoArgs): Promise<string> {
    try {
      const fullPath = this.sanitizePath(args.path);
      const stat = await fs.stat(fullPath);
      return JSON.stringify({
        path: args.path,
        size: stat.size,
        sizeFormatted: stat.size < 1024 ? `${stat.size} B` :
                       stat.size < 1024 * 1024 ? `${(stat.size / 1024).toFixed(1)} KB` :
                       `${(stat.size / (1024 * 1024)).toFixed(1)} MB`,
        isDirectory: stat.isDirectory(),
        isFile: stat.isFile(),
        permissions: stat.mode.toString(8).slice(-3),
        modified: stat.mtime.toISOString(),
        created: stat.birthtime.toISOString(),
      }, null, 2);
    } catch (err: any) {
      if (err.code === 'ENOENT') throw new FileNotFoundError(args.path);
      return `Error getting file info: ${err.message}`;
    }
  }

  async searchContent(args: SearchContentArgs): Promise<string> {
    const directory = args.directory || '.';
    const maxResults = args.maxResults ?? 50;
    const filePattern = args.filePattern;
    let results: string[] = [];

    const dirPath = this.sanitizePath(directory);

    const matchesPattern = (fileName: string): boolean => {
      if (!filePattern) return true;
      if (filePattern.startsWith('*.')) return fileName.endsWith(filePattern.slice(1));
      return fileName.includes(filePattern);
    };

    const walk = async (currentDir: string): Promise<void> => {
      if (results.length >= maxResults) return;
      let entries;
      try {
        entries = await fs.readdir(currentDir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (results.length >= maxResults) break;
        const full = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else if (entry.isFile() && matchesPattern(entry.name)) {
          try {
            const stat = await fs.stat(full);
            if (stat.size > 1024 * 1024) continue;
            const content = await fs.readFile(full, 'utf-8');
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
              if (results.length >= maxResults) break;
              if (lines[i].includes(args.pattern)) {
                results.push(`${path.relative(this.allowedDir, full)}:${i + 1}: ${lines[i].trim()}`);
              }
            }
          } catch {
            // skip unreadable files
          }
        }
      }
    };

    await walk(dirPath);
    if (results.length === 0) return 'No matches found.';
    return results.join('\n');
  }

  async replaceInFile(args: ReplaceInFileArgs): Promise<string> {
    try {
      const fullPath = this.sanitizePath(args.path);
      const content = await fs.readFile(fullPath, 'utf-8');
      const index = content.indexOf(args.old_str);
      if (index === -1) {
        throw new ReplaceContentError(args.path);
      }
      const newContent = content.slice(0, index) + args.new_str + content.slice(index + args.old_str.length);
      await fs.writeFile(fullPath, newContent, 'utf-8');
      return `Successfully replaced text in: ${args.path}`;
    } catch (err: any) {
      if (err instanceof ReplaceContentError) throw err;
      if (err.code === 'ENOENT') throw new FileNotFoundError(args.path);
      return `Error replacing text: ${err.message}`;
    }
  }

  async runCommand(args: RunCommandArgs): Promise<string> {
    if (safeModeEnabled && !isCommandWhitelisted(args.command)) {
      return `[Safe Mode] Command not in whitelist: ${args.command}\nAllowed commands: ls, cat, grep, node, npm, python, git status/log/diff, npx tsc, and similar safe operations.`;
    }
    const timeout = args.timeout ?? 30000;
    if (isCommandDangerous(args.command)) {
      throw new DangerousCommandError(args.command);
    }
    try {
      const { stdout, stderr } = await execAsync(args.command, { 
        cwd: this.allowedDir, 
        timeout,
        maxBuffer: 10 * 1024 * 1024 // Increase buffer to 10MB for large outputs
      });
      
      let result = '';
      if (stdout) result += stdout;
      if (stderr) result += '\n[STDERR]:\n' + stderr;
      return result.trim() || '(no output)';
    } catch (err: any) {
      // Even if the command fails (e.g., syntax error in python), we return it as text for the LLM to read
      let msg = `[Command Failed] Exit code: ${err.code || 'unknown'}\n`;
      if (err.stdout) msg += err.stdout + '\n';
      if (err.stderr) msg += '[STDERR]:\n' + err.stderr;
      return msg.trim() || 'Command execution failed with no output.';
    }
  }
}

// --- 3. Tool Definitions (Strictly Typed for OpenAI SDK) ---
export const tools = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Reads the contents of a file from the workspace.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path to the file within the workspace.' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Writes content to a file. Creates parent directories if needed. Overwrites existing files.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path to the file within the workspace.' },
          content: { type: 'string', description: 'The exact text content to write to the file.' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: 'Lists files and folders in a directory within the workspace. Use details:true to include size and modification time.',
      parameters: {
        type: 'object',
        properties: {
          directory: { type: 'string', description: 'Relative path to the directory. Defaults to root workspace (".").' },
          details: { type: 'boolean', description: 'If true, show size and modification date for each entry.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_folder',
      description: 'Creates a folder (and any parent folders) in the workspace.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path to the folder to create.' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_file',
      description: 'Deletes a file from the workspace. Does NOT delete folders.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path to the file to delete.' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_folder',
      description: 'Deletes a folder. Set recursive:true to delete non‑empty folders.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path to the folder to delete.' },
          recursive: { type: 'boolean', description: 'Whether to delete contents recursively (default false).' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'file_info',
      description: 'Returns detailed information about a file or folder (size, permissions, timestamps).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path to the file/folder.' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_content',
      description: 'Searches for a text pattern in files under a directory. Supports filtering by file extension (e.g. "*.ts"). Returns line:content results.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'The exact string to search for (case‑sensitive).' },
          directory: { type: 'string', description: 'Directory to search in (default ".").' },
          filePattern: { type: 'string', description: 'Optional file pattern like "*.js" or "*.json".' },
          maxResults: { type: 'number', description: 'Maximum number of results (default 50).' },
        },
        required: ['pattern'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'replace_in_file',
      description: 'Replaces the first occurrence of old_str with new_str inside a file. The text must match exactly, including whitespace.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path to the file to modify.' },
          old_str: { type: 'string', description: 'The exact text to replace.' },
          new_str: { type: 'string', description: 'The text to replace it with.' },
        },
        required: ['path', 'old_str', 'new_str'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: 'Runs a shell command in the workspace directory and returns stdout/stderr.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'The shell command to execute (e.g. "python test.py", "npm install").' },
          timeout: { type: 'number', description: 'Timeout in milliseconds (default 30000).' },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'append_file',
      description: 'Appends content to a file. Creates the file if it does not exist.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path to the file within the workspace.' },
          content: { type: 'string', description: 'The text content to append to the file.' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'copy_file',
      description: 'Copies a file from one location to another within the workspace.',
      parameters: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Relative path to the source file.' },
          destination: { type: 'string', description: 'Relative path to the destination file.' },
        },
        required: ['source', 'destination'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'move_file',
      description: 'Moves or renames a file within the workspace.',
      parameters: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Relative path to the source file.' },
          destination: { type: 'string', description: 'Relative path to the destination file.' },
        },
        required: ['source', 'destination'],
      },
    },
  },
];

// --- 4. Instantiation & Executor Export ---
// We instantiate the class here so it can be used as a singleton, 
// keeping the export signature identical to what the main file expects.
const workspace = new WorkspaceManager();

/**
 * Routes the tool call to the appropriate method in the WorkspaceManager
 */
const MAX_RESULT = Number(process.env.MAX_TOOL_RESULT_LENGTH) || 5000;

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + `\n\n...(output truncated, ${text.length - maxLen} more chars)`;
}

export async function executeTool(name: string, args: ToolArguments): Promise<string> {
  let result: string;
  switch (name) {
    case 'read_file':       result = await workspace.readFile(args as ReadFileArgs); break;
    case 'write_file':      result = await workspace.writeFile(args as WriteFileArgs); break;
    case 'list_files':      result = await workspace.listFiles(args as ListFilesArgs); break;
    case 'create_folder':   result = await workspace.createFolder(args as CreateFolderArgs); break;
    case 'delete_file':     result = await workspace.deleteFile(args as DeleteFileArgs); break;
    case 'delete_folder':   result = await workspace.deleteFolder(args as DeleteFolderArgs); break;
    case 'file_info':       result = await workspace.fileInfo(args as FileInfoArgs); break;
    case 'search_content':  result = await workspace.searchContent(args as SearchContentArgs); break;
    case 'replace_in_file': result = await workspace.replaceInFile(args as ReplaceInFileArgs); break;
    case 'append_file':     result = await workspace.appendFile(args as AppendFileArgs); break;
    case 'copy_file':       result = await workspace.copyFile(args as CopyFileArgs); break;
    case 'move_file':       result = await workspace.moveFile(args as MoveFileArgs); break;
    case 'run_command':     result = await workspace.runCommand(args as RunCommandArgs); break;
    default:
      return `Error: Unknown tool "${name}"`;
  }
  return truncate(result, MAX_RESULT);
}

export function allowExtraPath(p: string): void {
  workspace.allowExtraPath(p);
}

export function setAllowedDir(dir: string): void {
  workspace.setAllowedDir(dir);
}