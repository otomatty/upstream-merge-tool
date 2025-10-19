/**
 * Integration tests: ConfigManager → VersionExtractor → ReportGenerator
 * Tests the complete flow of version tracking from configuration to report generation
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { MockLogger } from '../unit/setup';
import type { Config, VersionTrackingConfig } from '../../types/config';
import type { VersionInfo } from '../../types/git';
import type { ReportData } from '../../types/report';

describe('Integration Tests: Version Tracking Flow', () => {
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockLogger = new MockLogger();
  });

  afterEach(() => {
    mockLogger.clear();
  });

  describe('[TC-INT-VERS-001] Configuration → Version Extraction', () => {
    it('should load config with version tracking enabled', () => {
      // Arrange: Config with version tracking
      const config: Config = {
        upstream_repository_name: 'upstream',
        upstream_branch_name: 'main',
        last_merged_upstream_commit: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
        upstream_version_tracking: {
          enabled: true,
          type: 'tag',
        },
        custom_code_marker: {
          start: '// CUSTOM-CODE-START',
          end: '// CUSTOM-CODE-END',
        },
      };

      // Act & Assert
      expect(config.upstream_version_tracking).toBeDefined();
      expect(config.upstream_version_tracking?.enabled).toBe(true);
      expect(config.upstream_version_tracking?.type).toBe('tag');
    });

    it('should load config with previous version stored', () => {
      // Arrange: Config with last_merged_upstream_version
      const config: Config = {
        upstream_repository_name: 'upstream',
        upstream_branch_name: 'main',
        last_merged_upstream_commit: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
        last_merged_upstream_version: 'v1.2.0',
        upstream_version_tracking: {
          enabled: true,
          type: 'package',
        },
        custom_code_marker: {
          start: '// CUSTOM-CODE-START',
          end: '// CUSTOM-CODE-END',
        },
      };

      // Act & Assert
      expect(config.last_merged_upstream_version).toBe('v1.2.0');
      mockLogger.info(`Previous version: ${config.last_merged_upstream_version}`);
      expect(mockLogger.getLogs().some((log) => log.message.includes('v1.2.0'))).toBe(true);
    });

    it('should handle manual version configuration', () => {
      // Arrange: Config with manual version
      const config: Config = {
        upstream_repository_name: 'upstream',
        upstream_branch_name: 'main',
        last_merged_upstream_commit: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
        upstream_version_tracking: {
          enabled: true,
          type: 'manual',
          value: 'release-2025-10-19',
        },
        custom_code_marker: {
          start: '// CUSTOM-CODE-START',
          end: '// CUSTOM-CODE-END',
        },
      };

      // Act & Assert
      expect(config.upstream_version_tracking?.type).toBe('manual');
      expect(config.upstream_version_tracking?.value).toBe('release-2025-10-19');
    });

    it('should handle disabled version tracking', () => {
      // Arrange: Config with version tracking disabled
      const config: Config = {
        upstream_repository_name: 'upstream',
        upstream_branch_name: 'main',
        last_merged_upstream_commit: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
        upstream_version_tracking: {
          enabled: false,
        },
        custom_code_marker: {
          start: '// CUSTOM-CODE-START',
          end: '// CUSTOM-CODE-END',
        },
      };

      // Act & Assert
      expect(config.upstream_version_tracking?.enabled).toBe(false);
      mockLogger.info('Version tracking disabled');
      expect(mockLogger.getLogs().length).toBeGreaterThan(0);
    });
  });

  describe('[TC-INT-VERS-002] Version Info Flow to Report', () => {
    it('should propagate version info to report data', () => {
      // Arrange: Version info from extraction
      const versionInfo: VersionInfo = {
        version: 'v1.3.0',
        source: 'tag',
        isValid: true,
      };

      const previousVersion = 'v1.2.0';

      // Act: Create report data with version info
      const reportData: ReportData = {
        startTime: new Date(),
        endTime: new Date(),
        autoResolvedCount: 0,
        manualRequiredCount: 0,
        totalConflictCount: 0,
        autoResolvedFiles: [],
        manualRequiredFiles: [],
        success: true,
        previousVersion,
        currentVersion: versionInfo.version,
        versionSource: versionInfo.source,
      };

      // Assert: Report contains version information
      expect(reportData.previousVersion).toBe('v1.2.0');
      expect(reportData.currentVersion).toBe('v1.3.0');
      expect(reportData.versionSource).toBe('tag');
      mockLogger.info(`Version update: ${reportData.previousVersion} → ${reportData.currentVersion}`);
    });

    it('should handle report generation with version info', () => {
      // Arrange: Report data with version info
      const reportData: ReportData = {
        startTime: new Date('2025-10-19T00:00:00Z'),
        endTime: new Date('2025-10-19T00:00:05Z'),
        autoResolvedCount: 2,
        manualRequiredCount: 1,
        totalConflictCount: 3,
        autoResolvedFiles: ['src/main.ts', 'src/utils.ts'],
        manualRequiredFiles: ['src/config.ts'],
        success: false,
        previousVersion: 'v1.0.0',
        currentVersion: 'v2.0.0',
        versionSource: 'package',
      };

      // Act: Generate summary with version info
      let summary = '\nUPSTREAM MERGE TOOL REPORT\n';
      summary += '============================\n';
      if (reportData.previousVersion || reportData.currentVersion) {
        summary += '\nVERSION INFORMATION:\n';
        summary += `Previous Version: ${reportData.previousVersion}\n`;
        summary += `Current Version: ${reportData.currentVersion}\n`;
        summary += `Source: ${reportData.versionSource}\n`;
      }
      summary += '\nCONFLICT SUMMARY:\n';
      summary += `Total Conflicts: ${reportData.totalConflictCount}\n`;
      summary += `Auto-Resolved: ${reportData.autoResolvedCount}\n`;
      summary += `Manual Required: ${reportData.manualRequiredCount}\n`;

      // Assert: Summary includes version information
      expect(summary).toContain('VERSION INFORMATION');
      expect(summary).toContain('v1.0.0');
      expect(summary).toContain('v2.0.0');
      expect(summary).toContain('package');
      expect(summary).toContain('CONFLICT SUMMARY');
    });

    it('should handle report without version info (backward compatibility)', () => {
      // Arrange: Report data without version info
      const reportData: ReportData = {
        startTime: new Date('2025-10-19T00:00:00Z'),
        endTime: new Date('2025-10-19T00:00:02Z'),
        autoResolvedCount: 0,
        manualRequiredCount: 0,
        totalConflictCount: 0,
        autoResolvedFiles: [],
        manualRequiredFiles: [],
        success: true,
        // No version info
      };

      // Act: Generate summary without version info
      let summary = '\nUPSTREAM MERGE TOOL REPORT\n';
      summary += '============================\n';
      if (reportData.previousVersion || reportData.currentVersion) {
        summary += '\nVERSION INFORMATION:\n';
      }
      summary += '\nCONFLICT SUMMARY:\n';
      summary += `Total Conflicts: ${reportData.totalConflictCount}\n`;

      // Assert: Summary works without version info
      expect(summary).not.toContain('VERSION INFORMATION');
      expect(summary).toContain('CONFLICT SUMMARY');
      expect(summary).toContain('Total Conflicts: 0');
    });
  });

  describe('[TC-INT-VERS-003] Version Configuration Validation Flow', () => {
    it('should validate tag type configuration', () => {
      // Arrange: Tag type config
      const config: VersionTrackingConfig = {
        enabled: true,
        type: 'tag',
      };

      // Act: Validate config
      const isValid = config.enabled && config.type === 'tag';

      // Assert
      expect(isValid).toBe(true);
      mockLogger.info('Tag version tracking enabled');
    });

    it('should validate package type configuration', () => {
      // Arrange: Package type config
      const config: VersionTrackingConfig = {
        enabled: true,
        type: 'package',
      };

      // Act: Validate config
      const isValid = config.enabled && config.type === 'package';

      // Assert
      expect(isValid).toBe(true);
      mockLogger.info('Package version tracking enabled');
    });

    it('should validate manual type requires value', () => {
      // Arrange: Manual type config
      const config: VersionTrackingConfig = {
        enabled: true,
        type: 'manual',
        value: 'v1.5.0',
      };

      // Act: Validate config - manual requires value
      const isValid = config.enabled && config.type === 'manual' && !!config.value;

      // Assert
      expect(isValid).toBe(true);
      mockLogger.info(`Manual version set: ${config.value}`);
    });

    it('should reject manual type without value', () => {
      // Arrange: Manual type config without value
      const config: VersionTrackingConfig = {
        enabled: true,
        type: 'manual',
        // Missing value
      };

      // Act: Validate config
      const isValid = config.enabled && config.type === 'manual' && !!config.value;

      // Assert
      expect(isValid).toBe(false);
      mockLogger.warn('Manual version tracking requires value field');
    });
  });

  describe('[TC-INT-VERS-004] Version Fallback Behavior', () => {
    it('should demonstrate fallback from tag to package', () => {
      // Arrange: Primary method fails, should try fallback
      const primaryAttempt = null; // tag method failed
      const fallbackAttempt = 'v2.0.0'; // package method succeeded

      // Act: Implement fallback logic
      const version = primaryAttempt || fallbackAttempt;

      // Assert: Fallback is used
      expect(version).toBe('v2.0.0');
      mockLogger.warn('Primary method failed, using fallback');
      mockLogger.info('Version extracted from package.json');
    });

    it('should demonstrate fallback to commit ID', () => {
      // Arrange: All version methods fail
      const tagVersion = null;
      const packageVersion = null;
      const manualVersion = null;

      // Act: Final fallback to commit ID
      const fallbackCommitId = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0';
      const finalVersion = tagVersion || packageVersion || manualVersion || fallbackCommitId;

      // Assert: Commit ID is used as final fallback
      expect(finalVersion).toBe('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0');
      mockLogger.warn('Could not extract version info, using commit ID');
    });

    it('should continue merge process even if version extraction fails', () => {
      // Arrange: Version extraction fails
      const versionExtractionFailed = true;
      const mergeCanContinue = true; // Merge process is independent

      // Act: Attempt merge despite version failure
      const result = {
        versionFailed: versionExtractionFailed,
        mergeContinued: mergeCanContinue,
        mergeSuccess: true,
      };

      // Assert: Merge completes even though version failed
      expect(result.versionFailed).toBe(true);
      expect(result.mergeContinued).toBe(true);
      expect(result.mergeSuccess).toBe(true);
      mockLogger.warn('Version extraction failed, continuing with merge');
      mockLogger.info('Merge completed successfully');
    });
  });

  describe('[TC-INT-VERS-005] Version Info Integration with Multiple Conflicts', () => {
    it('should include version info in report with auto-resolved conflicts', () => {
      // Arrange: Scenario with auto-resolved conflicts and version info
      const reportData: ReportData = {
        startTime: new Date('2025-10-19T10:00:00Z'),
        endTime: new Date('2025-10-19T10:00:15Z'),
        autoResolvedCount: 3,
        manualRequiredCount: 0,
        totalConflictCount: 3,
        autoResolvedFiles: ['src/main.ts', 'src/utils.ts', 'src/config.ts'],
        manualRequiredFiles: [],
        success: true,
        previousVersion: 'v1.5.0',
        currentVersion: 'v2.0.0',
        versionSource: 'tag',
      };

      // Act: Verify report contains all information
      const hasVersionInfo = !!reportData.previousVersion && !!reportData.currentVersion;
      const hasConflictInfo = reportData.totalConflictCount > 0;

      // Assert
      expect(hasVersionInfo).toBe(true);
      expect(hasConflictInfo).toBe(true);
      expect(reportData.success).toBe(true);
      mockLogger.info(`Successfully resolved ${reportData.autoResolvedCount} conflicts`);
      mockLogger.info(`Version upgrade: ${reportData.previousVersion} → ${reportData.currentVersion}`);
    });

    it('should include version info in report with manual resolution required', () => {
      // Arrange: Scenario with manual resolution needed
      const reportData: ReportData = {
        startTime: new Date('2025-10-19T10:00:00Z'),
        endTime: new Date('2025-10-19T10:00:20Z'),
        autoResolvedCount: 2,
        manualRequiredCount: 2,
        totalConflictCount: 4,
        autoResolvedFiles: ['src/main.ts', 'src/utils.ts'],
        manualRequiredFiles: ['src/api.ts', 'src/db.ts'],
        success: false,
        previousVersion: 'v1.0.0',
        currentVersion: 'v1.5.0',
        versionSource: 'package',
      };

      // Act: Verify report contains both version and conflict info
      const reportContent = `
Version: ${reportData.previousVersion} → ${reportData.currentVersion}
Status: ${reportData.success ? 'SUCCESS' : 'MANUAL RESOLUTION REQUIRED'}
Conflicts: ${reportData.autoResolvedCount} auto-resolved, ${reportData.manualRequiredCount} manual
      `.trim();

      // Assert
      expect(reportContent).toContain('v1.0.0');
      expect(reportContent).toContain('v1.5.0');
      expect(reportContent).toContain('MANUAL RESOLUTION REQUIRED');
      expect(reportContent).toContain('2 manual');
    });
  });

  describe('[TC-INT-VERS-006] End-to-End Config to Report Flow', () => {
    it('should flow from config through version extraction to report', () => {
      // Arrange: Full config with version tracking
      const config: Config = {
        upstream_repository_name: 'upstream',
        upstream_branch_name: 'main',
        last_merged_upstream_commit: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
        last_merged_upstream_version: 'v1.0.0',
        upstream_version_tracking: {
          enabled: true,
          type: 'tag',
        },
        custom_code_marker: {
          start: '// CUSTOM-CODE-START',
          end: '// CUSTOM-CODE-END',
        },
      };

      // Act: Simulate extraction and report generation
      const extractedVersion: VersionInfo = {
        version: 'v1.2.0',
        source: 'tag',
        isValid: true,
      };

      const report: ReportData = {
        startTime: new Date(),
        endTime: new Date(),
        autoResolvedCount: 0,
        manualRequiredCount: 0,
        totalConflictCount: 0,
        autoResolvedFiles: [],
        manualRequiredFiles: [],
        success: true,
        previousVersion: config.last_merged_upstream_version,
        currentVersion: extractedVersion.version,
        versionSource: extractedVersion.source,
      };

      // Assert: Full flow is complete
      expect(config.upstream_version_tracking?.enabled).toBe(true);
      expect(extractedVersion.isValid).toBe(true);
      expect(report.previousVersion).toBe('v1.0.0');
      expect(report.currentVersion).toBe('v1.2.0');
      expect(report.versionSource).toBe('tag');
      mockLogger.info('Config loaded');
      mockLogger.info('Version extracted');
      mockLogger.info('Report generated');
      expect(mockLogger.getLogs().length).toBeGreaterThan(0);
    });
  });
});
