/**
 * Integration tests: ConflictResolver → ReportGenerator
 * Tests the connection from conflict resolution to report generation
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { MockLogger } from '../unit/setup';
import {
  MockConflictResolver,
  MockReportGenerator,
  integrationTestFixtures,
} from './setup';

describe('Integration Tests: ConflictResolver → ReportGenerator', () => {
  let mockLogger: MockLogger;
  let conflictResolver: MockConflictResolver;
  let reportGenerator: MockReportGenerator;

  beforeEach(() => {
    mockLogger = new MockLogger();
    conflictResolver = new MockConflictResolver(mockLogger);
    reportGenerator = new MockReportGenerator(mockLogger);
  });

  afterEach(() => {
    mockLogger.clear();
  });

  // TC-INT-017: Resolver result should be used in report generation
  it('[TC-INT-017] should use resolver result in report generation', () => {
    // Arrange: Set resolve result
    const resolveResult = integrationTestFixtures.resolveResultAutoResolved;
    conflictResolver.setResolveResult(resolveResult);

    // Act: Generate report from resolver result
    const resolverResult = conflictResolver.getResolveResult();
    const report = reportGenerator.generateCLISummary(resolverResult);

    // Assert: Report contains resolver result information
    expect(report).toContain('自動解決されたファイル数: 2 件');
    expect(report).toContain('手動解決が必要なファイル数: 1 件');
  });

  // TC-INT-018: Zero conflicts should generate appropriate message
  it('[TC-INT-018] should generate report for zero conflicts', () => {
    // Arrange: No conflicts
    const resolveResult = integrationTestFixtures.resolveResultNoConflicts;
    conflictResolver.setResolveResult(resolveResult);

    // Act: Generate report
    const report = reportGenerator.generateCLISummary(resolveResult);

    // Assert: Zero conflicts message
    expect(report).toContain('コンフリクトはありません');
  });

  // TC-INT-019: File list should be included in report
  it('[TC-INT-019] should include file list in report', () => {
    // Arrange: Set resolve result with files
    const resolveResult = integrationTestFixtures.resolveResultAutoResolved;
    conflictResolver.setResolveResult(resolveResult);

    // Act: Generate report
    const report = reportGenerator.generateCLISummary(resolveResult);

    // Assert: File names are in report
    expect(report).toContain('src/config.ts');
    expect(report).toContain('src/utils.ts');
    expect(report).toContain('src/main.ts');
  });

  // TC-INT-020: Log file should be generated with correct format
  it('[TC-INT-020] should generate log file with correct timestamp format', async () => {
    // Arrange: Prepare resolution and logs
    const resolveResult = integrationTestFixtures.resolveResultAutoResolved;
    const mockLogs = [
      {
        level: 'INFO',
        message: 'Starting merge',
        timestamp: new Date('2025-10-19T10:00:00Z'),
      },
      {
        level: 'INFO',
        message: 'Merge completed',
        timestamp: new Date('2025-10-19T10:00:05Z'),
      },
    ];

    // Act: Generate log file
    const logPath = await reportGenerator.generateLogFile(resolveResult, mockLogs);

    // Assert: Log file name matches expected format (YYYYMMDD-HHMMSS.log)
    expect(logPath).toMatch(/merge-report-\d{8}-\d{6}\.log/);
  });

  // TC-INT-021: Report should accurately reflect statistics
  it('[TC-INT-021] should accurately reflect conflict statistics', () => {
    // Arrange: Multiple conflict scenarios
    const scenarios = [
      {
        result: { autoResolved: [], manualRequired: [], totalConflicts: 0 },
        expected: 'コンフリクトはありません',
      },
      {
        result: { autoResolved: ['a.ts'], manualRequired: [], totalConflicts: 1 },
        expected: '自動解決されたファイル数: 1 件',
      },
      {
        result: {
          autoResolved: ['a.ts', 'b.ts'],
          manualRequired: ['c.ts'],
          totalConflicts: 3,
        },
        expected: '自動解決されたファイル数: 2 件',
      },
    ];

    // Act & Assert: Verify each scenario
    scenarios.forEach((scenario) => {
      const report = reportGenerator.generateCLISummary(scenario.result);
      expect(report).toContain(scenario.expected);
    });
  });

  // TC-INT-022: All auto-resolved files should be listed
  it('[TC-INT-022] should list all auto-resolved files', () => {
    // Arrange
    const autoResolvedFiles = ['src/config.ts', 'src/utils.ts', 'src/helpers.ts'];
    const resolveResult = {
      autoResolved: autoResolvedFiles,
      manualRequired: [],
      totalConflicts: 3,
    };

    // Act: Generate report
    const report = reportGenerator.generateCLISummary(resolveResult);

    // Assert: All files are listed
    autoResolvedFiles.forEach((file) => {
      expect(report).toContain(file);
    });
  });

  // TC-INT-023: All manual resolution files should be listed
  it('[TC-INT-023] should list all manual resolution files', () => {
    // Arrange
    const manualFiles = ['src/main.ts', 'src/app.ts'];
    const resolveResult = {
      autoResolved: [],
      manualRequired: manualFiles,
      totalConflicts: 2,
    };

    // Act: Generate report
    const report = reportGenerator.generateCLISummary(resolveResult);

    // Assert: All manual files are listed
    manualFiles.forEach((file) => {
      expect(report).toContain(file);
    });
  });

  // TC-INT-024: Logging should occur during report generation
  it('[TC-INT-024] should maintain logging during report generation', async () => {
    // Arrange
    const resolveResult = integrationTestFixtures.resolveResultAutoResolved;
    conflictResolver.setResolveResult(resolveResult);

    // Act: Full workflow
    await conflictResolver.resolveConflicts(['src/main.ts'], null as any, null as any);
    const report = reportGenerator.generateCLISummary(resolveResult);

    // Assert: Logs are recorded
    const logs = mockLogger.getLogs();
    expect(logs.length).toBeGreaterThan(0);
  });

  // TC-INT-025: Large number of conflicts should be handled
  it('[TC-INT-025] should handle large number of conflicts', () => {
    // Arrange: Create result with many files
    const manyFiles = Array.from({ length: 50 }, (_, i) => `src/file-${i}.ts`);
    const resolveResult = {
      autoResolved: manyFiles.slice(0, 30),
      manualRequired: manyFiles.slice(30),
      totalConflicts: 50,
    };

    // Act: Generate report
    const report = reportGenerator.generateCLISummary(resolveResult);

    // Assert: Report handles large numbers
    expect(report).toContain('自動解決されたファイル数: 30 件');
    expect(report).toContain('手動解決が必要なファイル数: 20 件');
    expect(report).toContain('src/file-0.ts');
    expect(report).toContain('src/file-49.ts');
  });

  // TC-INT-026: Data integrity from resolver to report
  it('[TC-INT-026] should maintain data integrity in Resolver-to-Report flow', () => {
    // Arrange: Set specific data
    const testData = {
      autoResolved: ['file1.ts', 'file2.ts'],
      manualRequired: ['file3.ts'],
      totalConflicts: 3,
    };
    conflictResolver.setResolveResult(testData);

    // Act: Retrieve and generate report
    const resolveResult = conflictResolver.getResolveResult();
    const report = reportGenerator.generateCLISummary(resolveResult);

    // Assert: Data remains unchanged
    expect(resolveResult.autoResolved).toEqual(testData.autoResolved);
    expect(resolveResult.manualRequired).toEqual(testData.manualRequired);
    expect(report).toContain('file1.ts');
    expect(report).toContain('file2.ts');
    expect(report).toContain('file3.ts');
  });
});
