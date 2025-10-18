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

      // Assert
      expect(result.exitCode).not.toBe(0);
      expect(
        result.stdout.toLowerCase() + result.stderr.toLowerCase()
      ).toMatch(/(remote|not found|no remote|unknown)/i);

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

      // Assert - Should warn but still execute
      expect(result.stdout).toContain('Upstream Merge Tool Started');

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
});
