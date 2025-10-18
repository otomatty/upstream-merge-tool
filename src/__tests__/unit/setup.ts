/**
 * Shared test setup and utilities
 * Common mocks, fixtures, and helper functions for all unit tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';

/**
 * Mock Logger for testing
 * Provides a simple in-memory logger without side effects
 */
export class MockLogger {
  private logs: Array<{
    level: string;
    message: string;
    context?: Record<string, any>;
    timestamp: Date;
  }> = [];

  info(message: string, context?: Record<string, any>): void {
    this.logs.push({ level: 'INFO', message, context, timestamp: new Date() });
  }

  warn(message: string, context?: Record<string, any>): void {
    this.logs.push({ level: 'WARN', message, context, timestamp: new Date() });
  }

  error(message: string, context?: Record<string, any>): void {
    this.logs.push({ level: 'ERROR', message, context, timestamp: new Date() });
  }

  debug(message: string, context?: Record<string, any>): void {
    this.logs.push({ level: 'DEBUG', message, context, timestamp: new Date() });
  }

  getLogs() {
    return this.logs;
  }

  clear() {
    this.logs = [];
  }

  getLogsByLevel(level: string) {
    return this.logs.filter((log) => log.level === level);
  }
}

/**
 * Temporary directory manager for file-based tests
 * Automatically creates and cleans up test directories
 */
export class TempDirManager {
  private tempDirs: string[] = [];

  createTempDir(prefix: string = 'test-'): string {
    const tempDir = path.join(process.cwd(), `${prefix}${Date.now()}-${Math.random().toString(36).substring(7)}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    this.tempDirs.push(tempDir);
    return tempDir;
  }

  createTempFile(dir: string, filename: string, content: string): string {
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  cleanup(): void {
    this.tempDirs.forEach((dir) => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
    this.tempDirs = [];
  }
}

/**
 * Get path to fixture directory
 */
export function getFixturesPath(): string {
  return path.join(process.cwd(), 'src', '__tests__', 'fixtures');
}

/**
 * Read fixture file
 */
export function readFixture(filename: string): string {
  const filePath = path.join(getFixturesPath(), filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fixture file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Mock Git process execution result
 */
export interface MockGitResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Mock Git process executor for testing GitService
 * Allows simulating git command results without actual git operations
 */
export class MockGitExecutor {
  private results: Map<string, MockGitResult> = new Map();
  private commandHistory: string[] = [];

  /**
   * Register a result for a specific git command
   */
  registerResult(command: string, result: MockGitResult): void {
    this.results.set(command, result);
  }

  /**
   * Execute a mocked git command
   */
  async exec(command: string): Promise<MockGitResult> {
    this.commandHistory.push(command);

    // Check for exact match first
    if (this.results.has(command)) {
      return this.results.get(command)!;
    }

    // Check for pattern matches (for commands with dynamic parts)
    for (const [pattern, result] of this.results.entries()) {
      if (this.matchesPattern(command, pattern)) {
        return result;
      }
    }

    // Default behavior: simulate command not found
    return {
      stdout: '',
      stderr: `command not mocked: ${command}`,
      exitCode: 127,
    };
  }

  /**
   * Check if a command matches a pattern
   */
  private matchesPattern(command: string, pattern: string): boolean {
    // Simple pattern matching: support wildcard *
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    return regex.test(command);
  }

  /**
   * Get command history
   */
  getHistory(): string[] {
    return [...this.commandHistory];
  }

  /**
   * Clear command history
   */
  clearHistory(): void {
    this.commandHistory = [];
  }

  /**
   * Check if a command was executed
   */
  wasCommandExecuted(command: string): boolean {
    return this.commandHistory.includes(command);
  }

  /**
   * Get count of executed commands
   */
  getExecutedCommandCount(): number {
    return this.commandHistory.length;
  }
}

/**
 * Create fixture data for tests
 */
export const testFixtures = {
  validConfig: {
    upstream_repository_name: 'upstream',
    upstream_branch_name: 'main',
    last_merged_upstream_commit: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
    custom_code_marker: {
      start: '// CUSTOM-CODE-START',
      end: '// CUSTOM-CODE-END',
    },
  },

  invalidConfig: {
    upstream_repository_name: 'upstream',
    // Missing: upstream_branch_name, last_merged_upstream_commit, custom_code_marker
  },

  conflictContent: `line 1
line 2
<<<<<<< HEAD
// CUSTOM-CODE-START
custom implementation
// CUSTOM-CODE-END
=======
upstream code
>>>>>>> upstream/main
line 3
line 4`,

  conflictContentMultiple: `first conflict:
<<<<<<< HEAD
our code 1
=======
their code 1
>>>>>>> upstream/main

second conflict:
<<<<<<< HEAD
our code 2
=======
their code 2
>>>>>>> upstream/main`,

  noConflictContent: `line 1
line 2
normal content
line 4`,
};

/**
 * Helper to create test descriptions with IDs
 */
export function describeWithId(id: string, description: string) {
  return `[${id}] ${description}`;
}

/**
 * Helper to validate test structure
 */
export function validateTestStructure(testId: string, testName: string) {
  if (!testId.match(/^TC-[A-Z]+-\d{3}$/)) {
    throw new Error(`Invalid test ID format: ${testId}. Expected format: TC-XXX-000`);
  }
}

export default {
  MockLogger,
  MockGitExecutor,
  TempDirManager,
  getFixturesPath,
  readFixture,
  testFixtures,
  describeWithId,
  validateTestStructure,
};
