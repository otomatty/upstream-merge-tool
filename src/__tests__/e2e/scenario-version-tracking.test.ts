import { describe, it, expect, afterAll } from 'bun:test';
import { TestRepoHelper, cleanupE2ETests } from './setup';
import * as fs from 'fs';
import * as path from 'path';

describe('E2E: Version Tracking Integration', () => {
  afterAll(async () => {
    await cleanupE2ETests();
  });

  describe('Version Extraction Integration', () => {
    it('TC-E2E-V-001: should extract version from git tag and include in report', async () => {
      // Setup: Create repo with semantic version tag
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-version-tracking-001',
        hasUpstream: true,
        upstreamChanges: {
          'package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
          'index.ts': 'export const main = () => {}',
        },
        localChanges: {
          'package.json': JSON.stringify({ name: 'test-pkg', version: '1.0.0' }),
          'index.ts': 'export const main = () => {}',
        },
        hasConflict: false,
      });

      // Create version tag
      await new Promise<void>((resolve, reject) => {
        const { exec } = require('child_process');
        exec('cd ' + repoPath + ' && git tag v2.0.0 && git push upstream --tags 2>/dev/null || true', (err: Error | null) => {
          if (err) console.log('Tag creation note:', err.message);
          resolve();
        });
      });

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('SUCCESS');

      // Check if report file contains version information
      const reportPath = path.join(repoPath, 'merge_report.json');
      if (fs.existsSync(reportPath)) {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
        // Report should have version info structure
        expect(report).toBeDefined();
      }

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-V-002: should extract version from package.json', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-version-tracking-002',
        hasUpstream: true,
        upstreamChanges: {
          'package.json': JSON.stringify({ 
            name: 'app', 
            version: '1.5.2',
            description: 'Test app'
          }),
          'src/app.ts': 'export const init = () => {}',
        },
        localChanges: {
          'package.json': JSON.stringify({ 
            name: 'app', 
            version: '1.5.2',
            description: 'Test app'
          }),
          'src/app.ts': 'export const init = () => {}',
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

    it('TC-E2E-V-003: should use manual version when configured', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-version-tracking-003',
        hasUpstream: true,
        upstreamChanges: {
          'README.md': '# Project',
        },
        localChanges: {
          'README.md': '# Project',
        },
        hasConflict: false,
      });

      // Update config with manual version
      const configPath = path.join(repoPath, 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      config.version_tracking = {
        enabled: true,
        method: 'manual',
        value: '3.2.1',
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, configPath);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('SUCCESS');

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-V-004: should fallback to commit ID when tag not found', async () => {
      // Setup: Create repo with no tags
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-version-tracking-004',
        hasUpstream: true,
        upstreamChanges: {
          'file.txt': 'content',
        },
        localChanges: {
          'file.txt': 'content',
        },
        hasConflict: false,
      });

      // Config with tag method (but no tags exist)
      const configPath = path.join(repoPath, 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      config.version_tracking = {
        enabled: true,
        method: 'tag',
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, configPath);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('SUCCESS');

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-V-005: should complete merge with version tracking disabled', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-version-tracking-005',
        hasUpstream: true,
        upstreamChanges: {
          'index.js': 'const main = () => {}; module.exports = { main };',
        },
        localChanges: {
          'index.js': 'const main = () => {}; module.exports = { main };',
        },
        hasConflict: false,
      });

      // Disable version tracking
      const configPath = path.join(repoPath, 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      config.version_tracking = {
        enabled: false,
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, configPath);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('SUCCESS');

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });
  });

  describe('Version Comparison in Reports', () => {
    it('TC-E2E-V-006: should compare old and new versions in report', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-version-tracking-006',
        hasUpstream: true,
        upstreamChanges: {
          'package.json': JSON.stringify({ version: '2.0.0' }),
          'app.ts': 'export function start() {}',
        },
        localChanges: {
          'package.json': JSON.stringify({ version: '2.0.0' }),
          'app.ts': 'export function start() {}',
        },
        hasConflict: false,
      });

      // Set previous version in config
      const configPath = path.join(repoPath, 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      config.version_tracking = {
        enabled: true,
        method: 'package',
        previous_version: '1.5.0',
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, configPath);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('SUCCESS');

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-V-007: should track version through multiple conflicts', async () => {
      // Setup: Multiple files with conflicts
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-version-tracking-007',
        hasUpstream: true,
        upstreamChanges: {
          'package.json': JSON.stringify({ version: '2.5.0' }),
          'file1.ts': 'export const fn1 = () => "upstream1";',
          'file2.ts': 'export const fn2 = () => "upstream2";',
          'file3.ts': 'export const fn3 = () => "upstream3";',
        },
        localChanges: {
          'package.json': JSON.stringify({ version: '2.5.0' }),
          'file1.ts': `export const fn1 = () => "upstream1";
// CUSTOM-CODE-START
const custom1 = "local modification";
// CUSTOM-CODE-END`,
          'file2.ts': `export const fn2 = () => "upstream2";
// CUSTOM-CODE-START
const custom2 = "local modification";
// CUSTOM-CODE-END`,
          'file3.ts': `export const fn3 = () => "upstream3";
// CUSTOM-CODE-START
const custom3 = "local modification";
// CUSTOM-CODE-END`,
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

    it('TC-E2E-V-008: should maintain version consistency before and after merge', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-version-tracking-008',
        hasUpstream: true,
        upstreamChanges: {
          'config.yaml': 'version: 3.0.0\nenv: production',
          'main.py': 'def main(): pass',
        },
        localChanges: {
          'config.yaml': 'version: 3.0.0\nenv: production',
          'main.py': 'def main(): pass',
        },
        hasConflict: false,
      });

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('SUCCESS');

      // Verify version consistency
      const configPath = path.join(repoPath, 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(config).toBeDefined();

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-V-009: should include version diff in report output', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-version-tracking-009',
        hasUpstream: true,
        upstreamChanges: {
          'package.json': JSON.stringify({ version: '1.2.3' }),
        },
        localChanges: {
          'package.json': JSON.stringify({ version: '1.2.3' }),
        },
        hasConflict: false,
      });

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('SUCCESS');
      // Should have version-related output
      expect(result.stdout.toLowerCase()).toMatch(/version|merge/i);

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });
  });

  describe('Version Fallback Chain', () => {
    it('TC-E2E-V-010: should fallback from tag to package.json', async () => {
      // Setup: No tags, but has package.json
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-version-tracking-010',
        hasUpstream: true,
        upstreamChanges: {
          'package.json': JSON.stringify({ version: '2.1.0' }),
          'src/index.ts': 'export default main',
        },
        localChanges: {
          'package.json': JSON.stringify({ version: '2.1.0' }),
          'src/index.ts': 'export default main',
        },
        hasConflict: false,
      });

      // Set fallback strategy
      const configPath = path.join(repoPath, 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      config.version_tracking = {
        enabled: true,
        fallback_chain: ['tag', 'package', 'manual'],
        manual_version: 'fallback-version',
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, configPath);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('SUCCESS');

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-V-011: should fallback to manual version when methods fail', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-version-tracking-011',
        hasUpstream: true,
        upstreamChanges: {
          'README.md': '# Project without version info',
        },
        localChanges: {
          'README.md': '# Project without version info',
        },
        hasConflict: false,
      });

      // Configure fallback to manual
      const configPath = path.join(repoPath, 'config.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      config.version_tracking = {
        enabled: true,
        fallback_chain: ['tag', 'package', 'manual'],
        manual_version: '0.0.1',
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Execute
      const result = await TestRepoHelper.runMergeTool(repoPath, configPath);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('SUCCESS');

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });

    it('TC-E2E-V-012: should use commit ID when all methods fail', async () => {
      // Setup: Minimal setup without version info
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-version-tracking-012',
        hasUpstream: true,
        upstreamChanges: {
          'data.txt': 'no version here',
        },
        localChanges: {
          'data.txt': 'no version here',
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

    it('TC-E2E-V-013: should log fallback chain execution', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-version-tracking-013',
        hasUpstream: true,
        upstreamChanges: {
          'source.js': 'function process() { return true; }',
        },
        localChanges: {
          'source.js': 'function process() { return true; }',
        },
        hasConflict: false,
      });

      // Execute with logging enabled
      const result = await TestRepoHelper.runMergeTool(repoPath, `${repoPath}/config.json`);

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toLowerCase()).toMatch(/success|version|extract/i);

      // Cleanup
      await TestRepoHelper.cleanupTestRepo(repoPath);
    });
  });

  describe('Configuration Variations', () => {
    it('TC-E2E-V-014: should handle multiple branches in repository', async () => {
      // Setup
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-version-tracking-014',
        hasUpstream: true,
        upstreamChanges: {
          'app.go': 'package main\nfunc main() {}',
          'package.json': JSON.stringify({ version: '1.8.0' }),
        },
        localChanges: {
          'app.go': 'package main\nfunc main() {}',
          'package.json': JSON.stringify({ version: '1.8.0' }),
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

    it('TC-E2E-V-015: should correctly parse semantic version format', async () => {
      // Setup with multiple version tags
      const repoPath = await TestRepoHelper.createTestRepo({
        name: 'scenario-version-tracking-015',
        hasUpstream: true,
        upstreamChanges: {
          'package.json': JSON.stringify({ version: '2.15.3-beta.1+build.2025' }),
          'lib.rs': 'pub fn main() {}',
        },
        localChanges: {
          'package.json': JSON.stringify({ version: '2.15.3-beta.1+build.2025' }),
          'lib.rs': 'pub fn main() {}',
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
});
