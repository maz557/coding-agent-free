import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import * as dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import { DockerSandbox } from './dockerSandbox';

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
  'mkfs', 'mkfs.ext', 'mkfs.ntfs', 'mkfs.fat',
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
  ' format ', ' format:', ' format,',
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
interface GitDiffArgs { target?: string; staged?: boolean; }
interface GitCommitArgs { message: string; files?: string; }
interface GitLogArgs { maxCount?: number; }
interface WebSearchArgs { query: string; }
interface RunTestsArgs { directory?: string; }

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
  | MoveFileArgs
  | GitDiffArgs
  | GitCommitArgs
  | GitLogArgs
  | WebSearchArgs
  | RunTestsArgs;

// --- 2. Workspace Manager Class (Encapsulation) ---
class WorkspaceManager {
  private writeDir: string;
  private readDir: string;
  private extraAllowedPaths: string[] = [];
  private sandbox: DockerSandbox;

  constructor() {
    this.writeDir = path.resolve(process.env.ALLOWED_DIR || './workspace');
    this.readDir = path.resolve(process.env.READ_ALLOWED_DIR || '.');
    const scratch = process.env.SCRATCH_DIR;
    if (scratch) {
      const resolved = path.resolve(scratch);
      if (!this.extraAllowedPaths.includes(resolved)) {
        this.extraAllowedPaths.push(resolved);
      }
    }
    this.sandbox = new DockerSandbox({
      enabled: process.env.DOCKER_SANDBOX_ENABLED === 'true',
      image: process.env.DOCKER_IMAGE || 'ubuntu:22.04',
      workspaceDir: this.writeDir,
    });
  }

  setAllowedDir(dir: string): void {
    const resolved = path.resolve(dir);
    this.writeDir = resolved;
    this.readDir = resolved;
  }

  setWriteDir(dir: string): void {
    this.writeDir = path.resolve(dir);
  }

  allowExtraPath(p: string): void {
    const resolved = path.resolve(p);
    if (!this.extraAllowedPaths.includes(resolved)) {
      this.extraAllowedPaths.push(resolved);
    }
  }

  private isInside(base: string, target: string): boolean {
    const norm = base + path.sep;
    return target === base || target.startsWith(norm);
  }

  /**
   * Secures the path: reads allowed from readDir, writes only inside writeDir
   */
  private sanitizePath(inputPath: string, mode: 'read' | 'write' = 'write'): string {
    if (!inputPath) throw new Error('Path cannot be empty.');
    const isRead = mode === 'read';
    const baseDir = isRead ? this.readDir : this.writeDir;

    // If inputPath already contains baseDir name (e.g. workspace/file when baseDir is workspace),
    // resolve from parent to avoid double prefix
    const fromParent = path.resolve(baseDir, '..', inputPath);
    let resolvedPath = path.resolve(baseDir, inputPath);
    if (this.isInside(baseDir, fromParent) && fromParent !== resolvedPath) {
      resolvedPath = fromParent;
    }

    if (this.isInside(baseDir, resolvedPath)) {
      if (isRead && this.writeDir !== this.readDir) {
        try {
          if (!fsSync.existsSync(resolvedPath)) {
            const wsPath = path.resolve(this.writeDir, inputPath);
            if (this.isInside(this.writeDir, wsPath) && fsSync.existsSync(wsPath)) {
              return wsPath;
            }
          }
        } catch { /* ignore and use readDir path */ }
      }
      return resolvedPath;
    }
    for (const extra of this.extraAllowedPaths) {
      if (this.isInside(extra, resolvedPath)) return resolvedPath;
    }
    const label = isRead ? 'read' : 'write';
    throw new Error(`Access denied: cannot ${label} "${inputPath}"`);
  }

  // --- Tool Implementations ---

  async readFile(args: ReadFileArgs): Promise<string> {
    try {
      const fullPath = this.sanitizePath(args.path, 'read');
      return await fs.readFile(fullPath, 'utf-8');
    } catch (err: any) {
      return `Error reading file: ${err.message}`;
    }
  }

