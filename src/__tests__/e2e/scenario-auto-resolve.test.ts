import { describe, it, expect, afterAll } from 'bun:test';
import { TestRepoHelper, cleanupE2ETests } from './setup';

describe('E2E: Scenario 2 - Auto-Resolvable Conflict', () => {
  afterAll(async () => {
    await cleanupE2ETests();
  });

  it('TC-E2E-007: should auto-resolve conflicts within custom code markers', async () => {
    // Setup: Custom code in markers, upstream has no changes outside markers
    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-auto-resolve-001',
      hasUpstream: true,
      upstreamChanges: {
        'app.ts': `export const config = {
  setting1: 'value1'
};

export const main = () => {
  console.log('main');
};`,
      },
      localChanges: {
        'app.ts': `export const config = {
  setting1: 'value1'
};

// CUSTOM-CODE-START
const customLogic = () => {
  return 'custom implementation';
};
// CUSTOM-CODE-END

export const main = () => {
  console.log('main');
};`,
      },
      hasConflict: true,
    });

    // Execute
    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

    // Assert
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('SUCCESS');

    // Verify that file was processed
    const fileContent = TestRepoHelper.getFileContent(repoPath, 'app.ts');
    expect(fileContent).toContain('customLogic');
    expect(fileContent).not.toContain('<<<<<<<'); // No conflict markers

    // Cleanup
    await TestRepoHelper.cleanupTestRepo(repoPath);
  });

  it('TC-E2E-008: should auto-resolve multiple files', async () => {
    // Setup
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

    // Execute
    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

    // Assert
    expect(result.exitCode).toBe(0);

    // Verify both files were processed
    const file1 = TestRepoHelper.getFileContent(repoPath, 'file1.ts');
    const file2 = TestRepoHelper.getFileContent(repoPath, 'file2.ts');

    expect(file1).toContain('custom1');
    expect(file1).not.toContain('<<<<<<<');
    expect(file2).toContain('custom2');
    expect(file2).not.toContain('<<<<<<<');

    // Cleanup
    await TestRepoHelper.cleanupTestRepo(repoPath);
  });

  it('TC-E2E-009: should completely remove custom code markers after resolution', async () => {
    // Setup
    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-auto-resolve-003',
      hasUpstream: true,
      upstreamChanges: {
        'module.ts': 'export function process() {}',
      },
      localChanges: {
        'module.ts': `export function process() {}

// CUSTOM-CODE-START
function customHelper() {
  return 'helper';
}
// CUSTOM-CODE-END`,
      },
      hasConflict: true,
    });

    // Execute
    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

    // Assert
    expect(result.exitCode).toBe(0);

    const fileContent = TestRepoHelper.getFileContent(repoPath, 'module.ts');
    expect(fileContent).toContain('customHelper');
    expect(fileContent).not.toContain('CUSTOM-CODE-START');
    expect(fileContent).not.toContain('CUSTOM-CODE-END');
    expect(fileContent).not.toContain('<<<<<<');

    // Cleanup
    await TestRepoHelper.cleanupTestRepo(repoPath);
  });

  it('TC-E2E-010: should handle nested custom code markers', async () => {
    // Setup: Multiple custom code sections
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

    // Execute
    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

    // Assert
    expect(result.exitCode).toBe(0);

    const fileContent = TestRepoHelper.getFileContent(repoPath, 'complex.ts');
    expect(fileContent).toContain('customA');
    expect(fileContent).toContain('customB');
    expect(fileContent).toContain('export const a');
    expect(fileContent).toContain('export const b');
    expect(fileContent).toContain('export const c');

    // Cleanup
    await TestRepoHelper.cleanupTestRepo(repoPath);
  });

  it('TC-E2E-011: should auto-resolve when upstream changes outside marker', async () => {
    // Setup
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

    // Execute
    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

    // Assert
    expect(result.exitCode).toBe(0);

    const fileContent = TestRepoHelper.getFileContent(repoPath, 'config.ts');
    expect(fileContent).toContain('LOCAL_CONFIG');
    expect(fileContent).not.toContain('CUSTOM-CODE-START');

    // Cleanup
    await TestRepoHelper.cleanupTestRepo(repoPath);
  });

  it('TC-E2E-012: should handle large files with auto-resolution', async () => {
    // Setup: Create a larger file with custom markers
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

    // Execute
    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

    // Assert
    expect(result.exitCode).toBe(0);

    const fileContent = TestRepoHelper.getFileContent(repoPath, 'large.ts');
    expect(fileContent).toContain('customItem');
    expect(fileContent).toContain('item0');
    expect(fileContent).toContain('item49');

    // Cleanup
    await TestRepoHelper.cleanupTestRepo(repoPath);
  });
});
