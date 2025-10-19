import type { Config, ValidationResult } from '../types/config';
import type { Logger } from '../logger/Logger';
import { readFileAsText } from '../utils/runtime';

/**
 * ConfigManager class for loading and validating configuration files
 * Supports both Bun and Node.js runtimes
 */
export class ConfigManager {
  constructor(private logger: Logger) {}

  /**
   * Load configuration from a JSON file
   */
  async loadConfig(configPath: string): Promise<Config> {
    try {
      this.logger.info(`Loading configuration from: ${configPath}`);

      // Read file
      const fileContent = await readFileAsText(configPath);

      // Parse JSON
      const config = this.parseJson(fileContent);
      this.logger.debug('Configuration parsed successfully', { config });

      // Validate configuration
      const validation = this.validateConfig(config);
      if (!validation.isValid) {
        const errorMessage = `Configuration validation failed: ${validation.errors.join(', ')}`;
        this.logger.error(errorMessage);
        throw new Error(errorMessage);
      }

      this.logger.info('Configuration loaded and validated successfully');
      return config as Config;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to load configuration: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Validate configuration object
   */
  validateConfig(config: Partial<Config>): ValidationResult {
    const errors: string[] = [];

    // Check required fields
    if (!config.upstream_repository_name) {
      errors.push('upstream_repository_name is required');
    }

    if (!config.upstream_branch_name) {
      errors.push('upstream_branch_name is required');
    }

    if (!config.last_merged_upstream_commit) {
      errors.push('last_merged_upstream_commit is required');
    } else if (!this.validateCommitHash(config.last_merged_upstream_commit)) {
      errors.push('last_merged_upstream_commit must be a valid 40-character hex string');
    }

    if (!config.custom_code_marker) {
      errors.push('custom_code_marker is required');
    } else {
      if (!config.custom_code_marker.start) {
        errors.push('custom_code_marker.start is required');
      }
      if (!config.custom_code_marker.end) {
        errors.push('custom_code_marker.end is required');
      }
    }

    // Validate version tracking configuration (optional)
    if (config.upstream_version_tracking) {
      const versionErrors = this.validateVersionTracking(config.upstream_version_tracking);
      errors.push(...versionErrors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate version tracking configuration
   */
  private validateVersionTracking(versionTracking: any): string[] {
    const errors: string[] = [];

    if (typeof versionTracking !== 'object' || versionTracking === null) {
      return ['upstream_version_tracking must be an object'];
    }

    if (typeof versionTracking.enabled !== 'boolean') {
      errors.push('upstream_version_tracking.enabled must be a boolean');
    }

    if (versionTracking.type && !['tag', 'package', 'manual'].includes(versionTracking.type)) {
      errors.push("upstream_version_tracking.type must be 'tag', 'package', or 'manual'");
    }

    if (versionTracking.type === 'manual' && !versionTracking.value) {
      errors.push("upstream_version_tracking.value is required when type is 'manual'");
    }

    return errors;
  }

  /**
   * Validate commit hash format (40-character hex string for SHA-1)
   */
  private validateCommitHash(hash: string): boolean {
    const commitHashPattern = /^[a-f0-9]{40}$/i;
    return commitHashPattern.test(hash);
  }

  /**
   * Parse JSON with error handling
   */
  private parseJson(content: string): any {
    try {
      return JSON.parse(content);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown JSON parse error';
      throw new Error(`Invalid JSON format: ${errorMessage}`);
    }
  }
}
