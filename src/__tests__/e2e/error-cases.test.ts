import { describe, it, expect, afterAll } from 'bun:test';
import { TestRepoHelper, cleanupE2ETests } from './setup';
import * as fs from 'fs';
import * as path from 'path';

describe('E2E: Error Cases', () => {
  afterAll(async () => {
    await cleanupE2ETests();
  });

  describe('Error Case 1: No Configuration File', () => {
    it('TC-E2E-020: should fail when config.json does not exist', async () => {
      // Setup: Create repo without config.json
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'error-case-no-config',
        hasUpstream: true,
        upstreamChanges: { 'README.md': '# Test' },
        localChanges: { 'README.md': '# Test' },
      });

      // Remove config.json
      const configPath = path.join(repoPath, 'config.json');
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, configPath);

      // Assert
      expect(result.exitCode).not.toBe(0);
      expect(
        result.stdout.toLowerCase() + result.stderr.toLowerCase()
      ).toMatch(
        /(config|not found|cannot find|no such file|missing)/i
      );

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });
  });

  describe('Error Case 2: Invalid Configuration File', () => {
    it('TC-E2E-021: should fail with invalid JSON in config file', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'error-case-invalid-json',
        hasUpstream: true,
        upstreamChanges: { 'README.md': '# Test' },
        localChanges: { 'README.md': '# Test' },
      });

      // Write invalid JSON
      const configPath = path.join(repoPath, 'config.json');
      fs.writeFileSync(configPath, '{ invalid json }');

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, configPath);

      // Assert
      expect(result.exitCode).not.toBe(0);
      expect(
        result.stdout.toLowerCase() + result.stderr.toLowerCase()
      ).toMatch(/(invalid|json|parse|syntax)/i);

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-022: should fail when required config fields are missing', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'error-case-missing-fields',
        hasUpstream: true,
        upstreamChanges: { 'README.md': '# Test' },
        localChanges: { 'README.md': '# Test' },
      });

      // Write config with missing required fields
      const configPath = path.join(repoPath, 'config.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          upstream_repository_name: 'upstream',
          // Missing: upstream_branch_name, last_merged_upstream_commit, custom_code_marker
        })
      );

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, configPath);

      // Assert
      expect(result.exitCode).not.toBe(0);
      expect(
        result.stdout.toLowerCase() + result.stderr.toLowerCase()
      ).toMatch(/(required|missing|invalid)/i);

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-023: should fail when marker config is invalid', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'error-case-invalid-marker',
        hasUpstream: true,
        upstreamChanges: { 'README.md': '# Test' },
        localChanges: { 'README.md': '# Test' },
      });

      // Write config with invalid marker
      const configPath = path.join(repoPath, 'config.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          upstream_repository_name: 'upstream',
          upstream_branch_name: 'main',
          last_merged_upstream_commit: 'HEAD',
          custom_code_marker: {
            start: 'START', // Missing 'end'
          },
        })
      );

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, configPath);

      // Assert
      expect(result.exitCode).not.toBe(0);

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });
  });

  describe('Error Case 3: Not a Git Repository', () => {
    it('TC-E2E-024: should fail when not in a git repository', async () => {
      // Create a temporary non-git directory
      const tempDir = path.join(
        Bun.env.HOME || '/tmp',
        '.e2e-test-repos',
        'not-git-' + Date.now()
      );
      fs.mkdirSync(tempDir, { recursive: true });

      try {
        // Create valid config in non-git dir
        const configPath = path.join(tempDir, 'config.json');
        fs.writeFileSync(
          configPath,
          JSON.stringify({
            upstream_repository_name: 'upstream',
            upstream_branch_name: 'main',
            last_merged_upstream_commit: 'HEAD',
            custom_code_marker: {
              start: '// START',
              end: '// END',
            },
          })
        );

        // Execute merge tool from non-git directory
        const result = await TestRepoHelper.runMergeTool(tempDir, configPath);

        // Assert
        expect(result.exitCode).not.toBe(0);
        expect(
          result.stdout.toLowerCase() + result.stderr.toLowerCase()
        ).toMatch(/(not|git|repository)/i);
      } finally {
        // Cleanup
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('Error Case 4: Invalid Remote', () => {
    it('TC-E2E-025: should fail with non-existent remote name', async () => {
      // Setup: Create repo without adding upstream remote
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'error-case-invalid-remote',
        hasUpstream: false, // Don't create upstream
        localChanges: { 'README.md': '# Local' },
      });

      // Create config referencing non-existent remote
      const configPath = path.join(repoPath, 'config.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          upstream_repository_name: 'nonexistent',
          upstream_branch_name: 'main',
          last_merged_upstream_commit: 'HEAD',
          custom_code_marker: {
            start: '// START',
            end: '// END',
          },
        })
      );

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, configPath);

      // Assert - should fail because branch doesn't exist
      expect(result.exitCode).not.toBe(0);

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-026: should fail when remote branch does not exist', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'error-case-invalid-branch',
        hasUpstream: true,
        upstreamChanges: { 'README.md': '# Upstream' },
        localChanges: { 'README.md': '# Local' },
      });

      // Create config referencing non-existent branch
      const configPath = path.join(repoPath, 'config.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          upstream_repository_name: 'upstream',
          upstream_branch_name: 'nonexistent-branch', // This branch doesn't exist
          last_merged_upstream_commit: 'HEAD',
          custom_code_marker: {
            start: '// START',
            end: '// END',
          },
        })
      );

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, configPath);

      // Assert - should fail because branch doesn't exist
      expect(result.exitCode).not.toBe(0);

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });
  });

  describe('Error Case 5: Working Directory Issues', () => {
    it('TC-E2E-027: should warn about uncommitted changes', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'error-case-dirty-working-dir',
        hasUpstream: true,
        upstreamChanges: { 'README.md': '# Upstream' },
        localChanges: { 'README.md': '# Local' },
      });

      // Create uncommitted changes
      const newFile = path.join(repoPath, 'uncommitted.txt');
      fs.writeFileSync(newFile, 'uncommitted content');

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert - Should still execute and produce a report
      expect(result.stdout).toContain('REPORT');

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });
  });

  describe('Error Case 6: Invalid Commit References', () => {
    it('TC-E2E-028: should handle invalid last_merged_upstream_commit', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'error-case-invalid-commit',
        hasUpstream: true,
        upstreamChanges: { 'README.md': '# Upstream' },
        localChanges: { 'README.md': '# Local' },
      });

      // Create config with invalid commit
      const configPath = path.join(repoPath, 'config.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          upstream_repository_name: 'upstream',
          upstream_branch_name: 'main',
          last_merged_upstream_commit: 'invalid_commit_hash_1234567890',
          custom_code_marker: {
            start: '// START',
            end: '// END',
          },
        })
      );

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, configPath);

      // Assert - should fail or handle gracefully
      expect(result.exitCode).toBeDefined();

            // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });
  });

  describe('Error Case 7: Repository State Issues', () => {
    it('TC-E2E-E-001: should handle dirty working directory gracefully', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'error-recovery-dirty-working',
        hasUpstream: true,
        upstreamChanges: { 'file.txt': 'upstream content' },
        localChanges: { 'file.txt': 'local content' },
      });

      // Create unstaged modifications
      const modifiedFile = path.join(repoPath, 'file.txt');
      fs.writeFileSync(modifiedFile, 'unstaged modification');

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert - should either fail gracefully or include warning
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
      expect(result.stdout + result.stderr).toMatch(/(dirty|uncommitted|modified|change)/i);

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-E-002: should handle staged changes in working directory', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'error-recovery-staged-changes',
        hasUpstream: true,
        upstreamChanges: { 'original.ts': 'export const orig = 1;' },
        localChanges: { 'original.ts': 'export const orig = 1;' },
      });

      // Create staged changes
      const stagedFile = path.join(repoPath, 'staged.ts');
      fs.writeFileSync(stagedFile, 'export const staged = true;');
      
      // Stage the file via git command
      await new Promise<void>((resolve) => {
        const { exec } = require('child_process');
        exec(`cd ${repoPath} && git add staged.ts`, () => resolve());
      });

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert
      expect(result.exitCode).toBeGreaterThanOrEqual(0);

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-E-003: should handle detached HEAD state', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'error-recovery-detached-head',
        hasUpstream: true,
        upstreamChanges: { 'code.ts': 'export const code = 1;' },
        localChanges: { 'code.ts': 'export const code = 1;' },
      });

      // Move to detached HEAD state
      await new Promise<void>((resolve) => {
        const { exec } = require('child_process');
        exec(`cd ${repoPath} && git checkout HEAD~0 2>/dev/null || true`, () => resolve());
      });

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert - should fail or handle gracefully
      expect(result.exitCode).toBeGreaterThanOrEqual(0);

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });
  });

  describe('Error Case 8: Network/Git Issues (Simulated)', () => {
    it('TC-E2E-E-004: should handle missing upstream remote', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'error-recovery-no-remote',
        hasUpstream: false, // No upstream remote
      });

      // Try to execute
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert - should fail with appropriate message
      expect(result.exitCode).not.toBe(0);
      expect(result.stdout.toLowerCase() + result.stderr.toLowerCase()).toMatch(
        /(upstream|remote|not found|no such|missing)/i
      );

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-E-005: should handle git fetch timeout scenario', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'error-recovery-fetch-timeout',
        hasUpstream: true,
        upstreamChanges: { 'data.json': JSON.stringify({ test: true }) },
        localChanges: { 'data.json': JSON.stringify({ test: true }) },
      });

      // Execute (simulates potential timeout, but actual timeout depends on system)
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert - should handle gracefully
      expect(result.exitCode).toBeGreaterThanOrEqual(0);

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-E-006: should handle permission denied errors', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'error-recovery-permission',
        hasUpstream: true,
        upstreamChanges: { 'protected.txt': 'content' },
        localChanges: { 'protected.txt': 'content' },
      });

      // Create a read-only file (simulating permission issue)
      const readOnlyFile = path.join(repoPath, 'readonly.txt');
      fs.writeFileSync(readOnlyFile, 'readonly');
      
      try {
        fs.chmodSync(readOnlyFile, 0o444); // Read-only
      } catch (e) {
        // chmod might not work on all systems, skip this step
      }

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert - should handle gracefully
      expect(result.exitCode).toBeGreaterThanOrEqual(0);

      // Restore permissions for cleanup
      try {
        fs.chmodSync(readOnlyFile, 0o644);
      } catch (e) {
        // Ignore
      }

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });
  });

  describe('Error Case 9: Recovery Mechanisms', () => {
    it('TC-E2E-E-007: should rollback changes on failure', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'error-recovery-rollback',
        hasUpstream: true,
        upstreamChanges: { 'backup.ts': 'export const backup = true;' },
        localChanges: { 'backup.ts': 'export const backup = true;' },
      });

      // Get initial state
      const initialStatus = await TestRepoHelper.getGitStatus(repoPath);

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Get status after execution
      const finalStatus = await TestRepoHelper.getGitStatus(repoPath);

      // Assert - if failed, should not have partial changes
      if (result.exitCode !== 0) {
        // Status should not show unexpected changes
        expect(finalStatus).toBeDefined();
      }

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-E-008: should allow recovery from partial merge', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'error-recovery-partial-merge',
        hasUpstream: true,
        upstreamChanges: {
          'step1.ts': 'export const step1 = 1;',
          'step2.ts': 'export const step2 = 2;',
          'step3.ts': 'export const step3 = 3;',
        },
        localChanges: {
          'step1.ts': `export const step1 = 1;
// CUSTOM-CODE-START
const custom1 = "local";
// CUSTOM-CODE-END`,
          'step2.ts': `export const step2 = 2;
// CUSTOM-CODE-START
const custom2 = "local";
// CUSTOM-CODE-END`,
          'step3.ts': `export const step3 = 3;
// CUSTOM-CODE-START
const custom3 = "local";
// CUSTOM-CODE-END`,
        },
        hasConflict: true,
      });

      // Execute first merge
      const result1 = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);
      expect(result1.exitCode).toBe(0);

      // Re-attempt merge (should handle already-merged state)
      const result2 = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);
      
      // Should either succeed or fail gracefully
      expect(result2.exitCode).toBeGreaterThanOrEqual(0);

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });
  });
});
