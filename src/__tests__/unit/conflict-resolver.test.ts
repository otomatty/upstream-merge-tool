/**
 * ConflictResolver Unit Tests
 * Tests for conflict detection, marking validation, and auto-resolution logic
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { ConflictResolver } from '../../conflict/ConflictResolver';
import { MockLogger, TempDirManager, testFixtures, describeWithId } from './setup';

describe('ConflictResolver', () => {
  let mockLogger: MockLogger;
  let tempDirManager: TempDirManager;
  let conflictResolver: ConflictResolver;

  beforeEach(() => {
    mockLogger = new MockLogger();
    tempDirManager = new TempDirManager();
    conflictResolver = new ConflictResolver(mockLogger as any);
  });

  afterEach(() => {
    tempDirManager.cleanup();
  });

  // TC-CONF-001: 単一コンフリクト検出
  describe(describeWithId('TC-CONF-001', '単一コンフリクト検出'), () => {
    it('should detect single conflict marker', async () => {
      const tempDir = tempDirManager.createTempDir('conflict-test-');
      const filePath = tempDirManager.createTempFile(tempDir, 'file.ts', testFixtures.conflictContent);

      const markers = await conflictResolver.detectConflicts(filePath);

      expect(markers).toHaveLength(1);
      expect(markers[0]?.startLine).toBeDefined();
      expect(markers[0]?.markerLine).toBeDefined();
      expect(markers[0]?.endLine).toBeDefined();
    });

    it('should capture conflict content correctly', async () => {
      const tempDir = tempDirManager.createTempDir('conflict-test-');
      const filePath = tempDirManager.createTempFile(tempDir, 'file.ts', testFixtures.conflictContent);

      const markers = await conflictResolver.detectConflicts(filePath);

      expect(markers[0]?.ours).toContain('// CUSTOM-CODE-START');
      expect(markers[0]?.ours).toContain('custom implementation');
      expect(markers[0]?.theirs).toContain('upstream code');
    });

    it('should identify conflict line ranges correctly', async () => {
      const tempDir = tempDirManager.createTempDir('conflict-test-');
      const filePath = tempDirManager.createTempFile(tempDir, 'file.ts', testFixtures.conflictContent);

      const markers = await conflictResolver.detectConflicts(filePath);

      expect(markers[0]?.startLine).toBeLessThan(markers[0]?.markerLine!);
      expect(markers[0]?.markerLine).toBeLessThan(markers[0]?.endLine!);
    });
  });

  // TC-CONF-002: 複数コンフリクト検出
  describe(describeWithId('TC-CONF-002', '複数コンフリクト検出'), () => {
    it('should detect multiple conflict markers', async () => {
      const tempDir = tempDirManager.createTempDir('conflict-test-');
      const filePath = tempDirManager.createTempFile(
        tempDir,
        'file.ts',
        testFixtures.conflictContentMultiple
      );

      const markers = await conflictResolver.detectConflicts(filePath);

      expect(markers).toHaveLength(2);
    });

    it('should capture each conflict separately', async () => {
      const tempDir = tempDirManager.createTempDir('conflict-test-');
      const filePath = tempDirManager.createTempFile(
        tempDir,
        'file.ts',
        testFixtures.conflictContentMultiple
      );

      const markers = await conflictResolver.detectConflicts(filePath);

      expect(markers[0]?.ours).toContain('our code 1');
      expect(markers[0]?.theirs).toContain('their code 1');
      expect(markers[1]?.ours).toContain('our code 2');
      expect(markers[1]?.theirs).toContain('their code 2');
    });

    it('should maintain separate line ranges for each conflict', async () => {
      const tempDir = tempDirManager.createTempDir('conflict-test-');
      const filePath = tempDirManager.createTempFile(
        tempDir,
        'file.ts',
        testFixtures.conflictContentMultiple
      );

      const markers = await conflictResolver.detectConflicts(filePath);

      expect(markers[0]?.endLine).toBeLessThan(markers[1]?.startLine!);
    });
  });

  // TC-CONF-003: Upstream側変更なし判定（真）
  describe(describeWithId('TC-CONF-003', 'Upstream側変更なし判定 - true'), () => {
    it('should detect when upstream did not change the file', async () => {
      const condition = conflictResolver.canAutoResolve(
        true, // Conflict exists
        false, // Upstream did NOT change
        true // File is marked as custom
      );

      expect(condition).toBe(true);
    });

    it('should log condition evaluation', () => {
      conflictResolver.canAutoResolve(true, false, true);

      const logs = mockLogger.getLogsByLevel('INFO');
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[logs.length - 1]?.message).toContain('Auto-resolution condition check');
    });
  });

  // TC-CONF-004: Upstream側変更あり判定（偽）
  describe(describeWithId('TC-CONF-004', 'Upstream側変更あり判定 - false'), () => {
    it('should not auto-resolve when upstream changed the file', () => {
      const condition = conflictResolver.canAutoResolve(
        true, // Conflict exists
        true, // Upstream changed
        true // File is marked as custom
      );

      expect(condition).toBe(false);
    });

    it('should indicate condition2 prevents auto-resolution', () => {
      conflictResolver.canAutoResolve(true, true, true);

      const logs = mockLogger.getLogsByLevel('INFO');
      const lastLog = logs[logs.length - 1];
      expect(lastLog?.message).toContain('Auto-resolution condition check');
      expect(lastLog?.context?.condition2_negated).toBe(false);
    });
  });

  // TC-CONF-005: マーカー検証（完全に囲まれている）
  describe(describeWithId('TC-CONF-005', 'マーカー検証 - 完全に囲まれている'), () => {
    it('should validate custom code markers correctly', async () => {
      const tempDir = tempDirManager.createTempDir('marker-test-');
      const fileContent = `line 1
// CUSTOM-CODE-START
custom code
// CUSTOM-CODE-END
line 5`;

      const filePath = tempDirManager.createTempFile(tempDir, 'file.ts', fileContent);
      const markers = await conflictResolver.detectConflicts(filePath);

      // Note: This file has no conflicts, so we test the marker method directly
      const conflictWithMarkers = {
        startLine: 1,
        markerLine: 2,
        endLine: 3,
        oursStart: 2,
        oursEnd: 2,
        theirsStart: 3,
        theirsEnd: 3,
        ours: 'custom code',
        theirs: 'upstream code',
      };

      const isMarked = conflictResolver.isMarkedAsCustom(
        fileContent,
        conflictWithMarkers,
        '// CUSTOM-CODE-START',
        '// CUSTOM-CODE-END'
      );

      expect(isMarked).toBe(true);
    });

    it('should detect markers with conflict content', async () => {
      const contentWithMarkers = `// CUSTOM-CODE-START
<<<<<<< HEAD
custom implementation
=======
upstream code
>>>>>>> upstream/main
// CUSTOM-CODE-END`;

      const conflict = {
        startLine: 1,
        markerLine: 3,
        endLine: 5,
        oursStart: 2,
        oursEnd: 2,
        theirsStart: 4,
        theirsEnd: 4,
        ours: 'custom implementation',
        theirs: 'upstream code',
      };

      const isMarked = conflictResolver.isMarkedAsCustom(
        contentWithMarkers,
        conflict,
        '// CUSTOM-CODE-START',
        '// CUSTOM-CODE-END'
      );

      expect(isMarked).toBe(true);
    });
  });

  // TC-CONF-006: マーカー検証（開始マーカーのみ）
  describe(describeWithId('TC-CONF-006', 'マーカー検証 - 開始マーカーのみ'), () => {
    it('should return false when only start marker present', () => {
      const contentWithOnlyStart = `// CUSTOM-CODE-START
<<<<<<< HEAD
custom code
=======
upstream code
>>>>>>> upstream/main`;

      const conflict = {
        startLine: 1,
        markerLine: 3,
        endLine: 5,
        oursStart: 2,
        oursEnd: 2,
        theirsStart: 4,
        theirsEnd: 4,
        ours: 'custom code',
        theirs: 'upstream code',
      };

      const isMarked = conflictResolver.isMarkedAsCustom(
        contentWithOnlyStart,
        conflict,
        '// CUSTOM-CODE-START',
        '// CUSTOM-CODE-END'
      );

      expect(isMarked).toBe(false);
    });
  });

  // TC-CONF-007: マーカー検証（終了マーカーのみ）
  describe(describeWithId('TC-CONF-007', 'マーカー検証 - 終了マーカーのみ'), () => {
    it('should return false when only end marker present', () => {
      const contentWithOnlyEnd = `<<<<<<< HEAD
custom code
=======
upstream code
>>>>>>> upstream/main
// CUSTOM-CODE-END`;

      const conflict = {
        startLine: 0,
        markerLine: 2,
        endLine: 4,
        oursStart: 1,
        oursEnd: 1,
        theirsStart: 3,
        theirsEnd: 3,
        ours: 'custom code',
        theirs: 'upstream code',
      };

      const isMarked = conflictResolver.isMarkedAsCustom(
        contentWithOnlyEnd,
        conflict,
        '// CUSTOM-CODE-START',
        '// CUSTOM-CODE-END'
      );

      expect(isMarked).toBe(false);
    });
  });

  // TC-CONF-008: マーカー検証（マーカーなし）
  describe(describeWithId('TC-CONF-008', 'マーカー検証 - マーカーなし'), () => {
    it('should return false when no markers present', () => {
      const contentWithoutMarkers = `<<<<<<< HEAD
custom code
=======
upstream code
>>>>>>> upstream/main`;

      const conflict = {
        startLine: 0,
        markerLine: 2,
        endLine: 4,
        oursStart: 1,
        oursEnd: 1,
        theirsStart: 3,
        theirsEnd: 3,
        ours: 'custom code',
        theirs: 'upstream code',
      };

      const isMarked = conflictResolver.isMarkedAsCustom(
        contentWithoutMarkers,
        conflict,
        '// CUSTOM-CODE-START',
        '// CUSTOM-CODE-END'
      );

      expect(isMarked).toBe(false);
    });
  });

  // TC-CONF-009: 自動解決（3条件満たす）
  describe(describeWithId('TC-CONF-009', '自動解決 - 3条件満たす'), () => {
    it('should resolve conflict when all conditions are met', async () => {
      const tempDir = tempDirManager.createTempDir('resolve-test-');
      const filePath = tempDirManager.createTempFile(tempDir, 'file.ts', testFixtures.conflictContent);

      const markers = await conflictResolver.detectConflicts(filePath);
      expect(markers).toHaveLength(1);

      await conflictResolver.resolveConflict(filePath, markers[0]!);

      const resolvedContent = fs.readFileSync(filePath, 'utf-8');
      expect(resolvedContent).not.toContain('<<<<<<<');
      expect(resolvedContent).not.toContain('=======');
      expect(resolvedContent).not.toContain('>>>>>>>');
      expect(resolvedContent).toContain('custom implementation');
    });

    it('should remove conflict markers completely', async () => {
      const tempDir = tempDirManager.createTempDir('resolve-test-');
      const filePath = tempDirManager.createTempFile(tempDir, 'file.ts', testFixtures.conflictContent);

      const markers = await conflictResolver.detectConflicts(filePath);
      await conflictResolver.resolveConflict(filePath, markers[0]!);

      const resolvedContent = fs.readFileSync(filePath, 'utf-8');
      expect(resolvedContent).not.toContain('<<<<<<< HEAD');
      expect(resolvedContent).not.toContain('>>>>>>> upstream/main');
    });

    it('should preserve custom code lines', async () => {
      const tempDir = tempDirManager.createTempDir('resolve-test-');
      const filePath = tempDirManager.createTempFile(tempDir, 'file.ts', testFixtures.conflictContent);

      const markers = await conflictResolver.detectConflicts(filePath);
      await conflictResolver.resolveConflict(filePath, markers[0]!);

      const resolvedContent = fs.readFileSync(filePath, 'utf-8');
      expect(resolvedContent).toContain('// CUSTOM-CODE-START');
      expect(resolvedContent).toContain('// CUSTOM-CODE-END');
      expect(resolvedContent).toContain('custom implementation');
    });

    it('should preserve surrounding content', async () => {
      const tempDir = tempDirManager.createTempDir('resolve-test-');
      const filePath = tempDirManager.createTempFile(tempDir, 'file.ts', testFixtures.conflictContent);

      const markers = await conflictResolver.detectConflicts(filePath);
      await conflictResolver.resolveConflict(filePath, markers[0]!);

      const resolvedContent = fs.readFileSync(filePath, 'utf-8');
      expect(resolvedContent).toContain('line 1');
      expect(resolvedContent).toContain('line 3');
      expect(resolvedContent).toContain('line 4');
    });
  });

  // TC-CONF-010: 手動解決待ち（条件2不満足）
  describe(describeWithId('TC-CONF-010', '手動解決待ち - 条件2不満足'), () => {
    it('should not auto-resolve when upstream changed the file', () => {
      const condition = conflictResolver.canAutoResolve(
        true, // Conflict exists
        true, // Upstream changed the file
        true // File is marked
      );

      expect(condition).toBe(false);
    });

    it('should require manual resolution when condition2 fails', () => {
      const canResolve = conflictResolver.canAutoResolve(true, true, true);

      expect(canResolve).toBe(false);

      const logs = mockLogger.getLogsByLevel('INFO');
      const lastLog = logs[logs.length - 1];
      expect(lastLog?.context?.condition2_negated).toBe(false);
    });
  });

  // TC-CONF-011: 手動解決待ち（条件3不満足）
  describe(describeWithId('TC-CONF-011', '手動解決待ち - 条件3不満足'), () => {
    it('should not auto-resolve when file is not marked', () => {
      const condition = conflictResolver.canAutoResolve(
        true, // Conflict exists
        false, // Upstream did not change
        false // File is NOT marked
      );

      expect(condition).toBe(false);
    });

    it('should require manual resolution when condition3 fails', () => {
      const canResolve = conflictResolver.canAutoResolve(true, false, false);

      expect(canResolve).toBe(false);

      const logs = mockLogger.getLogsByLevel('INFO');
      const lastLog = logs[logs.length - 1];
      expect(lastLog?.context?.condition3).toBe(false);
    });
  });

  // TC-CONF-012: 1ファイル複数コンフリクト（部分解決）
  describe(describeWithId('TC-CONF-012', '1ファイル複数コンフリクト - 部分解決'), () => {
    it('should resolve all conflicts in a file', async () => {
      const tempDir = tempDirManager.createTempDir('multi-resolve-test-');
      const filePath = tempDirManager.createTempFile(
        tempDir,
        'file.ts',
        testFixtures.conflictContentMultiple
      );

      const success = await conflictResolver.resolveAllConflictsInFile(filePath);
      expect(success).toBe(true);
    });

    it('should remove all conflict markers', async () => {
      const tempDir = tempDirManager.createTempDir('multi-resolve-test-');
      const filePath = tempDirManager.createTempFile(
        tempDir,
        'file.ts',
        testFixtures.conflictContentMultiple
      );

      await conflictResolver.resolveAllConflictsInFile(filePath);

      const resolvedContent = fs.readFileSync(filePath, 'utf-8');
      expect(resolvedContent).not.toContain('<<<<<<<');
      expect(resolvedContent).not.toContain('=======');
      expect(resolvedContent).not.toContain('>>>>>>>');
    });

    it('should keep our code for all conflicts', async () => {
      const tempDir = tempDirManager.createTempDir('multi-resolve-test-');
      const filePath = tempDirManager.createTempFile(
        tempDir,
        'file.ts',
        testFixtures.conflictContentMultiple
      );

      await conflictResolver.resolveAllConflictsInFile(filePath);

      const resolvedContent = fs.readFileSync(filePath, 'utf-8');
      expect(resolvedContent).toContain('our code 1');
      expect(resolvedContent).toContain('our code 2');
      expect(resolvedContent).not.toContain('their code 1');
      expect(resolvedContent).not.toContain('their code 2');
    });

    it('should handle files with no conflicts', async () => {
      const tempDir = tempDirManager.createTempDir('no-conflict-test-');
      const filePath = tempDirManager.createTempFile(
        tempDir,
        'file.ts',
        testFixtures.noConflictContent
      );

      const success = await conflictResolver.resolveAllConflictsInFile(filePath);
      expect(success).toBe(true);

      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toEqual(testFixtures.noConflictContent);
    });
  });

  // Additional edge case tests
  describe('Edge Cases and Error Handling', () => {
    it('should detect non-existent files', async () => {
      expect(async () => {
        await conflictResolver.detectConflicts('/nonexistent/file.ts');
      }).toThrow();
    });

    it('should handle malformed conflict markers', async () => {
      const tempDir = tempDirManager.createTempDir('malformed-test-');
      const malformedContent = `line 1
<<<<<<< HEAD
incomplete conflict
(missing middle marker and end marker)
line 5`;

      const filePath = tempDirManager.createTempFile(tempDir, 'file.ts', malformedContent);

      const markers = await conflictResolver.detectConflicts(filePath);
      expect(markers).toHaveLength(0);
    });

    it('should log detection operations', async () => {
      const tempDir = tempDirManager.createTempDir('log-test-');
      const filePath = tempDirManager.createTempFile(tempDir, 'file.ts', testFixtures.conflictContent);

      await conflictResolver.detectConflicts(filePath);

      const logs = mockLogger.getLogsByLevel('INFO');
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]?.message).toContain('Detecting conflicts');
    });

    it('should handle files with special characters in path', async () => {
      const tempDir = tempDirManager.createTempDir('special-chars-test-');
      const filePath = tempDirManager.createTempFile(
        tempDir,
        'file-with-special-name_@#$.ts',
        testFixtures.conflictContent
      );

      const markers = await conflictResolver.detectConflicts(filePath);
      expect(markers).toHaveLength(1);
    });

    it('should handle very long conflict sections', async () => {
      const tempDir = tempDirManager.createTempDir('long-conflict-test-');
      let longConflict = 'line 1\n<<<<<<< HEAD\n';
      for (let i = 0; i < 1000; i++) {
        longConflict += `custom line ${i}\n`;
      }
      longConflict += '=======\n';
      for (let i = 0; i < 1000; i++) {
        longConflict += `upstream line ${i}\n`;
      }
      longConflict += '>>>>>>> upstream/main\nline 2';

      const filePath = tempDirManager.createTempFile(tempDir, 'file.ts', longConflict);

      const markers = await conflictResolver.detectConflicts(filePath);
      expect(markers).toHaveLength(1);
      expect(markers[0]?.ours).toContain('custom line 0');
      expect(markers[0]?.theirs).toContain('upstream line 0');
    });

    it('should handle empty conflict sections', async () => {
      const tempDir = tempDirManager.createTempDir('empty-conflict-test-');
      const emptyConflict = `line 1
<<<<<<< HEAD
=======
>>>>>>> upstream/main
line 2`;

      const filePath = tempDirManager.createTempFile(tempDir, 'file.ts', emptyConflict);

      const markers = await conflictResolver.detectConflicts(filePath);
      expect(markers).toHaveLength(1);
      expect(markers[0]?.ours).toBe('');
      expect(markers[0]?.theirs).toBe('');
    });
  });
});
