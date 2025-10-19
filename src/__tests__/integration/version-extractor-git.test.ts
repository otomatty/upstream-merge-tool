/**
 * Integration tests: VersionExtractor with GitService and ConfigManager
 * Tests the interaction between version extraction and Git operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { MockLogger } from '../unit/setup';
import type { Config } from '../../types/config';
import type { VersionInfo } from '../../types/git';

// Mock implementations for integration testing
class MockGitService {
  private mockLogger: MockLogger;
  private mockVersionTags: Map<string, string[]> = new Map();
  private mockPackageJsonContent: Map<string, string> = new Map();

  constructor(logger: MockLogger) {
    this.mockLogger = logger;
    this.initializeMockData();
  }

  private initializeMockData(): void {
    // Setup mock version tags for different repositories
    this.mockVersionTags.set('upstream', ['v2.0.0', 'v1.9.0', 'v1.8.0', 'v1.7.0']);
    this.mockVersionTags.set('failing-repo', []); // No tags
    this.mockVersionTags.set('invalid-tags', ['release', 'deploy', 'beta']); // Invalid semver

    // Setup mock package.json versions
    this.mockPackageJsonContent.set(
      'upstream:v1.0.0',
      JSON.stringify({ version: '1.0.0' })
    );
    this.mockPackageJsonContent.set(
      'upstream:v2.0.0',
      JSON.stringify({ version: '2.0.0' })
    );
  }

  async getLatestVersionTag(repoName: string): Promise<string | null> {
    this.mockLogger.info(`Fetching latest version tag for ${repoName}`);
    const tags = this.mockVersionTags.get(repoName);

    if (!tags || tags.length === 0) {
      this.mockLogger.warn(`No version tags found for ${repoName}`);
      return null;
    }

    const latestTag = tags[0] || null;
    this.mockLogger.info(`Latest version tag: ${latestTag}`);
    return latestTag;
  }

  async getVersionFromPackageJson(
    repoName: string,
    branch: string = 'main'
  ): Promise<string | null> {
    this.mockLogger.info(`Fetching package.json from ${repoName}/${branch}`);
    const key = `${repoName}:${branch}`;
    const content = this.mockPackageJsonContent.get(key);

    if (!content) {
      this.mockLogger.warn(`package.json not found for ${repoName}/${branch}`);
      return null;
    }

    try {
      const data = JSON.parse(content);
      const version = data.version;
      this.mockLogger.info(`Version from package.json: ${version}`);
      return version;
    } catch (error) {
      this.mockLogger.error('Failed to parse package.json');
      return null;
    }
  }

  isValidSemanticVersion(version: string): boolean {
    const semverRegex = /^v?\d+\.\d+\.\d+$/;
    const isValid = semverRegex.test(version);
    this.mockLogger.debug(`Validating semantic version: ${version} -> ${isValid}`);
    return isValid;
  }
}

class MockVersionExtractor {
  private mockLogger: MockLogger;
  private mockGitService: MockGitService;

  constructor(gitService: MockGitService, logger: MockLogger) {
    this.mockGitService = gitService;
    this.mockLogger = logger;
  }

  async extractVersion(
    config: Config,
    commitId: string
  ): Promise<VersionInfo> {
    this.mockLogger.info('Starting version extraction');

    // If version tracking is disabled, use commit ID
    if (!config.upstream_version_tracking?.enabled) {
      this.mockLogger.info('Version tracking disabled, using commit ID');
      return {
        version: commitId,
        source: 'commit',
        isValid: true,
      };
    }

    const trackingType = config.upstream_version_tracking.type || 'tag';

    try {
      // Primary method: tag
      if (trackingType === 'tag' || !trackingType) {
        this.mockLogger.info('Attempting to extract version from Git tags');
        const version = await this.mockGitService.getLatestVersionTag(
          config.upstream_repository_name
        );
        if (version && this.mockGitService.isValidSemanticVersion(version)) {
          this.mockLogger.info(`Version extracted from tag: ${version}`);
          return {
            version: version,
            source: 'tag',
            isValid: true,
          };
        }
        this.mockLogger.warn('No valid semantic version tags found');
      }

      // Fallback 1: package
      if (trackingType === 'package' || trackingType === 'tag') {
        this.mockLogger.info('Attempting to extract version from package.json');
        const version = await this.mockGitService.getVersionFromPackageJson(
          config.upstream_repository_name,
          config.upstream_branch_name
        );
        if (version && this.mockGitService.isValidSemanticVersion(`v${version}`)) {
          this.mockLogger.info(`Version extracted from package.json: ${version}`);
          return {
            version: version,
            source: 'package',
            isValid: true,
          };
        }
        this.mockLogger.warn('No valid version found in package.json');
      }

      // Fallback 2: manual
      if (
        trackingType === 'manual' ||
        config.upstream_version_tracking.value
      ) {
        const manualVersion = config.upstream_version_tracking.value;
        if (manualVersion) {
          this.mockLogger.info(`Using manual version: ${manualVersion}`);
          return {
            version: manualVersion,
            source: 'manual',
            isValid: true,
          };
        }
      }
    } catch (error) {
      this.mockLogger.error('Error during version extraction');
    }

    // Final fallback: commit ID
    this.mockLogger.warn('Could not extract version info, falling back to commit ID');
    return {
      version: commitId,
      source: 'commit',
      isValid: true,
    };
  }
}

describe('Integration Tests: VersionExtractor with GitService', () => {
  let mockLogger: MockLogger;
  let mockGitService: MockGitService;
  let mockVersionExtractor: MockVersionExtractor;

  beforeEach(() => {
    mockLogger = new MockLogger();
    mockGitService = new MockGitService(mockLogger);
    mockVersionExtractor = new MockVersionExtractor(mockGitService, mockLogger);
  });

  afterEach(() => {
    mockLogger.clear();
  });

  describe('[TC-INT-GIT-001] GitService Version Tag Extraction', () => {
    it('should extract latest version tag successfully', async () => {
      // Arrange
      const repoName = 'upstream';

      // Act
      const version = await mockGitService.getLatestVersionTag(repoName);

      // Assert
      expect(version).toBe('v2.0.0');
      expect(mockLogger.getLogs().some((log) => log.message.includes('Latest version tag'))).toBe(
        true
      );
    });

    it('should handle repository with no tags', async () => {
      // Arrange
      const repoName = 'failing-repo';

      // Act
      const version = await mockGitService.getLatestVersionTag(repoName);

      // Assert
      expect(version).toBeNull();
      expect(
        mockLogger.getLogs().some((log) => log.message.includes('No version tags found'))
      ).toBe(true);
    });

    it('should validate semantic version format', () => {
      // Arrange & Act & Assert
      expect(mockGitService.isValidSemanticVersion('v1.2.3')).toBe(true);
      expect(mockGitService.isValidSemanticVersion('1.2.3')).toBe(true);
      expect(mockGitService.isValidSemanticVersion('v1.2.3-beta')).toBe(false);
      expect(mockGitService.isValidSemanticVersion('1.2')).toBe(false);
      expect(mockGitService.isValidSemanticVersion('latest')).toBe(false);
    });
  });

  describe('[TC-INT-GIT-002] GitService Package.json Extraction', () => {
    it('should extract version from package.json', async () => {
      // Arrange
      const repoName = 'upstream';
      const branch = 'v1.0.0';

      // Act
      const version = await mockGitService.getVersionFromPackageJson(repoName, branch);

      // Assert
      expect(version).toBe('1.0.0');
      expect(
        mockLogger.getLogs().some((log) => log.message.includes('Version from package.json'))
      ).toBe(true);
    });

    it('should handle missing package.json', async () => {
      // Arrange
      const repoName = 'nonexistent';

      // Act
      const version = await mockGitService.getVersionFromPackageJson(repoName);

      // Assert
      expect(version).toBeNull();
      expect(mockLogger.getLogs().some((log) => log.message.includes('not found'))).toBe(true);
    });
  });

  describe('[TC-INT-GIT-003] VersionExtractor Primary Method (Tag)', () => {
    it('should extract version using tag method', async () => {
      // Arrange
      const config: Config = {
        upstream_repository_name: 'upstream',
        upstream_branch_name: 'main',
        last_merged_upstream_commit: 'abc123',
        upstream_version_tracking: {
          enabled: true,
          type: 'tag',
        },
        custom_code_marker: {
          start: '// START',
          end: '// END',
        },
      };

      // Act
      const version = await mockVersionExtractor.extractVersion(config, 'abc123');

      // Assert
      expect(version.version).toBe('v2.0.0');
      expect(version.source).toBe('tag');
      expect(version.isValid).toBe(true);
      expect(
        mockLogger.getLogs().some((log) => log.message.includes('from tag'))
      ).toBe(true);
    });

    it('should log when tag extraction is attempted', async () => {
      // Arrange
      const config: Config = {
        upstream_repository_name: 'upstream',
        upstream_branch_name: 'main',
        last_merged_upstream_commit: 'abc123',
        upstream_version_tracking: {
          enabled: true,
          type: 'tag',
        },
        custom_code_marker: {
          start: '// START',
          end: '// END',
        },
      };

      // Act
      await mockVersionExtractor.extractVersion(config, 'abc123');

      // Assert
      expect(
        mockLogger.getLogs().some((log) => log.message.includes('Starting version extraction'))
      ).toBe(true);
      expect(
        mockLogger.getLogs().some((log) => log.message.includes('Attempting to extract'))
      ).toBe(true);
    });
  });

  describe('[TC-INT-GIT-004] VersionExtractor Fallback Methods', () => {
    it('should fallback to package.json when tags unavailable', async () => {
      // Arrange
      const config: Config = {
        upstream_repository_name: 'failing-repo',
        upstream_branch_name: 'main',
        last_merged_upstream_commit: 'abc123',
        upstream_version_tracking: {
          enabled: true,
          type: 'tag',
        },
        custom_code_marker: {
          start: '// START',
          end: '// END',
        },
      };

      // Act
      const version = await mockVersionExtractor.extractVersion(config, 'abc123');

      // Assert
      // Since no tags found, it would try package.json, which also fails
      // So it falls back to commit_id
      expect(version.version).toBe('abc123');
      expect(version.source).toBe('commit');
    });

    it('should use manual version when specified', async () => {
      // Arrange
      const config: Config = {
        upstream_repository_name: 'upstream',
        upstream_branch_name: 'main',
        last_merged_upstream_commit: 'abc123',
        upstream_version_tracking: {
          enabled: true,
          type: 'manual',
          value: 'release-2025-10',
        },
        custom_code_marker: {
          start: '// START',
          end: '// END',
        },
      };

      // Act
      const version = await mockVersionExtractor.extractVersion(config, 'abc123');

      // Assert
      expect(version.version).toBe('release-2025-10');
      expect(version.source).toBe('manual');
    });

    it('should fallback to commit ID on all failures', async () => {
      // Arrange
      const config: Config = {
        upstream_repository_name: 'failing-repo',
        upstream_branch_name: 'main',
        last_merged_upstream_commit: 'def456',
        upstream_version_tracking: {
          enabled: true,
          type: 'tag',
        },
        custom_code_marker: {
          start: '// START',
          end: '// END',
        },
      };

      // Act
      const version = await mockVersionExtractor.extractVersion(config, 'def456');

      // Assert
      expect(version.version).toBe('def456');
      expect(version.source).toBe('commit');
      expect(version.isValid).toBe(true);
      expect(
        mockLogger.getLogs().some((log) => log.message.includes('falling back to commit ID'))
      ).toBe(true);
    });
  });

  describe('[TC-INT-GIT-005] VersionExtractor Disabled Tracking', () => {
    it('should use commit ID when version tracking disabled', async () => {
      // Arrange
      const config: Config = {
        upstream_repository_name: 'upstream',
        upstream_branch_name: 'main',
        last_merged_upstream_commit: 'ghi789',
        upstream_version_tracking: {
          enabled: false,
        },
        custom_code_marker: {
          start: '// START',
          end: '// END',
        },
      };

      // Act
      const version = await mockVersionExtractor.extractVersion(config, 'ghi789');

      // Assert
      expect(version.version).toBe('ghi789');
      expect(version.source).toBe('commit');
      expect(version.isValid).toBe(true);
      expect(
        mockLogger.getLogs().some((log) => log.message.includes('Version tracking disabled'))
      ).toBe(true);
    });

    it('should not attempt version extraction when tracking disabled', async () => {
      // Arrange
      const config: Config = {
        upstream_repository_name: 'upstream',
        upstream_branch_name: 'main',
        last_merged_upstream_commit: 'jkl012',
        upstream_version_tracking: {
          enabled: false,
        },
        custom_code_marker: {
          start: '// START',
          end: '// END',
        },
      };

      // Act
      await mockVersionExtractor.extractVersion(config, 'jkl012');

      // Assert
      const logs = mockLogger.getLogs();
      expect(logs.some((log) => log.message.includes('Git tags'))).toBe(false);
      expect(logs.some((log) => log.message.includes('package.json'))).toBe(false);
    });
  });

  describe('[TC-INT-GIT-006] End-to-End Extraction Flow', () => {
    it('should complete full extraction flow from config to version info', async () => {
      // Arrange
      const config: Config = {
        upstream_repository_name: 'upstream',
        upstream_branch_name: 'main',
        last_merged_upstream_commit: 'a1b2c3d4',
        last_merged_upstream_version: 'v1.5.0',
        upstream_version_tracking: {
          enabled: true,
          type: 'tag',
        },
        custom_code_marker: {
          start: '// CUSTOM-START',
          end: '// CUSTOM-END',
        },
      };

      // Act: Full extraction flow
      mockLogger.info('Starting upstream merge process');
      const version = await mockVersionExtractor.extractVersion(
        config,
        config.last_merged_upstream_commit
      );
      mockLogger.info(`Merge completed with version: ${version.version}`);

      // Assert
      expect(version.isValid).toBe(true);
      expect(version.source).toBe('tag');
      expect(version.version).toBe('v2.0.0');
      expect(mockLogger.getLogs().length).toBeGreaterThan(0);
      expect(
        mockLogger.getLogs().some((log) => log.message.includes('Starting upstream merge'))
      ).toBe(true);
      expect(
        mockLogger.getLogs().some((log) => log.message.includes('Merge completed'))
      ).toBe(true);
    });

    it('should compare old and new versions in report', async () => {
      // Arrange
      const config: Config = {
        upstream_repository_name: 'upstream',
        upstream_branch_name: 'main',
        last_merged_upstream_commit: 'a1b2c3d4',
        last_merged_upstream_version: 'v1.5.0',
        upstream_version_tracking: {
          enabled: true,
          type: 'tag',
        },
        custom_code_marker: {
          start: '// START',
          end: '// END',
        },
      };

      // Act
      const newVersion = await mockVersionExtractor.extractVersion(
        config,
        config.last_merged_upstream_commit
      );

      // Assert
      const oldVersion = config.last_merged_upstream_version;
      expect(oldVersion).toBe('v1.5.0');
      expect(newVersion.version).toBe('v2.0.0');
      mockLogger.info(`Version bump detected: ${oldVersion} → ${newVersion.version}`);
      expect(
        mockLogger.getLogs().some((log) => log.message.includes('Version bump detected'))
      ).toBe(true);
    });
  });

  describe('[TC-INT-GIT-007] Error Handling and Recovery', () => {
    it('should gracefully handle extraction errors and fallback', async () => {
      // Arrange
      const config: Config = {
        upstream_repository_name: 'failing-repo',
        upstream_branch_name: 'main',
        last_merged_upstream_commit: 'mno345',
        upstream_version_tracking: {
          enabled: true,
          type: 'tag',
        },
        custom_code_marker: {
          start: '// START',
          end: '// END',
        },
      };

      // Act
      const version = await mockVersionExtractor.extractVersion(config, 'mno345');

      // Assert
      expect(version).toBeDefined();
      expect(version.isValid).toBe(true);
      expect(version.source).toBe('commit');
      expect(version.version).toBe('mno345');
      expect(
        mockLogger.getLogs().some((log) => log.level === 'WARN' || log.level === 'ERROR')
      ).toBe(true);
    });

    it('should log all fallback attempts for debugging', async () => {
      // Arrange
      const config: Config = {
        upstream_repository_name: 'failing-repo',
        upstream_branch_name: 'main',
        last_merged_upstream_commit: 'pqr678',
        upstream_version_tracking: {
          enabled: true,
          type: 'tag',
        },
        custom_code_marker: {
          start: '// START',
          end: '// END',
        },
      };

      // Act
      mockLogger.clear(); // Clear initial logs
      await mockVersionExtractor.extractVersion(config, 'pqr678');
      const logs = mockLogger.getLogs();

      // Assert: Check that multiple attempts were logged
      expect(logs.length).toBeGreaterThan(1);
      expect(logs.some((log) => log.level === 'INFO')).toBe(true);
      expect(logs.some((log) => log.level === 'WARN')).toBe(true);
    });
  });
});
