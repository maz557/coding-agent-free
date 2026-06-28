import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

dotenv.config();

// --- 1. Strict Type Definitions for Tool Arguments ---
interface ReadFileArgs { path: string; }
interface WriteFileArgs { path: string; content: string; }
interface ListFilesArgs { directory?: string; }
interface CreateFolderArgs { path: string; }
interface DeleteFileArgs { path: string; }
interface RunCommandArgs { command: string; timeout?: number; }

// Union type to strictly type the execute function
export type ToolArguments = 
  | ReadFileArgs 
  | WriteFileArgs 
  | ListFilesArgs 
  | CreateFolderArgs 
  | DeleteFileArgs 
  | RunCommandArgs;

// --- 2. Workspace Manager Class (Encapsulation) ---
class WorkspaceManager {
  private readonly allowedDir: string;

  constructor() {
    // Resolve and normalize the base directory once
    this.allowedDir = path.resolve(process.env.ALLOWED_DIR || './workspace');
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
      throw new Error(`Access denied: "${inputPath}" is outside the allowed directory "${this.allowedDir}". Set ALLOWED_DIR in .env to expand access (e.g. ALLOWED_DIR=.).`);
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
      return entries
        .map((e) => `${e.isDirectory() ? '[DIR]' : '[FILE]'} ${e.name}`)
        .join('\n') || '(empty directory)';
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
      return `Error deleting file: ${err.message}`;
    }
  }

  async runCommand(args: RunCommandArgs): Promise<string> {
    const timeout = args.timeout ?? 30000; // Default 30 seconds
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
      description: 'Lists files and folders in a directory within the workspace.',
      parameters: {
        type: 'object',
        properties: {
          directory: { type: 'string', description: 'Relative path to the directory. Defaults to root workspace (".").' },
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
];

// --- 4. Instantiation & Executor Export ---
// We instantiate the class here so it can be used as a singleton, 
// keeping the export signature identical to what the main file expects.
const workspace = new WorkspaceManager();

/**
 * Routes the tool call to the appropriate method in the WorkspaceManager
 */
export async function executeTool(name: string, args: ToolArguments): Promise<string> {
  switch (name) {
    case 'read_file':    return workspace.readFile(args as ReadFileArgs);
    case 'write_file':   return workspace.writeFile(args as WriteFileArgs);
    case 'list_files':   return workspace.listFiles(args as ListFilesArgs);
    case 'create_folder':return workspace.createFolder(args as CreateFolderArgs);
    case 'delete_file':  return workspace.deleteFile(args as DeleteFileArgs);
    case 'run_command':  return workspace.runCommand(args as RunCommandArgs);
    default:
      return `Error: Unknown tool "${name}"`;
  }
}