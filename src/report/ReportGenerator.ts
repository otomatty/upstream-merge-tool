import type { ReportData } from '../types/report';
import type { LogEntry } from '../types/logger';
import type { Logger } from '../logger/Logger';
import { writeFile, ensureDir } from '../utils/runtime';

/**
 * ReportGenerator class for creating merge reports
 * Supports both Bun and Node.js runtimes
 */
export class ReportGenerator {
  constructor(private logger: Logger) {}

  /**
   * Generate a CLI summary string
   */
  generateCLISummary(data: ReportData): string {
    const executionTime = Math.round(
      (data.endTime.getTime() - data.startTime.getTime()) / 1000
    );

    let summary = '\n';
    summary += '='.repeat(60) + '\n';
    summary += 'UPSTREAM MERGE TOOL REPORT\n';
    summary += '='.repeat(60) + '\n';
    summary += 'Execution Time: ' + this.formatTimestamp(data.startTime) + '\n';
    summary += 'Duration: ' + executionTime + 's\n';
    summary += 'Status: ' + (data.success ? '✓ SUCCESS' : '✗ FAILURE') + '\n';

    // Add version information if available
    if (data.previousVersion || data.currentVersion) {
      summary += '\n';
      summary += 'VERSION INFORMATION:\n';
      summary += '-'.repeat(60) + '\n';
      if (data.previousVersion) {
        summary += 'Previous Version: ' + data.previousVersion + '\n';
      }
      if (data.currentVersion) {
        summary += 'Current Version: ' + data.currentVersion + '\n';
      }
      if (data.versionSource) {
        summary += 'Source: ' + data.versionSource + '\n';
      }
    }

    summary += '\n';
    summary += 'CONFLICT SUMMARY:\n';
    summary += '-'.repeat(60) + '\n';
    summary += 'Total Conflicts: ' + data.totalConflictCount + '\n';
    summary += 'Auto-Resolved: ' + data.autoResolvedCount + '\n';
    summary += 'Manual Required: ' + data.manualRequiredCount + '\n';
    summary += '\n';

    if (data.autoResolvedCount > 0) {
      summary += 'AUTO-RESOLVED FILES:\n';
      for (const file of data.autoResolvedFiles) {
        summary += '  ✓ ' + file + '\n';
      }
      summary += '\n';
    }

    if (data.manualRequiredCount > 0) {
      summary += 'MANUAL RESOLUTION REQUIRED:\n';
      for (const file of data.manualRequiredFiles) {
        summary += '  ✗ ' + file + '\n';
      }
      summary += '\n';
    }

    summary += '='.repeat(60) + '\n';

    return summary;
  }

  /**
   * Generate and save a detailed log file
   */
  async generateLogFile(data: ReportData, logs: LogEntry[]): Promise<string> {
    try {
      const timestamp = this.getTimestampForFilename(data.startTime);
      const filename = 'merge-report-' + timestamp + '.log';
      const filepath = './logs/' + filename;

      // Create logs directory if it doesn't exist
      await ensureDir('./logs');
      await writeFile('./logs/.gitkeep', '');

      let content = '';
      content += '='.repeat(80) + '\n';
      content += 'UPSTREAM MERGE TOOL EXECUTION LOG\n';
      content += '='.repeat(80) + '\n';
      content += 'Start Time: ' + this.formatTimestamp(data.startTime) + '\n';
      content += 'End Time: ' + this.formatTimestamp(data.endTime) + '\n';
      content += 'Duration: ' + Math.round((data.endTime.getTime() - data.startTime.getTime()) / 1000) + 's\n';
      content += 'Status: ' + (data.success ? 'SUCCESS' : 'FAILURE') + '\n';

      // Add version information if available
      if (data.previousVersion || data.currentVersion) {
        content += '\n';
        content += 'VERSION INFORMATION:\n';
        content += '-'.repeat(80) + '\n';
        if (data.previousVersion) {
          content += 'Previous Version: ' + data.previousVersion + '\n';
        }
        if (data.currentVersion) {
          content += 'Current Version: ' + data.currentVersion + '\n';
        }
        if (data.versionSource) {
          content += 'Source: ' + data.versionSource + '\n';
        }
        content += '\n';
      }

      content += 'CONFLICT SUMMARY:\n';
      content += '-'.repeat(80) + '\n';
      content += 'Total Conflicts: ' + data.totalConflictCount + '\n';
      content += 'Auto-Resolved: ' + data.autoResolvedCount + '\n';
      content += 'Manual Required: ' + data.manualRequiredCount + '\n';
      content += '\n';

      if (data.autoResolvedCount > 0) {
        content += 'AUTO-RESOLVED FILES:\n';
        for (const file of data.autoResolvedFiles) {
          content += '  [RESOLVED] ' + file + '\n';
        }
        content += '\n';
      }

      if (data.manualRequiredCount > 0) {
        content += 'MANUAL RESOLUTION REQUIRED:\n';
        for (const file of data.manualRequiredFiles) {
          content += '  [MANUAL] ' + file + '\n';
        }
        content += '\n';
      }

      content += 'DETAILED LOG:\n';
      content += '-'.repeat(80) + '\n';
      for (const log of logs) {
        // Use the formatLogEntry method from logger
        const formattedLog = log.timestamp.toISOString() + ' ' + log.level + ' | ' + log.message;
        content += formattedLog + '\n';
      }

      content += '\n' + '='.repeat(80) + '\n';

      await writeFile(filepath, content);
      this.logger.info('Log file generated: ' + filepath);

      return filepath;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to generate log file: ' + errorMessage);
      throw error;
    }
  }

  /**
   * Format a date as ISO string
   */
  private formatTimestamp(date: Date): string {
    return date.toISOString();
  }

  /**
   * Format a date for filename (YYYYMMDD-HHMMSS)
   */
  private getTimestampForFilename(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return year + month + day + '-' + hours + minutes + seconds;
  }
}
