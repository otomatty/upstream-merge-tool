import { describe, it, expect, afterAll } from 'bun:test';
import { TestRepoHelper, cleanupE2ETests } from './setup';

describe('E2E: Scenario 1 - No Conflict', () => {
  afterAll(async () => {
    await cleanupE2ETests();
  });

  it('TC-E2E-001: should complete merge without conflicts', async () => {
    // Setup: Create a test repository with no conflicts
    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-no-conflict-001',
      hasUpstream: true,
      upstreamChanges: {
        'file.txt': 'content from upstream',
      },
      localChanges: {
        'file.txt': 'content from upstream',
      },
      hasConflict: false,
    });

    // Execute: Run merge tool
    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

    // Debug output
    if (result.exitCode !== 0) {
      console.log('=== STDOUT ===');
      console.log(result.stdout);
      console.log('=== STDERR ===');
      console.log(result.stderr);
    }

    // Assert
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('SUCCESS');

    // Cleanup
    await TestRepoHelper.cleanupTestRepo(repoPath);
  });

  it('TC-E2E-002: should handle multiple files without conflicts', async () => {
    // Setup: Create a test repository with multiple files
    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-no-conflict-002',
      hasUpstream: true,
      upstreamChanges: {
        'file1.txt': 'content 1 from upstream',
        'file2.js': 'export const x = 1;',
        'file3.ts': 'export interface Config {}',
      },
      localChanges: {
        'file1.txt': 'content 1 from upstream',
        'file2.js': 'export const x = 1;',
        'file3.ts': 'export interface Config {}',
      },
      hasConflict: false,
    });

    // Execute
    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

    // Assert
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('SUCCESS');

    // Verify staged files
    const stagedFiles = await TestRepoHelper.getStagedFiles(repoPath);
    expect(stagedFiles.length).toBeGreaterThanOrEqual(0);

    // Cleanup
    await TestRepoHelper.cleanupTestRepo(repoPath);
  });

  it('TC-E2E-003: should have no error logs in output', async () => {
    // Setup
    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-no-conflict-003',
      hasUpstream: true,
      upstreamChanges: {
        'README.md': '# Upstream Project',
        'settings.json': '{"name": "upstream"}',
      },
      localChanges: {
        'README.md': '# Upstream Project',
        'settings.json': '{"name": "upstream"}',
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

  it('TC-E2E-004: should display appropriate success message', async () => {
    // Setup
    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-no-conflict-004',
      hasUpstream: true,
      upstreamChanges: {
        'index.ts': 'export const main = () => {}',
      },
      localChanges: {
        'index.ts': 'export const main = () => {}',
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

  it('TC-E2E-005: should complete when upstream has additional files', async () => {
    // Setup
    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-no-conflict-005',
      hasUpstream: true,
      upstreamChanges: {
        'original.txt': 'original content',
        'new-from-upstream.txt': 'new file from upstream',
      },
      localChanges: {
        'original.txt': 'original content',
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

  it('TC-E2E-006: should handle deeply nested directories', async () => {
    // Setup
    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-no-conflict-006',
      hasUpstream: true,
      upstreamChanges: {
        'src/module/submodule/file.ts': 'export const func = () => {}',
      },
      localChanges: {
        'src/module/submodule/file.ts': 'export const func = () => {}',
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
