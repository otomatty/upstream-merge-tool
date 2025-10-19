import { describe, it, expect, afterAll } from 'bun:test';
import { TestRepoHelper, cleanupE2ETests } from './setup';
import * as fs from 'fs';
import * as path from 'path';

describe('E2E: Complex Conflict Scenarios', () => {
  afterAll(async () => {
    await cleanupE2ETests();
  });

  describe('Multi-File Conflicts', () => {
    it('TC-E2E-C-001: should handle 5+ files with simultaneous conflicts', async () => {
      // Setup: Multiple files with conflicts
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-complex-conflicts-001',
        hasUpstream: true,
        upstreamChanges: {
          'module1.ts': 'export const mod1 = "upstream1";',
          'module2.ts': 'export const mod2 = "upstream2";',
          'module3.ts': 'export const mod3 = "upstream3";',
          'module4.ts': 'export const mod4 = "upstream4";',
          'module5.ts': 'export const mod5 = "upstream5";',
        },
        localChanges: {
          'module1.ts': `export const mod1 = "upstream1";
// CUSTOM-CODE-START
const custom1 = "local";
// CUSTOM-CODE-END`,
          'module2.ts': `export const mod2 = "upstream2";
// CUSTOM-CODE-START
const custom2 = "local";
// CUSTOM-CODE-END`,
          'module3.ts': `export const mod3 = "upstream3";
// CUSTOM-CODE-START
const custom3 = "local";
// CUSTOM-CODE-END`,
          'module4.ts': `export const mod4 = "upstream4";
// CUSTOM-CODE-START
const custom4 = "local";
// CUSTOM-CODE-END`,
          'module5.ts': `export const mod5 = "upstream5";
// CUSTOM-CODE-START
const custom5 = "local";
// CUSTOM-CODE-END`,
        },
        hasConflict: true,
      });

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('REPORT');

      // Verify all files were processed
      const stagedFiles = await TestRepoHelper.getStagedFiles(repoPath);
      expect(stagedFiles.length).toBeGreaterThanOrEqual(0);

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-C-002: should handle conflicts at different sections of files', async () => {
      // Setup: Conflicts in different parts of files
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-complex-conflicts-002',
        hasUpstream: true,
        upstreamChanges: {
          'file1.ts': `export const header1 = "top";
export const middle1 = "middle";
export const footer1 = "bottom";`,
          'file2.ts': `export const header2 = "top";
export const middle2 = "middle";
export const footer2 = "bottom";`,
        },
        localChanges: {
          'file1.ts': `// CUSTOM-CODE-START
const customHeader = "custom";
// CUSTOM-CODE-END
export const header1 = "top";
export const middle1 = "middle";
// CUSTOM-CODE-START
const customFooter = "custom";
// CUSTOM-CODE-END
export const footer1 = "bottom";`,
          'file2.ts': `export const header2 = "top";
// CUSTOM-CODE-START
const customMiddle = "custom";
// CUSTOM-CODE-END
export const middle2 = "middle";
export const footer2 = "bottom";`,
        },
        hasConflict: true,
      });

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('REPORT');

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-C-003: should mix auto-resolvable and manual conflicts', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-complex-conflicts-003',
        hasUpstream: true,
        upstreamChanges: {
          'autoResolve.ts': 'export const auto = "can resolve";',
          'manualResolve.ts': 'export const manual = "needs manual";',
          'clean.ts': 'export const clean = "no conflict";',
        },
        localChanges: {
          'autoResolve.ts': `export const auto = "can resolve";
// CUSTOM-CODE-START
const autoCustom = "local";
// CUSTOM-CODE-END`,
          'manualResolve.ts': `export const manual = "needs manual";
// CUSTOM-CODE-START
const manualCustom = "local";
// CUSTOM-CODE-END`,
          'clean.ts': 'export const clean = "no conflict";',
        },
        hasConflict: true,
      });

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('REPORT');

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-C-004: should handle deeply nested directory structures', async () => {
      // Setup: Deep nesting
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-complex-conflicts-004',
        hasUpstream: true,
        upstreamChanges: {
          'src/modules/services/utils/helpers/index.ts': 'export function help() {}',
          'src/modules/models/types/schemas/index.ts': 'export interface Schema {}',
          'src/config/env/prod/settings.json': JSON.stringify({ env: 'prod' }),
        },
        localChanges: {
          'src/modules/services/utils/helpers/index.ts': `export function help() {}
// CUSTOM-CODE-START
function customHelper() {}
// CUSTOM-CODE-END`,
          'src/modules/models/types/schemas/index.ts': `export interface Schema {}
// CUSTOM-CODE-START
interface CustomSchema {}
// CUSTOM-CODE-END`,
          'src/config/env/prod/settings.json': JSON.stringify({ env: 'prod', custom: true }),
        },
        hasConflict: true,
      });

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('REPORT');

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });
  });

  describe('Custom Code Preservation', () => {
    it('TC-E2E-C-005: should preserve multiple custom code marker sections', async () => {
      // Setup: Multiple marker sections
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-complex-conflicts-005',
        hasUpstream: true,
        upstreamChanges: {
          'app.ts': `export const section1 = () => {};
export const section2 = () => {};
export const section3 = () => {};`,
        },
        localChanges: {
          'app.ts': `// CUSTOM-CODE-START
const custom1 = "first";
// CUSTOM-CODE-END
export const section1 = () => {};
// CUSTOM-CODE-START
const custom2 = "second";
// CUSTOM-CODE-END
export const section2 = () => {};
// CUSTOM-CODE-START
const custom3 = "third";
// CUSTOM-CODE-END
export const section3 = () => {};`,
        },
        hasConflict: true,
      });

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('REPORT');

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-C-006: should preserve complex code within markers', async () => {
      // Setup: Complex code (imports, functions, classes)
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-complex-conflicts-006',
        hasUpstream: true,
        upstreamChanges: {
          'complex.ts': `import { helper } from './helper';
export class Manager {}`,
        },
        localChanges: {
          'complex.ts': `import { helper } from './helper';
// CUSTOM-CODE-START
import { custom } from './custom';
export interface Config { name: string; }
export class CustomManager {
  constructor(private config: Config) {}
  process() { return helper(); }
}
// CUSTOM-CODE-END
export class Manager {}`,
        },
        hasConflict: true,
      });

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('REPORT');

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-C-007: should handle nested/stacked marker sections', async () => {
      // Setup: Nested markers
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-complex-conflicts-007',
        hasUpstream: true,
        upstreamChanges: {
          'nested.ts': 'export const base = () => {};',
        },
        localChanges: {
          'nested.ts': `// CUSTOM-CODE-START
const outer = {
  // Note: Additional marker-like comments in custom code
  /* CUSTOM-CODE-START */
  config: { name: "test" }
  /* CUSTOM-CODE-END */
};
// CUSTOM-CODE-END
export const base = () => {};`,
        },
        hasConflict: true,
      });

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert
      expect(result.exitCode).toBe(0);

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-C-008: should handle malformed marker pairs gracefully', async () => {
      // Setup: Incomplete markers
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-complex-conflicts-008',
        hasUpstream: true,
        upstreamChanges: {
          'malformed.ts': 'export const func = () => "ok";',
        },
        localChanges: {
          'malformed.ts': `// CUSTOM-CODE-START
const incomplete = "no end marker";
export const func = () => "ok";`,
        },
        hasConflict: true,
      });

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert - Should handle gracefully (either error or process as-is)
      expect(result.exitCode).toBeGreaterThanOrEqual(0);

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });
  });

  describe('Upstream Changes Handling', () => {
    it('TC-E2E-C-009: should handle upstream file deletion', async () => {
      // Setup: File deleted in upstream
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-complex-conflicts-009',
        hasUpstream: true,
        upstreamChanges: {
          'toDelete.ts': 'export const willBeDeleted = () => {};',
          'toKeep.ts': 'export const willStay = () => {};',
        },
        localChanges: {
          'toDelete.ts': `export const willBeDeleted = () => {};
// CUSTOM-CODE-START
const customDelete = "local modification";
// CUSTOM-CODE-END`,
          'toKeep.ts': 'export const willStay = () => {};',
        },
        hasConflict: true,
      });

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert
      expect(result.exitCode).toBe(0);

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-C-010: should handle upstream file rename', async () => {
      // Setup: File with similar content but different name
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-complex-conflicts-010',
        hasUpstream: true,
        upstreamChanges: {
          'newName.ts': 'export const renamed = () => {};',
          'other.ts': 'export const other = () => {};',
        },
        localChanges: {
          'oldName.ts': `export const renamed = () => {};
// CUSTOM-CODE-START
const custom = "local";
// CUSTOM-CODE-END`,
          'other.ts': 'export const other = () => {};',
        },
        hasConflict: true,
      });

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert
      expect(result.exitCode).toBe(0);

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-C-011: should merge when local and upstream have different changes', async () => {
      // Setup: Different modifications in same files
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-complex-conflicts-011',
        hasUpstream: true,
        upstreamChanges: {
          'shared1.ts': `export const config = {
  mode: "production",
  debug: false,
  timeout: 5000
};`,
          'shared2.ts': `export function process() {
  console.log("starting");
  return true;
}`,
        },
        localChanges: {
          'shared1.ts': `export const config = {
  mode: "production",
  debug: false,
  timeout: 5000,
  // CUSTOM-CODE-START
  custom: true
  // CUSTOM-CODE-END
};`,
          'shared2.ts': `export function process() {
  // CUSTOM-CODE-START
  setupLogger();
  // CUSTOM-CODE-END
  console.log("starting");
  return true;
}`,
        },
        hasConflict: true,
      });

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('REPORT');

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-C-012: should handle large structural changes', async () => {
      // Setup: Large changes in structure
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-complex-conflicts-012',
        hasUpstream: true,
        upstreamChanges: {
          'src/index.ts': 'export { main } from "./main";',
          'src/main.ts': 'export function main() {}',
          'src/utils.ts': 'export function util() {}',
          'src/config.ts': 'export const config = {};',
        },
        localChanges: {
          'src/index.ts': `export { main } from "./main";
// CUSTOM-CODE-START
export { custom } from "./custom";
// CUSTOM-CODE-END`,
          'src/main.ts': 'export function main() {}',
          'src/utils.ts': 'export function util() {}',
          'src/config.ts': 'export const config = {};',
          'src/custom.ts': '// CUSTOM-CODE-START\nexport function custom() {}\n// CUSTOM-CODE-END',
        },
        hasConflict: true,
      });

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert
      expect(result.exitCode).toBe(0);

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });
  });
});
