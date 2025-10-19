import type { CommandResult, GitStatus, MergeResult } from '../types/git';
import type { Logger } from '../logger/Logger';
import { executeCommand } from '../utils/runtime';

/**
 * GitService class for executing git operations
 * Supports both Bun and Node.js runtimes
 */
export class GitService {
  constructor(private logger: Logger) {}

  /**
   * Fetch from a remote repository
   */
  async fetch(remoteName: string): Promise<void> {
    try {
      this.logger.info(`Fetching from remote: ${remoteName}`);
      const result = await this.exec(`git fetch ${remoteName}`);

      if (result.exitCode !== 0) {
        throw new Error(`Git fetch failed: ${result.stderr}`);
      }

      this.logger.info('Git fetch completed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Fetch operation failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Merge a branch from a remote
   */
  async merge(remoteName: string, branchName: string): Promise<MergeResult> {
    try {
      const fullBranchName = `${remoteName}/${branchName}`;
      this.logger.info(`Starting merge with: ${fullBranchName}`);

      // Use --allow-unrelated-histories to handle cases where upstream and local have different histories
      const result = await this.exec(
        `git merge ${fullBranchName} --allow-unrelated-histories`
      );

      // Check if merge succeeded (exit code 0) or failed with conflicts (exit code 1)
      if (result.exitCode === 0) {
        this.logger.info('Merge completed successfully without conflicts');
        return {
          success: true,
          conflictFiles: [],
        };
      } else if (result.exitCode === 1) {
        // Merge has conflicts
        const conflictFiles = await this.getConflictFiles();
        this.logger.info(`Merge completed with ${conflictFiles.length} conflict files`, {
          conflictFiles,
        });

        return {
          success: false,
          conflictFiles,
        };
      } else {
        // Unexpected error
        throw new Error(`Git merge failed with exit code ${result.exitCode}: ${result.stderr}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Merge operation failed: ${errorMessage}`);

      return {
        success: false,
        conflictFiles: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Get git repository status
   */
  async getStatus(): Promise<GitStatus> {
    try {
      this.logger.debug('Checking git repository status');

      // Check if we're in a git repository
      const statusResult = await this.exec('git rev-parse --git-dir');
      const isRepository = statusResult.exitCode === 0;

      if (!isRepository) {
        this.logger.warn('Not in a git repository');
        return {
          isRepository: false,
          isDirty: false,
          branch: '',
        };
      }

      // Get current branch
      const branchResult = await this.exec('git rev-parse --abbrev-ref HEAD');
      const branch = branchResult.stdout.trim();

      // Check if working directory is dirty
      const dirtyResult = await this.exec('git status --porcelain');
      const isDirty = dirtyResult.stdout.trim().length > 0;

      this.logger.debug('Git status retrieved', { isRepository, isDirty, branch });

      return {
        isRepository: true,
        isDirty,
        branch,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get git status: ${errorMessage}`);

      return {
        isRepository: false,
        isDirty: false,
        branch: '',
      };
    }
  }

  /**
   * Get conflicted files after a failed merge
   */
  async getConflictFiles(): Promise<string[]> {
    try {
      this.logger.debug('Retrieving conflicted files');

      // Use git diff to find conflicted files
      const result = await this.exec('git diff --name-only --diff-filter=U');

      if (result.exitCode !== 0) {
        this.logger.warn(`Failed to get conflict files: ${result.stderr}`);
        return [];
      }

      const files = result.stdout
        .trim()
        .split('\n')
        .filter((line) => line.length > 0);

      this.logger.debug(`Found ${files.length} conflicted files`, { files });
      return files;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to retrieve conflict files: ${errorMessage}`);
      return [];
    }
  }

  /**
   * Add a file to staging area
   */
  async add(filePath: string): Promise<void> {
    try {
      this.logger.debug(`Adding file to staging: ${filePath}`);

      const result = await this.exec(`git add "${filePath}"`);

      if (result.exitCode !== 0) {
        throw new Error(`Failed to add file: ${result.stderr}`);
      }

      this.logger.debug('File added successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to add file: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get the commit hash for a reference
   */
  async getCommitHash(ref: string): Promise<string> {
    try {
      this.logger.debug(`Getting commit hash for ref: ${ref}`);

      const result = await this.exec(`git rev-parse ${ref}`);

      if (result.exitCode !== 0) {
        throw new Error(`Failed to get commit hash: ${result.stderr}`);
      }

      const hash = result.stdout.trim();
      this.logger.debug(`Commit hash retrieved: ${hash}`);
      return hash;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get commit hash: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get the latest semantic version tag from a remote branch
   */
  async getLatestVersionTag(remoteName: string, branchName: string): Promise<string | null> {
    try {
      this.logger.debug(`Getting latest version tag for ${remoteName}/${branchName}`);

      // Get the latest semantic version tag (v1.2.3 format or similar)
      const result = await this.exec(
        `git tag -l 'v*' --sort=-version:refname --merged ${remoteName}/${branchName} | head -1`
      );

      if (result.exitCode !== 0) {
        this.logger.warn(`Failed to get version tags: ${result.stderr}`);
        return null;
      }

      const tag = result.stdout.trim();
      if (!tag) {
        this.logger.debug('No version tags found');
        return null;
      }

      // Validate semantic version format (v?X.Y.Z)
      if (this.isValidSemanticVersion(tag)) {
        this.logger.debug(`Latest version tag found: ${tag}`);
        return tag;
      }

      this.logger.warn(`Tag format is not valid semantic version: ${tag}`);
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to get version tag: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Get version from package.json file in a remote branch
   */
  async getVersionFromPackageJson(remoteName: string, branchName: string): Promise<string | null> {
    try {
      this.logger.debug(`Getting version from package.json in ${remoteName}/${branchName}`);

      // Read package.json from remote branch
      const result = await this.exec(`git show ${remoteName}/${branchName}:package.json`);

      if (result.exitCode !== 0) {
        this.logger.debug(`package.json not found or cannot be read: ${result.stderr}`);
        return null;
      }

      // Parse JSON and extract version field
      const packageJson = JSON.parse(result.stdout);
      if (packageJson.version && typeof packageJson.version === 'string') {
        this.logger.debug(`Version from package.json: ${packageJson.version}`);
        return packageJson.version;
      }

      this.logger.debug('No version field found in package.json');
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to get version from package.json: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Validate semantic version format (v?X.Y.Z)
   */
  private isValidSemanticVersion(version: string): boolean {
    // Match format: v1.2.3, 1.2.3, v1.0.0-beta, etc.
    const semverPattern = /^v?\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/;
    return semverPattern.test(version);
  }

  /**
   * Get diff between two commits for a specific file
   */
  async getDiff(fromCommit: string, toCommit: string, filePath: string): Promise<string> {
    try {
      this.logger.debug(`Getting diff for ${filePath} between ${fromCommit} and ${toCommit}`);

      const result = await this.exec(`git diff ${fromCommit}..${toCommit} -- "${filePath}"`);

      if (result.exitCode !== 0 && result.exitCode !== 1) {
        throw new Error(`Failed to get diff: ${result.stderr}`);
      }

      this.logger.debug('Diff retrieved successfully');
      return result.stdout;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get diff: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Execute a shell command
   */
  private async exec(command: string): Promise<CommandResult> {
    try {
      this.logger.debug(`Executing command: ${command}`);

      const result = await executeCommand(command);

      this.logger.debug(`Command completed with exit code: ${result.exitCode}`, {
        command,
        stdout: result.stdout.substring(0, 100),
        stderr: result.stderr.substring(0, 100),
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Command execution failed: ${errorMessage}`);
      throw error;
    }
  }
}
