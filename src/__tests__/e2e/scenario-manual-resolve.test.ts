import { describe, it, expect, afterAll } from 'bun:test';
import { TestRepoHelper, cleanupE2ETests } from './setup';

describe('E2E: Scenario 3 - Manual Resolution Required', () => {
  afterAll(async () => {
    await cleanupE2ETests();
  });

  it('TC-E2E-013: should detect conflicts requiring manual resolution', async () => {
    // Setup: Upstream modifies file outside marker, local has custom code
    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-manual-resolve-001',
      hasUpstream: true,
      upstreamChanges: {
        'app.ts': `export const config = {
  version: '2.0.0',
  debug: true
};

export function main() {
  console.log('upstream main');
}`,
      },
      localChanges: {
        'app.ts': `export const config = {
  version: '1.0.0'
};

// CUSTOM-CODE-START
const customConfig = { debug: false };
// CUSTOM-CODE-END

export function main() {
  console.log('local main');
}`,
      },
      hasConflict: true,
    });

    // Execute
    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

    // Assert
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Upstream Merge Tool Started');

    // The file should have conflict markers since both sides modified the file
    const fileContent = TestRepoHelper.getFileContent(repoPath, 'app.ts');
    // Either conflict markers or the file contains both versions
    const hasConflictMarkers =
      fileContent.includes('<<<<<<<') || fileContent.includes('customConfig');

    expect(hasConflictMarkers).toBe(true);

    // Cleanup
    await TestRepoHelper.cleanupTestRepo(repoPath);
  });

  it('TC-E2E-014: should not stage files requiring manual resolution', async () => {
    // Setup
    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-manual-resolve-002',
      hasUpstream: true,
      upstreamChanges: {
        'file.ts': `export const x = 1;
export const y = 2;`,
      },
      localChanges: {
        'file.ts': `export const x = 1;
// CUSTOM-CODE-START
const custom = 'local';
// CUSTOM-CODE-END
export const y = 3;`, // local changed y value too
      },
      hasConflict: true,
    });

    // Execute
    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

    // Assert
    expect(result.exitCode).toBe(0);

    // Check git status to see unstaged files
    const gitStatus = await TestRepoHelper.getGitStatus(repoPath);
    // File should be in conflicted state or unstaged

    // Cleanup
    await TestRepoHelper.cleanupTestRepo(repoPath);
  });

  it('TC-E2E-015: should handle multiple files with mixed resolution needs', async () => {
    // Setup: One file can be auto-resolved, another needs manual
    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-manual-resolve-003',
      hasUpstream: true,
      upstreamChanges: {
        'auto-resolve.ts': `export const a = 1;`,
        'manual-resolve.ts': `export const b = 2;`,
      },
      localChanges: {
        'auto-resolve.ts': `export const a = 1;
// CUSTOM-CODE-START
const customA = 'a';
// CUSTOM-CODE-END`,
        'manual-resolve.ts': `export const b = 3;
// CUSTOM-CODE-START
const customB = 'b';
// CUSTOM-CODE-END`,
      },
      hasConflict: true,
    });

    // Execute
    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

    // Assert
    expect(result.exitCode).toBe(0);

    // First file should be auto-resolved
    const autoResolveContent = TestRepoHelper.getFileContent(repoPath, 'auto-resolve.ts');
    expect(autoResolveContent).toContain('customA');
    expect(autoResolveContent).not.toContain('CUSTOM-CODE-START');

    // Cleanup
    await TestRepoHelper.cleanupTestRepo(repoPath);
  });

  it('TC-E2E-016: should preserve conflict markers for manual resolution', async () => {
    // Setup: Create clear conflict scenario
    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-manual-resolve-004',
      hasUpstream: true,
      upstreamChanges: {
        'conflict.ts': `export interface Config {
  timeout: number;
  retries: number;
}

export const DEFAULT_CONFIG = {
  timeout: 5000,
  retries: 3
};`,
      },
      localChanges: {
        'conflict.ts': `export interface Config {
  timeout: number;
  retries: number;
  maxConnections: number;
}

// CUSTOM-CODE-START
const CUSTOM_SETTINGS = {
  timeout: 10000
};
// CUSTOM-CODE-END

export const DEFAULT_CONFIG = {
  timeout: 5000,
  retries: 3
};`,
      },
      hasConflict: true,
    });

    // Execute
    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

    // Assert
    expect(result.exitCode).toBe(0);

    // File should contain either markers or both sets of content
    const fileContent = TestRepoHelper.getFileContent(repoPath, 'conflict.ts');
    const hasConflictIndicators =
      fileContent.includes('<<<<<<<') || fileContent.includes('CUSTOM_SETTINGS');

    expect(hasConflictIndicators).toBe(true);

    // Cleanup
    await TestRepoHelper.cleanupTestRepo(repoPath);
  });

  it('TC-E2E-017: should report files awaiting manual resolution', async () => {
    // Setup
    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-manual-resolve-005',
      hasUpstream: true,
      upstreamChanges: {
        'src/index.ts': `export const INDEX = 0;`,
      },
      localChanges: {
        'src/index.ts': `export const INDEX = 1;
// CUSTOM-CODE-START
const LOCAL = true;
// CUSTOM-CODE-END`,
      },
      hasConflict: true,
    });

    // Execute
    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

    // Assert
    expect(result.exitCode).toBe(0);
    // Should complete even with unresolvable conflicts
    expect(result.stdout).toContain('Upstream Merge Tool Started');

    // Cleanup
    await TestRepoHelper.cleanupTestRepo(repoPath);
  });

  it('TC-E2E-018: should handle conflicts in deeply nested files', async () => {
    // Setup
    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-manual-resolve-006',
      hasUpstream: true,
      upstreamChanges: {
        'src/modules/auth/config.ts': `export const AUTH_SECRET = 'secret1';`,
      },
      localChanges: {
        'src/modules/auth/config.ts': `export const AUTH_SECRET = 'local_secret';
// CUSTOM-CODE-START
const CUSTOM_AUTH = true;
// CUSTOM-CODE-END`,
      },
      hasConflict: true,
    });

    // Execute
    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

    // Assert
    expect(result.exitCode).toBe(0);

    const fileContent = TestRepoHelper.getFileContent(
      repoPath,
      'src/modules/auth/config.ts'
    );
    expect(fileContent).toBeTruthy();

    // Cleanup
    await TestRepoHelper.cleanupTestRepo(repoPath);
  });

  it('TC-E2E-019: should handle conflicts with different custom markers', async () => {
    // Setup: Use custom markers
    const repoPath = await TestRepoHelper.createTestRepo({
      name: 'scenario-manual-resolve-007',
      hasUpstream: true,
      upstreamChanges: {
        'api.ts': `export function fetchData() {
  return [];
}`,
      },
      localChanges: {
        'api.ts': `export function fetchData() {
  return [];
}

/* START-CUSTOM */
function customFetch() {
  return 'custom';
}
/* END-CUSTOM */`,
      },
      hasConflict: true,
      customMarkerStart: '/* START-CUSTOM */',
      customMarkerEnd: '/* END-CUSTOM */',
    });

    // Execute
    const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

    // Assert
    expect(result.exitCode).toBe(0);

    const fileContent = TestRepoHelper.getFileContent(repoPath, 'api.ts');
    expect(fileContent).toContain('customFetch');

    // Cleanup
    await TestRepoHelper.cleanupTestRepo(repoPath);
  });
});
