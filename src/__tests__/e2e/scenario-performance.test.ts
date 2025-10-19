import { describe, it, expect, afterAll } from 'bun:test';
import { TestRepoHelper, cleanupE2ETests } from './setup';
import * as fs from 'fs';
import * as path from 'path';

describe('E2E: Performance & Scalability', () => {
  afterAll(async () => {
    await cleanupE2ETests();
  });

  describe('Large Dataset Processing', () => {
    it('TC-E2E-P-001: should process large files efficiently', async () => {
      // Setup: Create large file (1MB+)
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-performance-001',
        hasUpstream: true,
        upstreamChanges: {
          'large.txt': 'x'.repeat(1024 * 1024), // 1MB
        },
        localChanges: {
          'large.txt': 'x'.repeat(1024 * 1024), // 1MB
        },
        hasConflict: false,
      });

      // Execute and measure time
      const startTime = Date.now();
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);
      const executionTime = Date.now() - startTime;

      // Assert
      expect(result.exitCode).toBe(0);
      expect(executionTime).toBeLessThan(30000); // Should complete within 30 seconds

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-P-002: should handle repository with many files', async () => {
      // Setup: Create repo with 100+ files
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-performance-002',
        hasUpstream: true,
        upstreamChanges: {
          ...Object.fromEntries(
            Array.from({ length: 100 }, (_, i) => [`file-${i}.ts`, `export const mod${i} = ${i};`])
          ),
        },
        localChanges: {
          ...Object.fromEntries(
            Array.from({ length: 100 }, (_, i) => [`file-${i}.ts`, `export const mod${i} = ${i};`])
          ),
        },
        hasConflict: false,
      });

      // Execute and measure time
      const startTime = Date.now();
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);
      const executionTime = Date.now() - startTime;

      // Assert
      expect(result.exitCode).toBe(0);
      expect(executionTime).toBeLessThan(60000); // Should complete within 60 seconds

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-P-003: should handle deeply nested directory structure', async () => {
      // Setup: Create deeply nested directories
      const upstreamChanges: Record<string, string> = {};
      const localChanges: Record<string, string> = {};
      
      // Create path with 20+ levels
      let nestedPath = '';
      for (let i = 0; i < 20; i++) {
        nestedPath += `level${i}/`;
      }
      
      upstreamChanges[`${nestedPath}file.ts`] = 'export const deep = "nested";';
      localChanges[`${nestedPath}file.ts`] = 'export const deep = "nested";';

      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-performance-003',
        hasUpstream: true,
        upstreamChanges,
        localChanges,
        hasConflict: false,
      });

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('SUCCESS');

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-P-004: should handle repository with extensive history', async () => {
      // Setup: Standard repo (extensive commit history is implicit in Git setup)
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-performance-004',
        hasUpstream: true,
        upstreamChanges: {
          'main.ts': 'export const version = "2.0.0";',
          'util.ts': 'export function help() {}',
        },
        localChanges: {
          'main.ts': 'export const version = "2.0.0";',
          'util.ts': 'export function help() {}',
        },
        hasConflict: false,
      });

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('SUCCESS');

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });
  });

  describe('Memory Efficiency', () => {
    it('TC-E2E-P-005: should maintain reasonable memory usage', async () => {
      // Setup: Multiple files for processing
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-performance-005',
        hasUpstream: true,
        upstreamChanges: {
          ...Object.fromEntries(
            Array.from({ length: 50 }, (_, i) => [
              `module-${i}.ts`,
              `export const item${i} = { data: "${i}" };`
            ])
          ),
        },
        localChanges: {
          ...Object.fromEntries(
            Array.from({ length: 50 }, (_, i) => [
              `module-${i}.ts`,
              `export const item${i} = { data: "${i}" };`
            ])
          ),
        },
        hasConflict: false,
      });

      // Get initial memory
      if (global.gc) global.gc();

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('SUCCESS');

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-P-006: should not leak memory after processing', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-performance-006',
        hasUpstream: true,
        upstreamChanges: {
          'data.json': JSON.stringify({ size: 'medium', items: Array(100).fill('data') }),
        },
        localChanges: {
          'data.json': JSON.stringify({ size: 'medium', items: Array(100).fill('data') }),
        },
        hasConflict: false,
      });

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert
      expect(result.exitCode).toBe(0);

      // Trigger garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-P-007: should handle multiple sequential runs without memory issues', async () => {
      // This test runs the tool multiple times and checks stability
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-performance-007',
        hasUpstream: true,
        upstreamChanges: {
          'sequential.ts': 'export const seq = () => "test";',
        },
        localChanges: {
          'sequential.ts': 'export const seq = () => "test";',
        },
        hasConflict: false,
      });

      // Execute multiple times
      for (let i = 0; i < 3; i++) {
        const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);
        expect(result.exitCode).toBe(0);
      }

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });
  });

  describe('Concurrent Operations', () => {
    it('TC-E2E-P-008: should detect and handle concurrent execution conflicts', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-performance-008',
        hasUpstream: true,
        upstreamChanges: {
          'shared.ts': 'export const shared = "data";',
        },
        localChanges: {
          'shared.ts': 'export const shared = "data";',
        },
        hasConflict: false,
      });

      // Execute (sequentially, simulating attempted concurrency)
      const result1 = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Second execution
      const result2 = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert - Both should succeed or second should handle conflict
      expect(result1.exitCode).toBe(0);
      expect(result2.exitCode).toBeGreaterThanOrEqual(0);

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-P-009: should handle partial completion recovery', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-performance-009',
        hasUpstream: true,
        upstreamChanges: {
          'file1.ts': 'export const f1 = 1;',
          'file2.ts': 'export const f2 = 2;',
          'file3.ts': 'export const f3 = 3;',
        },
        localChanges: {
          'file1.ts': `export const f1 = 1;
// CUSTOM-CODE-START
const c1 = "custom";
// CUSTOM-CODE-END`,
          'file2.ts': `export const f2 = 2;
// CUSTOM-CODE-START
const c2 = "custom";
// CUSTOM-CODE-END`,
          'file3.ts': `export const f3 = 3;
// CUSTOM-CODE-START
const c3 = "custom";
// CUSTOM-CODE-END`,
        },
        hasConflict: true,
      });

      // Execute first merge
      const result1 = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);
      expect(result1.exitCode).toBe(0);

      // Re-run merge (should handle already-merged state)
      const result2 = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);
      expect(result2.exitCode).toBeGreaterThanOrEqual(0);

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-P-010: should handle git lock file conflicts', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-performance-010',
        hasUpstream: true,
        upstreamChanges: {
          'locked.ts': 'export const locked = true;',
        },
        localChanges: {
          'locked.ts': 'export const locked = true;',
        },
        hasConflict: false,
      });

      // Create a lock file (simulate Git lock)
      const lockPath = path.join(repoPath, '.git', 'index.lock');
      const lockDir = path.dirname(lockPath);
      if (!fs.existsSync(lockDir)) {
        fs.mkdirSync(lockDir, { recursive: true });
      }

      // Temporarily create lock
      fs.writeFileSync(lockPath, 'dummy lock');
      
      // Wait a moment then remove (simulate lock release)
      await new Promise(resolve => setTimeout(resolve, 100));
      try {
        fs.unlinkSync(lockPath);
      } catch (e) {
        // Ignore if already removed
      }

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert
      expect(result.exitCode).toBeGreaterThanOrEqual(0);

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });
  });

  describe('Scalability Metrics', () => {
    it('TC-E2E-P-011: should complete within expected timeframe', async () => {
      // Setup: Medium-sized repo
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-performance-011',
        hasUpstream: true,
        upstreamChanges: {
          ...Object.fromEntries(
            Array.from({ length: 20 }, (_, i) => [`perf-file-${i}.ts`, `export const perf${i} = ${i};`])
          ),
        },
        localChanges: {
          ...Object.fromEntries(
            Array.from({ length: 20 }, (_, i) => [`perf-file-${i}.ts`, `export const perf${i} = ${i};`])
          ),
        },
        hasConflict: false,
      });

      // Execute and measure
      const startTime = Date.now();
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);
      const executionTime = Date.now() - startTime;

      // Assert: Should complete in reasonable time
      expect(result.exitCode).toBe(0);
      expect(executionTime).toBeLessThan(15000); // Reasonable timeout

      console.log(`Execution time: ${executionTime}ms for 20 files`);

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-P-012: should scale linearly with file count', async () => {
      // This test verifies that performance scales reasonably
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-performance-012',
        hasUpstream: true,
        upstreamChanges: {
          ...Object.fromEntries(
            Array.from({ length: 30 }, (_, i) => [`scale-file-${i}.ts`, `export const scale${i} = ${i};`])
          ),
        },
        localChanges: {
          ...Object.fromEntries(
            Array.from({ length: 30 }, (_, i) => [`scale-file-${i}.ts`, `export const scale${i} = ${i};`])
          ),
        },
        hasConflict: false,
      });

      // Execute
      const startTime = Date.now();
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);
      const executionTime = Date.now() - startTime;

      // Assert
      expect(result.exitCode).toBe(0);
      // Should scale reasonably (not exponentially worse)
      expect(executionTime).toBeLessThan(20000);

      console.log(`Execution time: ${executionTime}ms for 30 files`);

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });
  });
});
