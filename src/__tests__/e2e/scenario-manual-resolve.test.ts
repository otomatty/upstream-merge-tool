import { describe, it, expect, afterAll } from 'bun:test';
import { TestRepoHelper, cleanupE2ETests } from './setup';

describe('E2E: Scenario 3 - Manual-Resolvable Conflict', () => {
  afterAll(async () => {
    await cleanupE2ETests();
  });

  it('TC-E2E-013: should handle conflict outside custom code markers', async () => {
    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-manual-resolve-001',
      hasUpstream: true,
      upstreamChanges: {
        'app.ts': `export const feature1 = 'feature1';
export const config = { setting: 'value' };
export const feature2 = 'feature2';`,
      },
      localChanges: {
        'app.ts': `export const feature1 = 'feature1-modified';
// CUSTOM-CODE-START
const customLogic = () => { return 'custom'; };
// CUSTOM-CODE-END
export const config = { setting: 'value' };
export const feature2 = 'feature2';`,
      },
      hasConflict: true,
    });

    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('REPORT');

    await TestRepoHelper.cleanupTestRepo(repoPath);
  });

  it('TC-E2E-014: should handle multiple conflicting files', async () => {
    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-manual-resolve-002',
      hasUpstream: true,
      upstreamChanges: {
        'file1.ts': `export const x = 1;
export const y = 2;`,
        'file2.ts': `export const a = 'a';
export const b = 'b';`,
      },
      localChanges: {
        'file1.ts': `export const x = 1;
// CUSTOM-CODE-START
const customX = 'x';
// CUSTOM-CODE-END
export const y = 2;`,
        'file2.ts': `export const a = 'a-modified';
// CUSTOM-CODE-START
const customA = 'a';
// CUSTOM-CODE-END
export const b = 'b';`,
      },
      hasConflict: true,
    });

    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('REPORT');

    await TestRepoHelper.cleanupTestRepo(repoPath);
  });

  it('TC-E2E-015: should handle conflict in multiple sections', async () => {
    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-manual-resolve-003',
      hasUpstream: true,
      upstreamChanges: {
        'module.ts': `export const section1 = 'v1';
export const section2 = 'v2';
export const section3 = 'v3';`,
      },
      localChanges: {
        'module.ts': `export const section1 = 'v1-modified';
// CUSTOM-CODE-START
const custom1 = 'custom1';
// CUSTOM-CODE-END
export const section2 = 'v2';
// CUSTOM-CODE-START
const custom2 = 'custom2';
// CUSTOM-CODE-END
export const section3 = 'v3';`,
      },
      hasConflict: true,
    });

    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('REPORT');

    await TestRepoHelper.cleanupTestRepo(repoPath);
  });

  it('TC-E2E-016: should handle binary-like conflicts', async () => {
    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-manual-resolve-004',
      hasUpstream: true,
      upstreamChanges: {
        'constants.ts': `export const VERSION = '1.0.0';
export const DEBUG = false;`,
      },
      localChanges: {
        'constants.ts': `export const VERSION = '1.0.0';
export const DEBUG = false;
// CUSTOM-CODE-START
export const CUSTOM_VALUE = 'custom';
// CUSTOM-CODE-END`,
      },
      hasConflict: true,
    });

    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('REPORT');

    await TestRepoHelper.cleanupTestRepo(repoPath);
  });

  it('TC-E2E-017: should handle comments and annotations', async () => {
    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-manual-resolve-005',
      hasUpstream: true,
      upstreamChanges: {
        'service.ts': `/**
 * Service main function
 */
export const mainService = () => {};

/**
 * Helper function
 */
export const helper = () => {};`,
      },
      localChanges: {
        'service.ts': `/**
 * Service main function - modified
 */
export const mainService = () => {};

// CUSTOM-CODE-START
const customService = () => {
  return 'custom';
};
// CUSTOM-CODE-END

/**
 * Helper function
 */
export const helper = () => {};`,
      },
      hasConflict: true,
    });

    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('REPORT');

    await TestRepoHelper.cleanupTestRepo(repoPath);
  });

  it('TC-E2E-018: should handle whitespace and formatting changes', async () => {
    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-manual-resolve-006',
      hasUpstream: true,
      upstreamChanges: {
        'format.ts': `export const x=1;
export const y=2;
export const z=3;`,
      },
      localChanges: {
        'format.ts': `export const x = 1;
// CUSTOM-CODE-START
const custom = 'value';
// CUSTOM-CODE-END
export const y = 2;
export const z = 3;`,
      },
      hasConflict: true,
    });

    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('REPORT');

    await TestRepoHelper.cleanupTestRepo(repoPath);
  });

  it('TC-E2E-019: should handle import statements conflicts', async () => {
    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-manual-resolve-007',
      hasUpstream: true,
      upstreamChanges: {
        'index.ts': `import { a } from './a';
import { b } from './b';
export { a, b };`,
      },
      localChanges: {
        'index.ts': `import { a } from './a';
// CUSTOM-CODE-START
import { custom } from './custom';
// CUSTOM-CODE-END
import { b } from './b';
export { a, b };`,
      },
      hasConflict: true,
    });

    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('REPORT');

    await TestRepoHelper.cleanupTestRepo(repoPath);
  });
});
