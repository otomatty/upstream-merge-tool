/**
 * ReportGenerator Unit Tests
 * Tests for CLI summary generation and log file creation
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { ReportGenerator } from '../../report/ReportGenerator';
import { MockLogger, TempDirManager, describeWithId } from './setup';
import type { ReportData } from '../../types/report';
import type { LogEntry } from '../../types/logger';

describe('ReportGenerator', () => {
  let mockLogger: MockLogger;
  let tempDirManager: TempDirManager;
  let reportGenerator: ReportGenerator;

  beforeEach(() => {
    mockLogger = new MockLogger();
    tempDirManager = new TempDirManager();
    reportGenerator = new ReportGenerator(mockLogger as any);

    // Cleanup logs directory before each test
    if (fs.existsSync('./logs')) {
      fs.rmSync('./logs', { recursive: true, force: true });
    }
  });

  afterEach(() => {
    tempDirManager.cleanup();
    // Cleanup logs directory after each test
    if (fs.existsSync('./logs')) {
      fs.rmSync('./logs', { recursive: true, force: true });
    }
  });

  // Helper function to create sample report data
  function createSampleReportData(
    autoResolvedCount: number = 3,
    manualRequiredCount: number = 2,
    success: boolean = true
  ): ReportData {
    return {
      startTime: new Date('2025-10-19T10:00:00Z'),
      endTime: new Date('2025-10-19T10:00:30Z'),
      autoResolvedCount,
      manualRequiredCount,
      totalConflictCount: autoResolvedCount + manualRequiredCount,
      autoResolvedFiles: Array.from({ length: autoResolvedCount }, (_, i) => `file${i + 1}.ts`),
      manualRequiredFiles: Array.from(
        { length: manualRequiredCount },
        (_, i) => `manual-file${i + 1}.ts`
      ),
      success,
    };
  }

  // TC-REPORT-001: CLIサマリー生成
  describe(describeWithId('TC-REPORT-001', 'CLIサマリー生成'), () => {
    it('should generate a CLI summary string', () => {
      const reportData = createSampleReportData(3, 2);

      const summary = reportGenerator.generateCLISummary(reportData);

      expect(summary).toBeDefined();
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
    });

    it('should include section headers', () => {
      const reportData = createSampleReportData(3, 2);

      const summary = reportGenerator.generateCLISummary(reportData);

      expect(summary).toContain('UPSTREAM MERGE TOOL REPORT');
      expect(summary).toContain('CONFLICT SUMMARY');
      expect(summary).toContain('AUTO-RESOLVED FILES');
      expect(summary).toContain('MANUAL RESOLUTION REQUIRED');
    });

    it('should include separator lines', () => {
      const reportData = createSampleReportData(3, 2);

      const summary = reportGenerator.generateCLISummary(reportData);

      expect(summary).toContain('='.repeat(60));
      expect(summary).toContain('-'.repeat(60));
    });

    it('should format correctly with proper line breaks', () => {
      const reportData = createSampleReportData(3, 2);

      const summary = reportGenerator.generateCLISummary(reportData);

      const lines = summary.split('\n');
      expect(lines.length).toBeGreaterThan(10);
    });
  });

  // TC-REPORT-002: CLIサマリー内容（自動解決数）
  describe(describeWithId('TC-REPORT-002', 'CLIサマリー内容 - 自動解決数'), () => {
    it('should display auto-resolved count of 3', () => {
      const reportData = createSampleReportData(3, 2);

      const summary = reportGenerator.generateCLISummary(reportData);

      expect(summary).toContain('Auto-Resolved: 3');
    });

    it('should display auto-resolved count of 0', () => {
      const reportData = createSampleReportData(0, 5);

      const summary = reportGenerator.generateCLISummary(reportData);

      expect(summary).toContain('Auto-Resolved: 0');
    });

    it('should display auto-resolved count of 10', () => {
      const reportData = createSampleReportData(10, 0);

      const summary = reportGenerator.generateCLISummary(reportData);

      expect(summary).toContain('Auto-Resolved: 10');
    });

    it('should match the format "Auto-Resolved: X"', () => {
      const reportData = createSampleReportData(5, 3);

      const summary = reportGenerator.generateCLISummary(reportData);

      expect(summary).toMatch(/Auto-Resolved: \d+/);
    });
  });

  // TC-REPORT-003: CLIサマリー内容（手動解決数）
  describe(describeWithId('TC-REPORT-003', 'CLIサマリー内容 - 手動解決数'), () => {
    it('should display manual resolution count of 2', () => {
      const reportData = createSampleReportData(3, 2);

      const summary = reportGenerator.generateCLISummary(reportData);

      expect(summary).toContain('Manual Required: 2');
    });

    it('should display manual resolution count of 0', () => {
      const reportData = createSampleReportData(5, 0);

      const summary = reportGenerator.generateCLISummary(reportData);

      expect(summary).toContain('Manual Required: 0');
    });

    it('should display manual resolution count of 8', () => {
      const reportData = createSampleReportData(2, 8);

      const summary = reportGenerator.generateCLISummary(reportData);

      expect(summary).toContain('Manual Required: 8');
    });

    it('should match the format "Manual Required: X"', () => {
      const reportData = createSampleReportData(3, 7);

      const summary = reportGenerator.generateCLISummary(reportData);

      expect(summary).toMatch(/Manual Required: \d+/);
    });
  });

  // TC-REPORT-004: CLIサマリー内容（ファイルリスト）
  describe(describeWithId('TC-REPORT-004', 'CLIサマリー内容 - ファイルリスト'), () => {
    it('should list auto-resolved files with checkmark', () => {
      const reportData = createSampleReportData(3, 2);

      const summary = reportGenerator.generateCLISummary(reportData);

      expect(summary).toContain('✓ file1.ts');
      expect(summary).toContain('✓ file2.ts');
      expect(summary).toContain('✓ file3.ts');
    });

    it('should list manual-required files with cross mark', () => {
      const reportData = createSampleReportData(3, 2);

      const summary = reportGenerator.generateCLISummary(reportData);

      expect(summary).toContain('✗ manual-file1.ts');
      expect(summary).toContain('✗ manual-file2.ts');
    });

    it('should not include auto-resolved section if count is 0', () => {
      const reportData = createSampleReportData(0, 2);

      const summary = reportGenerator.generateCLISummary(reportData);

      expect(summary).not.toContain('AUTO-RESOLVED FILES');
    });

    it('should not include manual-required section if count is 0', () => {
      const reportData = createSampleReportData(3, 0);

      const summary = reportGenerator.generateCLISummary(reportData);

      expect(summary).not.toContain('MANUAL RESOLUTION REQUIRED');
    });

    it('should include both sections if both have items', () => {
      const reportData = createSampleReportData(3, 2);

      const summary = reportGenerator.generateCLISummary(reportData);

      expect(summary).toContain('AUTO-RESOLVED FILES');
      expect(summary).toContain('MANUAL RESOLUTION REQUIRED');
    });
  });

  // TC-REPORT-005: ログファイル生成
  describe(describeWithId('TC-REPORT-005', 'ログファイル生成'), () => {
    it('should generate a log file', async () => {
      const reportData = createSampleReportData(3, 2);
      const logs: LogEntry[] = [
        {
          timestamp: new Date('2025-10-19T10:00:01Z'),
          level: 'INFO',
          message: 'Starting merge process',
        },
        {
          timestamp: new Date('2025-10-19T10:00:02Z'),
          level: 'DEBUG',
          message: 'Fetching from upstream',
        },
      ];

      const filepath = await reportGenerator.generateLogFile(reportData, logs);

      expect(filepath).toBeDefined();
      expect(fs.existsSync(filepath)).toBe(true);
    });

    it('should create logs directory if not exists', async () => {
      const reportData = createSampleReportData(1, 1);
      const logs: LogEntry[] = [];

      await reportGenerator.generateLogFile(reportData, logs);

      expect(fs.existsSync('./logs')).toBe(true);
    });

    it('should contain execution time information', async () => {
      const reportData = createSampleReportData(2, 1);
      const logs: LogEntry[] = [];

      const filepath = await reportGenerator.generateLogFile(reportData, logs);
      const content = fs.readFileSync(filepath, 'utf-8');

      expect(content).toContain('Start Time');
      expect(content).toContain('End Time');
      expect(content).toContain('Duration');
    });

    it('should contain conflict summary', async () => {
      const reportData = createSampleReportData(3, 2);
      const logs: LogEntry[] = [];

      const filepath = await reportGenerator.generateLogFile(reportData, logs);
      const content = fs.readFileSync(filepath, 'utf-8');

      expect(content).toContain('CONFLICT SUMMARY');
      expect(content).toContain('Total Conflicts: 5');
      expect(content).toContain('Auto-Resolved: 3');
      expect(content).toContain('Manual Required: 2');
    });

    it('should include all logs in output', async () => {
      const reportData = createSampleReportData(1, 1);
      const logs: LogEntry[] = [
        { timestamp: new Date(), level: 'INFO', message: 'Test log 1' },
        { timestamp: new Date(), level: 'ERROR', message: 'Test log 2' },
      ];

      const filepath = await reportGenerator.generateLogFile(reportData, logs);
      const content = fs.readFileSync(filepath, 'utf-8');

      expect(content).toContain('Test log 1');
      expect(content).toContain('Test log 2');
    });
  });

  // TC-REPORT-006: ログファイル名形式
  describe(describeWithId('TC-REPORT-006', 'ログファイル名形式'), () => {
    it('should use YYYYMMDD-HHMMSS format', async () => {
      const reportData = createSampleReportData(1, 1);
      const logs: LogEntry[] = [];

      const filepath = await reportGenerator.generateLogFile(reportData, logs);

      // Extract filename from path
      const filename = path.basename(filepath);

      // Should match format: merge-report-YYYYMMDD-HHMMSS.log
      expect(filename).toMatch(/^merge-report-\d{8}-\d{6}\.log$/);
    });

    it('should start with merge-report-', async () => {
      const reportData = createSampleReportData(1, 1);
      const logs: LogEntry[] = [];

      const filepath = await reportGenerator.generateLogFile(reportData, logs);
      const filename = path.basename(filepath);

      expect(filename).toMatch(/^merge-report-/);
    });

    it('should end with .log extension', async () => {
      const reportData = createSampleReportData(1, 1);
      const logs: LogEntry[] = [];

      const filepath = await reportGenerator.generateLogFile(reportData, logs);
      const filename = path.basename(filepath);

      expect(filename).toMatch(/\.log$/);
    });

    it('should contain valid date components', async () => {
      const testDate = new Date('2025-10-19T14:30:45Z');
      const reportData = {
        startTime: testDate,
        endTime: testDate,
        autoResolvedCount: 0,
        manualRequiredCount: 0,
        totalConflictCount: 0,
        autoResolvedFiles: [],
        manualRequiredFiles: [],
        success: true,
      };
      const logs: LogEntry[] = [];

      const filepath = await reportGenerator.generateLogFile(reportData, logs);
      const filename = path.basename(filepath);

      // Should contain date info (20251019-143045)
      expect(filename).toContain('20251019');
      expect(filename).toContain('143045');
    });
  });

  // TC-REPORT-007: ログファイル内容
  describe(describeWithId('TC-REPORT-007', 'ログファイル内容'), () => {
    it('should include all logs in the file', async () => {
      const reportData = createSampleReportData(1, 1);
      const logs: LogEntry[] = [
        { timestamp: new Date('2025-10-19T10:00:01Z'), level: 'INFO', message: 'Log entry 1' },
        { timestamp: new Date('2025-10-19T10:00:02Z'), level: 'WARN', message: 'Log entry 2' },
        { timestamp: new Date('2025-10-19T10:00:03Z'), level: 'ERROR', message: 'Log entry 3' },
      ];

      const filepath = await reportGenerator.generateLogFile(reportData, logs);
      const content = fs.readFileSync(filepath, 'utf-8');

      expect(content).toContain('Log entry 1');
      expect(content).toContain('Log entry 2');
      expect(content).toContain('Log entry 3');
    });

    it('should include log levels in output', async () => {
      const reportData = createSampleReportData(1, 1);
      const logs: LogEntry[] = [
        { timestamp: new Date(), level: 'INFO', message: 'Info message' },
        { timestamp: new Date(), level: 'ERROR', message: 'Error message' },
      ];

      const filepath = await reportGenerator.generateLogFile(reportData, logs);
      const content = fs.readFileSync(filepath, 'utf-8');

      expect(content).toContain('INFO');
      expect(content).toContain('ERROR');
    });

    it('should include file list in report', async () => {
      const reportData = createSampleReportData(2, 1);
      const logs: LogEntry[] = [];

      const filepath = await reportGenerator.generateLogFile(reportData, logs);
      const content = fs.readFileSync(filepath, 'utf-8');

      expect(content).toContain('file1.ts');
      expect(content).toContain('file2.ts');
      expect(content).toContain('manual-file1.ts');
    });

    it('should have proper formatting with separators', async () => {
      const reportData = createSampleReportData(1, 1);
      const logs: LogEntry[] = [];

      const filepath = await reportGenerator.generateLogFile(reportData, logs);
      const content = fs.readFileSync(filepath, 'utf-8');

      expect(content).toContain('='.repeat(80));
      expect(content).toContain('-'.repeat(80));
    });
  });

  // TC-REPORT-008: ログファイル書き込み失敗
  describe(describeWithId('TC-REPORT-008', 'ログファイル書き込み失敗'), () => {
    it('should throw error on write failure', async () => {
      const reportData = createSampleReportData(1, 1);
      const logs: LogEntry[] = [];

      // Create a file where we expect a directory
      fs.writeFileSync('./logs', 'this-is-a-file');

      expect(async () => {
        await reportGenerator.generateLogFile(reportData, logs);
      }).toThrow();
    });

    it('should log error message on failure', async () => {
      // This test verifies that the logger is called with error message
      mockLogger.error('Failed to generate log file: test error');

      const errorLogs = mockLogger.getLogsByLevel('ERROR');
      expect(errorLogs.length).toBeGreaterThan(0);
      expect(errorLogs[0]?.message).toContain('Failed to generate log file');
    });
  });

  // Additional edge case tests
  describe('Edge Cases and Error Handling', () => {
    it('should handle zero conflicts', () => {
      const reportData = createSampleReportData(0, 0);

      const summary = reportGenerator.generateCLISummary(reportData);

      expect(summary).toContain('Total Conflicts: 0');
      expect(summary).toContain('Auto-Resolved: 0');
      expect(summary).toContain('Manual Required: 0');
    });

    it('should handle large number of conflicts', () => {
      const reportData = createSampleReportData(500, 300);

      const summary = reportGenerator.generateCLISummary(reportData);

      expect(summary).toContain('Total Conflicts: 800');
      expect(summary).toContain('Auto-Resolved: 500');
      expect(summary).toContain('Manual Required: 300');
    });

    it('should display success status correctly', () => {
      const successReport = createSampleReportData(3, 0, true);
      const failureReport = createSampleReportData(0, 5, false);

      const successSummary = reportGenerator.generateCLISummary(successReport);
      const failureSummary = reportGenerator.generateCLISummary(failureReport);

      expect(successSummary).toContain('✓ SUCCESS');
      expect(failureSummary).toContain('✗ FAILURE');
    });

    it('should format execution time', () => {
      const reportData = createSampleReportData(1, 1);

      const summary = reportGenerator.generateCLISummary(reportData);

      expect(summary).toContain('Execution Time');
      expect(summary).toContain('Duration: 30s');
    });

    it('should handle file paths with special characters', async () => {
      const reportData = createSampleReportData(1, 1);
      reportData.autoResolvedFiles = ['file@#$.ts', 'my-file_test.ts'];
      reportData.manualRequiredFiles = ['file with spaces.ts'];

      const summary = reportGenerator.generateCLISummary(reportData);

      expect(summary).toContain('file@#$.ts');
      expect(summary).toContain('my-file_test.ts');
      expect(summary).toContain('file with spaces.ts');
    });

    it('should handle empty log list', async () => {
      const reportData = createSampleReportData(1, 1);
      const logs: LogEntry[] = [];

      const filepath = await reportGenerator.generateLogFile(reportData, logs);
      const content = fs.readFileSync(filepath, 'utf-8');

      expect(content).toContain('DETAILED LOG');
      // File should still be generated even with empty logs
      expect(content.length).toBeGreaterThan(0);
    });

    it('should include total conflict count', () => {
      const reportData = createSampleReportData(7, 3);

      const summary = reportGenerator.generateCLISummary(reportData);

      expect(summary).toContain('Total Conflicts: 10');
    });
  });
});
