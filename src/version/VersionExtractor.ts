import type { VersionTrackingConfig } from '../types/config';
import type { VersionInfo } from '../types/git';
import type { Logger } from '../logger/Logger';
import { GitService } from '../git/GitService';

/**
 * VersionExtractor class for extracting and validating version information
 * from upstream repository using multiple methods with fallback strategy
 */
export class VersionExtractor {
  private gitService: GitService;

  constructor(private logger: Logger) {
    this.gitService = new GitService(logger);
  }

  /**
   * Extract version information from upstream repository
   * Tries multiple methods based on configuration with fallback strategy
   */
  async extractVersion(
    remoteName: string,
    branchName: string,
    config?: VersionTrackingConfig
  ): Promise<VersionInfo> {
    // If version tracking is not enabled or no config provided, return invalid
    if (!config || !config.enabled) {
      this.logger.debug('Version tracking is not enabled');
      return {
        version: '',
        source: 'commit',
        isValid: false,
      };
    }

    try {
      let version: string | null = null;
      let source: VersionInfo['source'] = 'commit';

      // Try primary method based on configuration type
      if (config.type === 'tag') {
        version = await this.getVersionFromTag(remoteName, branchName);
        if (version) source = 'tag';
      } else if (config.type === 'package') {
        version = await this.getVersionFromPackageJson(remoteName, branchName);
        if (version) source = 'package';
      } else if (config.type === 'manual' && config.value) {
        version = config.value;
        source = 'manual';
      }

      // Fallback: try other methods if primary method failed
      if (!version) {
        this.logger.warn(`Primary method (${config.type || 'default'}) failed, trying fallbacks`);

        // Try tag as first fallback
        if (config.type !== 'tag') {
          version = await this.getVersionFromTag(remoteName, branchName);
          if (version) {
            source = 'tag';
            this.logger.info('Version extracted from tag (fallback)');
          }
        }

        // Try package.json as second fallback
        if (!version && config.type !== 'package') {
          version = await this.getVersionFromPackageJson(remoteName, branchName);
          if (version) {
            source = 'package';
            this.logger.info('Version extracted from package.json (fallback)');
          }
        }
      }

      if (version) {
        this.logger.info(`Version extracted successfully: ${version} (source: ${source})`);
        return {
          version,
          source,
          isValid: true,
        };
      }

      // All methods failed, fallback to commit ID
      this.logger.warn('Could not extract version info, will use commit ID as fallback');
      return {
        version: '',
        source: 'commit',
        isValid: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error extracting version: ${errorMessage}`);
      return {
        version: '',
        source: 'commit',
        isValid: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get version from Git tags in upstream repository
   * Extracts the latest semantic version tag
   */
  private async getVersionFromTag(remoteName: string, branchName: string): Promise<string | null> {
    try {
      this.logger.debug(`Attempting to extract version from Git tags in ${remoteName}/${branchName}`);

      const version = await this.gitService.getLatestVersionTag(remoteName, branchName);

      if (version) {
        this.logger.debug(`Version tag found: ${version}`);
        return version;
      }

      this.logger.debug('No valid version tags found');
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.debug(`Failed to extract version from tag: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Get version from package.json in upstream repository
   * Reads package.json from the remote branch and extracts the version field
   */
  private async getVersionFromPackageJson(
    remoteName: string,
    branchName: string
  ): Promise<string | null> {
    try {
      this.logger.debug(`Attempting to extract version from package.json in ${remoteName}/${branchName}`);

      const version = await this.gitService.getVersionFromPackageJson(remoteName, branchName);

      if (version) {
        this.logger.debug(`Version from package.json: ${version}`);
        return version;
      }

      this.logger.debug('Version field not found in package.json');
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.debug(`Failed to extract version from package.json: ${errorMessage}`);
      return null;
    }
  }
}
