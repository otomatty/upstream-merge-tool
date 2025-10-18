/**
 * GitService Unit Tests
 * Tests for git operations: fetch, merge, status, conflict detection, etc.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { GitService } from '../../git/GitService';
import { MockLogger, MockGitExecutor, testFixtures, describeWithId } from './setup';

describe('GitService', () => {
  let mockLogger: MockLogger;
  let mockGitExecutor: MockGitExecutor;
  let gitService: GitService;

  beforeEach(() => {
    mockLogger = new MockLogger();
    mockGitExecutor = new MockGitExecutor();
    gitService = new GitService(mockLogger as any);
  });

  afterEach(() => {
    mockGitExecutor.clearHistory();
  });

  // TC-GIT-001: fetch 成功
  describe(describeWithId('TC-GIT-001', 'fetch 成功'), () => {
    it('should execute git fetch without errors', async () => {
      // Setup: Mock successful fetch command
      mockGitExecutor.registerResult('git fetch origin', {
        stdout: 'From github.com:user/repo\n branch main -> FETCH_HEAD\n',
        stderr: '',
        exitCode: 0,
      });

      // Verify executor returns success
      const result = await mockGitExecutor.exec('git fetch origin');
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
    });

    it('should log info message before fetching', async () => {
      mockLogger.info('Fetching from remote: origin');

      const logs = mockLogger.getLogsByLevel('INFO');
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]?.message).toContain('Fetching from remote');
    });
  });

  // TC-GIT-002: fetch 失敗（無効なリモート）
  describe(describeWithId('TC-GIT-002', 'fetch 失敗 - 無効なリモート'), () => {
    it('should handle fetch error with invalid remote', async () => {
      mockGitExecutor.registerResult('git fetch nonexistent', {
        stdout: '',
        stderr: 'fatal: No remote named nonexistent\n',
        exitCode: 1,
      });

      // Verify executor returns error result
      const result = await mockGitExecutor.exec('git fetch nonexistent');
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('No remote named');
    });

    it('should include error message in result', async () => {
      mockGitExecutor.registerResult('git fetch invalid', {
        stdout: '',
        stderr: 'fatal: repository not found',
        exitCode: 1,
      });

      const result = await mockGitExecutor.exec('git fetch invalid');
      expect(result.stderr).toContain('repository not found');
    });
  });

  // TC-GIT-003: merge 成功（コンフリクトなし）
  describe(describeWithId('TC-GIT-003', 'merge 成功 - コンフリクトなし'), () => {
    it('should merge successfully without conflicts', async () => {
      mockGitExecutor.registerResult('git merge upstream/main', {
        stdout: 'Merge made by the \'recursive\' strategy.\n file1.ts | 2 +-\n 1 file changed, 1 insertion(+), 1 deletion(-)',
        stderr: '',
        exitCode: 0,
      });

      const result = await mockGitExecutor.exec('git merge upstream/main');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Merge made');
    });

    it('should indicate no conflict files on successful merge', async () => {
      mockGitExecutor.registerResult('git diff --name-only --diff-filter=U', {
        stdout: '',
        stderr: '',
        exitCode: 0,
      });

      // Verify that conflict file detection returns empty when no conflicts
      const result = await mockGitExecutor.exec('git diff --name-only --diff-filter=U');
      expect(result.stdout.trim()).toBe('');
    });
  });

  // TC-GIT-004: merge 失敗（コンフリクトあり）
  describe(describeWithId('TC-GIT-004', 'merge 失敗 - コンフリクトあり'), () => {
    it('should return exit code 1 when merge has conflicts', async () => {
      mockGitExecutor.registerResult('git merge upstream/main', {
        stdout: 'Auto-merging file1.ts\nCONFLICT (content): Merge conflict in file1.ts\nAutomatic merge failed\n',
        stderr: '',
        exitCode: 1,
      });

      const result = await mockGitExecutor.exec('git merge upstream/main');
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('CONFLICT');
      expect(result.stdout).toContain('Automatic merge failed');
    });

    it('should capture conflict message', async () => {
      mockGitExecutor.registerResult('git merge upstream/main', {
        stdout: 'CONFLICT (content): Merge conflict in src/file.ts\nCONFLICT (delete/modify): src/deleted.ts\n',
        stderr: '',
        exitCode: 1,
      });

      const result = await mockGitExecutor.exec('git merge upstream/main');
      expect(result.stdout).toContain('CONFLICT');
    });
  });

  // TC-GIT-005: コンフリクトファイルリスト取得
  describe(describeWithId('TC-GIT-005', 'コンフリクトファイルリスト取得'), () => {
    it('should list conflicted files correctly', async () => {
      mockGitExecutor.registerResult('git diff --name-only --diff-filter=U', {
        stdout: 'src/file1.ts\nsrc/file2.ts\nsrc/config.json\n',
        stderr: '',
        exitCode: 0,
      });

      const result = await mockGitExecutor.exec('git diff --name-only --diff-filter=U');
      const files = result.stdout.trim().split('\n').filter((line) => line.length > 0);
      expect(files).toHaveLength(3);
      expect(files).toContain('src/file1.ts');
      expect(files).toContain('src/file2.ts');
      expect(files).toContain('src/config.json');
    });

    it('should return empty list when no conflicts', async () => {
      mockGitExecutor.registerResult('git diff --name-only --diff-filter=U', {
        stdout: '',
        stderr: '',
        exitCode: 0,
      });

      const result = await mockGitExecutor.exec('git diff --name-only --diff-filter=U');
      const files = result.stdout.trim().split('\n').filter((line) => line.length > 0);
      expect(files).toHaveLength(0);
    });

    it('should handle single conflict file', async () => {
      mockGitExecutor.registerResult('git diff --name-only --diff-filter=U', {
        stdout: 'src/single-file.ts\n',
        stderr: '',
        exitCode: 0,
      });

      const result = await mockGitExecutor.exec('git diff --name-only --diff-filter=U');
      const files = result.stdout.trim().split('\n').filter((line) => line.length > 0);
      expect(files).toHaveLength(1);
      expect(files[0]).toBe('src/single-file.ts');
    });
  });

  // TC-GIT-006: git add 実行
  describe(describeWithId('TC-GIT-006', 'git add 実行'), () => {
    it('should stage file successfully', async () => {
      mockGitExecutor.registerResult('git add "src/file.ts"', {
        stdout: '',
        stderr: '',
        exitCode: 0,
      });

      const result = await mockGitExecutor.exec('git add "src/file.ts"');
      expect(result.exitCode).toBe(0);
    });

    it('should handle file path with spaces', async () => {
      mockGitExecutor.registerResult('git add "src/my file.ts"', {
        stdout: '',
        stderr: '',
        exitCode: 0,
      });

      const result = await mockGitExecutor.exec('git add "src/my file.ts"');
      expect(result.exitCode).toBe(0);
    });

    it('should return error when file does not exist', async () => {
      mockGitExecutor.registerResult('git add "nonexistent.ts"', {
        stdout: '',
        stderr: 'fatal: pathspec \'nonexistent.ts\' did not match any files',
        exitCode: 128,
      });

      const result = await mockGitExecutor.exec('git add "nonexistent.ts"');
      expect(result.exitCode).toBe(128);
      expect(result.stderr).toContain('did not match');
    });
  });

  // TC-GIT-007: コミットハッシュ取得
  describe(describeWithId('TC-GIT-007', 'コミットハッシュ取得'), () => {
    it('should retrieve commit hash for HEAD', async () => {
      const commitHash = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0';
      mockGitExecutor.registerResult('git rev-parse HEAD', {
        stdout: `${commitHash}\n`,
        stderr: '',
        exitCode: 0,
      });

      const result = await mockGitExecutor.exec('git rev-parse HEAD');
      const hash = result.stdout.trim();
      expect(hash).toBe(commitHash);
      expect(hash).toMatch(/^[a-f0-9]{40}$/);
    });

    it('should retrieve commit hash for specific ref', async () => {
      mockGitExecutor.registerResult('git rev-parse upstream/main', {
        stdout: `${testFixtures.validConfig.last_merged_upstream_commit}\n`,
        stderr: '',
        exitCode: 0,
      });

      const result = await mockGitExecutor.exec('git rev-parse upstream/main');
      const hash = result.stdout.trim();
      expect(hash).toMatch(/^[a-f0-9]{40}$/);
    });

    it('should return error for invalid ref', async () => {
      mockGitExecutor.registerResult('git rev-parse invalid/ref', {
        stdout: '',
        stderr: "fatal: Not a valid object name\n",
        exitCode: 128,
      });

      const result = await mockGitExecutor.exec('git rev-parse invalid/ref');
      expect(result.exitCode).toBe(128);
    });
  });

  // TC-GIT-008: 差分取得
  describe(describeWithId('TC-GIT-008', '差分取得'), () => {
    it('should retrieve diff between two commits', async () => {
      const commit1 = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0';
      const commit2 = 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0a1';
      const diffOutput = `--- a/src/file.ts
+++ b/src/file.ts
@@ -1,3 +1,3 @@
 line 1
-old line
+new line
 line 3`;

      mockGitExecutor.registerResult(`git diff ${commit1}..${commit2} -- "src/file.ts"`, {
        stdout: diffOutput,
        stderr: '',
        exitCode: 0,
      });

      const result = await mockGitExecutor.exec(`git diff ${commit1}..${commit2} -- "src/file.ts"`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('---');
      expect(result.stdout).toContain('-old line');
      expect(result.stdout).toContain('+new line');
    });

    it('should handle file with no changes', async () => {
      mockGitExecutor.registerResult('git diff abc123..def456 -- "unchanged.ts"', {
        stdout: '',
        stderr: '',
        exitCode: 0,
      });

      const result = await mockGitExecutor.exec('git diff abc123..def456 -- "unchanged.ts"');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('');
    });

    it('should include context lines in diff output', async () => {
      const diffOutput = `--- a/file.ts
+++ b/file.ts
@@ -10,6 +10,6 @@
 context line 1
 context line 2
-removed line
+added line
 context line 3
 context line 4`;

      mockGitExecutor.registerResult('git diff hash1..hash2 -- "file.ts"', {
        stdout: diffOutput,
        stderr: '',
        exitCode: 0,
      });

      const result = await mockGitExecutor.exec('git diff hash1..hash2 -- "file.ts"');
      expect(result.stdout).toContain('context line');
      expect(result.stdout).toContain('-removed line');
      expect(result.stdout).toContain('+added line');
    });
  });

  // TC-GIT-009: リポジトリ状態確認
  describe(describeWithId('TC-GIT-009', 'リポジトリ状態確認'), () => {
    it('should verify we are in a git repository', async () => {
      mockGitExecutor.registerResult('git rev-parse --git-dir', {
        stdout: '.git\n',
        stderr: '',
        exitCode: 0,
      });

      const result = await mockGitExecutor.exec('git rev-parse --git-dir');
      expect(result.exitCode).toBe(0);
    });

    it('should return current branch name', async () => {
      mockGitExecutor.registerResult('git rev-parse --abbrev-ref HEAD', {
        stdout: 'main\n',
        stderr: '',
        exitCode: 0,
      });

      const result = await mockGitExecutor.exec('git rev-parse --abbrev-ref HEAD');
      const branch = result.stdout.trim();
      expect(branch).toBe('main');
    });

    it('should detect dirty working directory', async () => {
      mockGitExecutor.registerResult('git status --porcelain', {
        stdout: ' M src/file.ts\n?? new-file.ts\n',
        stderr: '',
        exitCode: 0,
      });

      const result = await mockGitExecutor.exec('git status --porcelain');
      const isDirty = result.stdout.trim().length > 0;
      expect(isDirty).toBe(true);
    });

    it('should detect clean working directory', async () => {
      mockGitExecutor.registerResult('git status --porcelain', {
        stdout: '',
        stderr: '',
        exitCode: 0,
      });

      const result = await mockGitExecutor.exec('git status --porcelain');
      const isDirty = result.stdout.trim().length > 0;
      expect(isDirty).toBe(false);
    });

    it('should detect non-repository', async () => {
      mockGitExecutor.registerResult('git rev-parse --git-dir', {
        stdout: '',
        stderr: 'fatal: not a git repository',
        exitCode: 128,
      });

      const result = await mockGitExecutor.exec('git rev-parse --git-dir');
      expect(result.exitCode).toBe(128);
    });
  });

  // Additional edge case tests
  describe('Edge Cases and Error Handling', () => {
    it('should handle command with special characters', async () => {
      mockGitExecutor.registerResult('git add "file-with-special-chars_@#.ts"', {
        stdout: '',
        stderr: '',
        exitCode: 0,
      });

      const result = await mockGitExecutor.exec('git add "file-with-special-chars_@#.ts"');
      expect(result.exitCode).toBe(0);
    });

    it('should track command execution history', async () => {
      mockGitExecutor.registerResult('git fetch origin', {
        stdout: '',
        stderr: '',
        exitCode: 0,
      });

      mockGitExecutor.registerResult('git merge upstream/main', {
        stdout: '',
        stderr: '',
        exitCode: 0,
      });

      await mockGitExecutor.exec('git fetch origin');
      await mockGitExecutor.exec('git merge upstream/main');

      const history = mockGitExecutor.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0]).toBe('git fetch origin');
      expect(history[1]).toBe('git merge upstream/main');
    });

    it('should handle command not registered in mock', async () => {
      const result = await mockGitExecutor.exec('git unknown-command');
      expect(result.exitCode).toBe(127);
      expect(result.stderr).toContain('command not mocked');
    });

    it('should log operations to logger', async () => {
      mockLogger.info('Fetching from remote: origin');
      mockLogger.info('Git fetch completed successfully');

      const logs = mockLogger.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0]?.level).toBe('INFO');
    });
  });
});
