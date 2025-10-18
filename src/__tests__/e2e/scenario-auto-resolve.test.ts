import { describe, it, expect, afterAll } from 'bun:test';
import { TestRepoHelper, cleanupE2ETests } from './setup';

describe('E2E: Scenario 2 - Auto-Resolvable Conflict', () => {
  afterAll(async () => {
    await cleanupE2ETests();
  });

  it('TC-E2E-007: should execute merge tool with custom code markers', async () => {
    // Setup: Custom code in markers
    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-auto-resolve-001',
      hasUpstream: true,
      upstreamChanges: {
        'app.ts': `export const config = { setting1: 'value1' };
export const main = () => { console.log('main'); };`,
      },
      localChanges: {
        'app.ts': `export const config = { setting1: 'value1' };
// CUSTOM-CODE-START
const customLogic = () => { return 'custom'; };
// CUSTOM-CODE-END
export const main = () => { console.log('main'); };`,
      },
      hasConflict: true,
    });

    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('REPORT');

    await TestRepoHelper.cleanupTestRepo(repoPath);
  });

  it('TC-E2E-008: should handle multiple files with conflicts', async () => {
    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-auto-resolve-002',
      hasUpstream: true,
      upstreamChanges: {
        'file1.ts': 'export const x = 1;',
        'file2.ts': 'export const y = 2;',
      },
      localChanges: {
        'file1.ts': `export const x = 1;
// CUSTOM-CODE-START
const custom1 = 'value';
// CUSTOM-CODE-END`,
        'file2.ts': `export const y = 2;
// CUSTOM-CODE-START
const custom2 = 'value';
// CUSTOM-CODE-END`,
      },
      hasConflict: true,
    });

    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('REPORT');

    await TestRepoHelper.cleanupTestRepo(repoPath);
  });

  it('TC-E2E-009: should process files with custom code markers', async () => {
    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-auto-resolve-003',
      hasUpstream: true,
      upstreamChanges: {
        'module.ts': 'export function process() {}',
      },
      localChanges: {
        'module.ts': `export function process() {}
// CUSTOM-CODE-START
function customHelper() { return 'helper'; }
// CUSTOM-CODE-END`,
      },
      hasConflict: true,
    });

    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('REPORT');

    await TestRepoHelper.cleanupTestRepo(repoPath);
  });

  it('TC-E2E-010: should handle nested custom code markers', async () => {
    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-auto-resolve-004',
      hasUpstream: true,
      upstreamChanges: {
        'complex.ts': `export const a = 1;
export const b = 2;
export const c = 3;`,
      },
      localChanges: {
        'complex.ts': `export const a = 1;
// CUSTOM-CODE-START
const customA = 'a';
// CUSTOM-CODE-END
export const b = 2;
// CUSTOM-CODE-START
const customB = 'b';
// CUSTOM-CODE-END
export const c = 3;`,
      },
      hasConflict: true,
    });

    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('REPORT');

    await TestRepoHelper.cleanupTestRepo(repoPath);
  });

  it('TC-E2E-011: should handle version conflicts with custom code', async () => {
    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-auto-resolve-005',
      hasUpstream: true,
      upstreamChanges: {
        'config.ts': `export const version = '2.0.0';
export function initialize() {}`,
      },
      localChanges: {
        'config.ts': `export const version = '1.0.0';
// CUSTOM-CODE-START
const LOCAL_CONFIG = { debug: true };
// CUSTOM-CODE-END
export function initialize() {}`,
      },
      hasConflict: true,
    });

    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('REPORT');

    await TestRepoHelper.cleanupTestRepo(repoPath);
  });

  it('TC-E2E-012: should handle large files with conflicts', async () => {
    const largeContent = `${Array.from({ length: 50 })
      .map((_, i) => `export const item${i} = ${i};`)
      .join('\n')}`;

    const localContent = `${Array.from({ length: 50 })
      .map((_, i) => {
        if (i === 25) {
          return `// CUSTOM-CODE-START
const customItem = 'custom';
// CUSTOM-CODE-END
export const item${i} = ${i};`;
        }
        return `export const item${i} = ${i};`;
      })
      .join('\n')}`;

    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-auto-resolve-006',
      hasUpstream: true,
      upstreamChanges: {
        'large.ts': largeContent,
      },
      localChanges: {
        'large.ts': localContent,
      },
      hasConflict: true,
    });

    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('REPORT');

    await TestRepoHelper.cleanupTestRepo(repoPath);
  });
});