  async writeFile(args: WriteFileArgs): Promise<string> {
    try {
      const fullPath = this.sanitizePath(args.path, 'write');
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, args.content, 'utf-8');
      return `File written successfully: ${args.path}`;
    } catch (err: any) {
      return `Error writing file: ${err.message}`;
    }
  }

  async listFiles(args: ListFilesArgs): Promise<string> {
    try {
      const dirPath = this.sanitizePath(args.directory || '.', 'read');
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
      const fullPath = this.sanitizePath(args.path, 'write');
      await fs.mkdir(fullPath, { recursive: true });
      return `Folder created successfully: ${args.path}`;
    } catch (err: any) {
      return `Error creating folder: ${err.message}`;
    }
  }

  async deleteFile(args: DeleteFileArgs): Promise<string> {
    try {
      const fullPath = this.sanitizePath(args.path, 'write');
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
      const fullPath = this.sanitizePath(args.path, 'write');
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.appendFile(fullPath, args.content, 'utf-8');
      return `Content appended successfully to: ${args.path}`;
    } catch (err: any) {
      return `Error appending to file: ${err.message}`;
    }
  }

  async copyFile(args: CopyFileArgs): Promise<string> {
    try {
      const sourcePath = this.sanitizePath(args.source, 'read');
      const destPath = this.sanitizePath(args.destination, 'write');
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
      const sourcePath = this.sanitizePath(args.source, 'write');
      const destPath = this.sanitizePath(args.destination, 'write');
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
      const fullPath = this.sanitizePath(args.path, 'write');
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
      const fullPath = this.sanitizePath(args.path, 'read');
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

    const dirPath = this.sanitizePath(directory, 'read');

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
                results.push(`${path.relative(this.readDir, full)}:${i + 1}: ${lines[i].trim()}`);
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
      const fullPath = this.sanitizePath(args.path, 'write');
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

  private async execShell(command: string, timeout?: number): Promise<{ stdout: string; stderr: string }> {
    if (this.sandbox.enabled) {
      return this.sandbox.exec(command, timeout);
    }
    return execAsync(command, { cwd: this.writeDir, timeout, maxBuffer: 10 * 1024 * 1024 });
  }

  async gitDiff(args: GitDiffArgs): Promise<string> {
    try {
      const staged = args.staged ? '--staged' : '';
      const target = args.target ? ` -- "${args.target}"` : '';
      const { stdout, stderr } = await this.execShell(`git diff ${staged}${target}`);
      return (stdout + (stderr ? '\n[STDERR]:\n' + stderr : '')).trim() || '(no diff)';
    } catch (err: any) {
      return `Error: ${err.message}`;
    }
  }

  async gitCommit(args: GitCommitArgs): Promise<string> {
    try {
      const files = (args.files || '.').trim();
      const { stdout: addOut } = await this.execShell(`git add ${files}`);
      const { stdout, stderr } = await this.execShell(`git commit -m "${args.message.replace(/"/g, '\\"')}"`);
      return ((addOut || '') + '\n' + stdout + (stderr ? '\n[STDERR]:\n' + stderr : '')).trim();
    } catch (err: any) {
      return `Error: ${err.message}`;
    }
  }

  async gitLog(args: GitLogArgs): Promise<string> {
    try {
      const n = args.maxCount || 10;
      const { stdout, stderr } = await this.execShell(`git log --oneline -${n}`);
      return (stdout + (stderr ? '\n[STDERR]:\n' + stderr : '')).trim() || '(no commits)';
    } catch (err: any) {
      return `Error: ${err.message}`;
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
      const { stdout, stderr } = await this.execShell(args.command, timeout);
      let result = '';
      if (stdout) result += stdout;
      if (stderr) result += '\n[STDERR]:\n' + stderr;
      return result.trim() || '(no output)';
    } catch (err: any) {
      let msg = `[Command Failed] Exit code: ${err.code || 'unknown'}\n`;
      if (err.stdout) msg += err.stdout + '\n';
      if (err.stderr) msg += '[STDERR]:\n' + err.stderr;
      return msg.trim() || 'Command execution failed with no output.';
    }
  }

  // --- Web Search ---
  async webSearch(query: string): Promise<string> {
    if (!query.trim()) return 'Error: query is required';

    const engines = [
      { name: 'DuckDuckGo', search: () => this.searchDuckDuckGo(query) },
      { name: 'Bing', search: () => this.searchBing(query) },
      { name: 'Google', search: () => this.searchGoogle(query) },
    ];

    for (const engine of engines) {
      try {
        const results = await engine.search();
        if (results.length > 0) {
          return results.map((r, i) => `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.snippet}`).join('\n\n');
        }
      } catch {
        continue;
      }
    }
    return 'No results found (all search engines unreachable).';
  }

  private fetchURL(url: string, method: string = 'GET', body?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const mod = u.protocol === 'https:' ? https : http;
      const options: any = {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 8000,
      };
      if (body) {
        options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        options.headers['Content-Length'] = Buffer.byteLength(body);
      }
      const req = mod.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
      if (body) req.write(body);
      req.end();
    });
  }

  private parseDuckDuckGoResults(html: string): Array<{ title: string; url: string; snippet: string }> {
    const results: Array<{ title: string; url: string; snippet: string }> = [];
    // Each result: <h2 class="result__title"><a rel="nofollow" class="result__a" href="URL">TITLE</a></h2>
    // Snippet: <a class="result__snippet" href="URL">SNIPPET</a>
    const titleRegex = /<h2[^>]*class="[^"]*result__title[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRegex = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
    const titles: Array<{ url: string; title: string }> = [];
    let m;
    while ((m = titleRegex.exec(html)) !== null) {
      let url = m[1].trim();
      const uddg = url.match(/uddg=([^&]+)/);
      if (uddg) url = decodeURIComponent(uddg[1]);
      titles.push({ url, title: m[2].replace(/<[^>]+>/g, '').trim() });
    }
    const snippets: string[] = [];
    while ((m = snippetRegex.exec(html)) !== null) {
      snippets.push(m[1].replace(/<[^>]+>/g, '').trim());
    }
    for (let i = 0; i < titles.length && results.length < 8; i++) {
      results.push({ title: titles[i].title, url: titles[i].url, snippet: snippets[i] || '' });
    }
    return results;
  }

  private decodeBingUrl(ckUrl: string): string {
    // bing tracking: https://www.bing.com/ck/a?...&u=a1aHR0cHM6Ly9ub2RlanMub3JnLw&ntb=1
    // u param is base64 of the real URL
    const uMatch = ckUrl.match(/[?&]u=([^&]+)/i);
    if (uMatch) {
      try {
        return Buffer.from(decodeURIComponent(uMatch[1]), 'base64').toString('utf-8');
      } catch { /* ignore */ }
    }
    return ckUrl;
  }

  private parseBingResults(html: string): Array<{ title: string; url: string; snippet: string }> {
    const results: Array<{ title: string; url: string; snippet: string }> = [];
    // Find each b_algo block
    const blockRegex = /<li class="b_algo"[^>]*>([\s\S]*?)<\/li>/gi;
    let m;
    while ((m = blockRegex.exec(html)) !== null) {
      const block = m[1];
      // First <a> with href is the result link
      const linkMatch = block.match(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
      // First <p> is the snippet
      const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      if (linkMatch) {
        const url = this.decodeBingUrl(linkMatch[1].trim());
        const title = linkMatch[2].replace(/<[^>]+>/g, '').trim();
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';
        if (title) results.push({ title, url, snippet });
        if (results.length >= 8) break;
      }
    }
    return results;
  }

  private async searchDuckDuckGo(query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
    const body = `q=${encodeURIComponent(query)}`;
    // DDG sometimes returns a non-result page; retry once
    for (let attempt = 0; attempt < 2; attempt++) {
      const html = await this.fetchURL('https://html.duckduckgo.com/html/', 'POST', body);
      const results = this.parseDuckDuckGoResults(html);
      if (results.length > 0) return results;
    }
    return [];
  }

  private async searchBing(query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
    const html = await this.fetchURL(`https://www.bing.com/search?q=${encodeURIComponent(query)}`);
    return this.parseBingResults(html);
  }

  private async searchGoogle(query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX;
    if (!apiKey || !cx) {
      throw new Error('Google Search requires GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_CX in .env');
    }
    const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}&num=8`;
    const json = await this.fetchURL(url);
    const data = JSON.parse(json);
    if (data.error) throw new Error(data.error.message || 'Google Search API error');
    return (data.items || []).map((item: any) => ({
      title: item.title || '',
      url: item.link || '',
      snippet: item.snippet || '',
    }));
  }

  // --- Test Runner ---
  async runTests(directory?: string): Promise<string> {
    const dir = directory || '.';
    const hasPackageJson = fsSync.existsSync(path.join(dir, 'package.json'));
    const hasPytestCfg = fsSync.existsSync(path.join(dir, 'pytest.ini')) || fsSync.existsSync(path.join(dir, 'pyproject.toml')) || fsSync.existsSync(path.join(dir, 'setup.cfg'));

    if (hasPackageJson) {
      const pkg = JSON.parse(fsSync.readFileSync(path.join(dir, 'package.json'), 'utf-8'));
      const scripts = pkg.scripts || {};
      if (scripts.test) {
        return this.runTestCommand('npm test', dir);
      }
      if (scripts['test:unit']) {
        return this.runTestCommand('npm run test:unit', dir);
      }
      if (scripts.unit) {
        return this.runTestCommand('npm run unit', dir);
      }
    }

    if (hasPytestCfg) {
      return this.runTestCommand('python -m pytest', dir);
    }

    if (hasPackageJson) {
      return this.runTestCommand('npx jest --passWithNoTests', dir);
    }

    return 'No test framework detected. Known test files: package.json scripts, pytest config.';
  }

  private async runTestCommand(cmd: string, cwd: string): Promise<string> {
    try {
      const { stdout, stderr } = await this.execShell(cmd, 120000);
      let result = '';
      if (stdout) result += stdout.slice(0, 3000);
      if (stderr) result += '\n[STDERR]:\n' + stderr.slice(0, 1000);
      return result.trim() || '(no output)';
    } catch (err: any) {
      let msg = `[Tests Failed] Exit code: ${err.code || 'unknown'}\n`;
      if (err.stdout) msg += err.stdout.slice(0, 3000) + '\n';
      if (err.stderr) msg += '[STDERR]:\n' + err.stderr.slice(0, 1000);
      return msg.trim() || 'Tests failed with no output.';
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
  {
    type: 'function',
    function: {
      name: 'git_diff',
      description: 'Shows unstaged working tree changes. Use staged:true to see staged changes, or target to filter by file path.',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Optional file or path to limit the diff to.' },
          staged: { type: 'boolean', description: 'If true, show staged (index) changes instead of unstaged.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'git_commit',
      description: 'Adds files to the staging area and commits them with a message. Uses `git add` + `git commit`.',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Commit message.' },
          files: { type: 'string', description: 'Files to add (space-separated). Defaults to "." (all changes).' },
        },
        required: ['message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'git_log',
      description: 'Shows recent commit history (--oneline format).',
      parameters: {
        type: 'object',
        properties: {
          maxCount: { type: 'number', description: 'Maximum number of commits to show (default 10).' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for information. Tries DuckDuckGo, then Bing, then Google (if configured). DuckDuckGo and Bing are free with no API key. Google requires GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_CX in .env. Returns up to 8 results with title, URL, and snippet.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query.' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_tests',
      description: 'Detects the test framework (npm test, pytest, jest) in the project directory and runs the tests. Use this after writing code to verify it works.',
      parameters: {
        type: 'object',
        properties: {
          directory: { type: 'string', description: 'Optional directory to run tests in (defaults to current).' },
        },
        required: [],
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
    case 'git_diff':        result = await workspace.gitDiff(args as GitDiffArgs); break;
    case 'git_commit':      result = await workspace.gitCommit(args as GitCommitArgs); break;
    case 'git_log':         result = await workspace.gitLog(args as GitLogArgs); break;
    case 'web_search':      result = await workspace.webSearch((args as WebSearchArgs).query); break;
    case 'run_tests':       result = await workspace.runTests((args as RunTestsArgs).directory); break;
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

export function setWriteDir(dir: string): void {
  workspace.setWriteDir(dir);
}