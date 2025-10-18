/**
 * Runtime abstraction utilities
 * Provides Node.js/Bun compatible file I/O and process utilities
 */

import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';

/**
 * Runtime detection
 */
export function isBun(): boolean {
  return typeof Bun !== 'undefined';
}

export function isNode(): boolean {
  return typeof process !== 'undefined' && !isBun();
}

/**
 * File operations abstraction
 */
export async function readFileAsText(filePath: string): Promise<string> {
  if (isBun()) {
    return await Bun.file(filePath).text();
  }
  return fs.promises.readFile(filePath, 'utf-8');
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  if (isBun()) {
    await Bun.write(filePath, content);
  } else {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fs.promises.writeFile(filePath, content, 'utf-8');
  }
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Process execution abstraction
 */
export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function executeCommand(command: string): Promise<CommandResult> {
  if (isBun()) {
    return executeBun(command);
  }
  return executeNode(command);
}

/**
 * Bun command execution
 */
async function executeBun(command: string): Promise<CommandResult> {
  try {
    const process = Bun.spawn(command.split(' '), {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const stdout = await new Response(process.stdout).text();
    const stderr = await new Response(process.stderr).text();
    const exitCode = await process.exited;

    return { stdout, stderr, exitCode };
  } catch (error) {
    throw error;
  }
}

/**
 * Node.js command execution using child_process
 */
async function executeNode(command: string): Promise<CommandResult> {
  return new Promise((resolve) => {
    try {
      const parts = command.split(' ');
      const cmd = parts[0]!;
      const args = parts.slice(1);

      const child = spawn(cmd, args, {
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'] as const,
      });

      let stdout = '';
      let stderr = '';

      if (child.stdout) {
        child.stdout.on('data', (data: Buffer) => {
          stdout += data.toString();
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });
      }

      child.on('exit', (code: number | null) => {
        resolve({
          stdout,
          stderr,
          exitCode: code ?? 1,
        });
      });

      child.on('error', (err: Error) => {
        resolve({
          stdout,
          stderr: err.message,
          exitCode: 1,
        });
      });
    } catch (error) {
      resolve({
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown error',
        exitCode: 1,
      });
    }
  });
}

/**
 * Environment variable access
 */
export function getEnv(key: string): string | undefined {
  if (isBun() && typeof Bun !== 'undefined') {
    return Bun.env[key];
  }
  return process.env[key];
}

/**
 * Ensure directory exists
 */
export async function ensureDir(dirPath: string): Promise<void> {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
