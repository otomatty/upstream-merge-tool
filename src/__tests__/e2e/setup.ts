import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const exec = promisify(require('child_process').exec);

/**
 * Test repository configuration
 */
export interface TestRepoConfig {
  name: string;
  hasUpstream?: boolean;
  upstreamChanges?: Record<string, string>;
  localChanges?: Record<string, string>;
  hasConflict?: boolean;
  customMarkerStart?: string;
  customMarkerEnd?: string;
}

/**
 * Tool execution result
 */
export interface ToolResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Helper class for E2E testing
 */
export class TestRepoHelper {
  private static testRepos: Set<string> = new Set();

  /**
   * Create a temporary test repository
   * @param config Test repository configuration
   * @returns Repository path
   */
  static async createTestRepo(config: TestRepoConfig): Promise<string> {
    const baseDir = path.join(Bun.env.HOME || '/tmp', '.e2e-test-repos');
    const repoPath = path.join(baseDir, config.name, Date.now().toString());

    // Create directory structure
    fs.mkdirSync(repoPath, { recursive: true });
    this.testRepos.add(repoPath);

    // Initialize local git repository
    await this.runGitCommand('init', repoPath);
    await this.runGitCommand('config user.email "test@example.com"', repoPath);
    await this.runGitCommand('config user.name "Test User"', repoPath);

    // Create and initialize upstream repository if needed
    if (config.hasUpstream) {
      const upstreamPath = path.join(repoPath, '..', 'upstream');
      fs.mkdirSync(upstreamPath, { recursive: true });
      this.testRepos.add(upstreamPath);

      await this.runGitCommand('init --bare', upstreamPath);

      // Create upstream content in a temporary clone
      const tempUpstream = path.join(repoPath, '.temp-upstream');
      fs.mkdirSync(tempUpstream, { recursive: true });
      await this.runGitCommand('clone file://' + upstreamPath + ' .', tempUpstream);
      await this.runGitCommand('config user.email "upstream@example.com"', tempUpstream);
      await this.runGitCommand('config user.name "Upstream"', tempUpstream);

      // Create initial upstream files
      const upstreamChanges = config.upstreamChanges || { 'README.md': '# Upstream' };
      for (const [filePath, content] of Object.entries(upstreamChanges)) {
        const fullPath = path.join(tempUpstream, filePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
      }

      await this.runGitCommand('add .', tempUpstream);
      await this.runGitCommand('commit -m "Upstream initial commit"', tempUpstream);
      await this.runGitCommand('push -u origin main', tempUpstream);

      // Get the commit hash before cleaning up
      const commitHash = (await this.runGitCommand('rev-parse HEAD', tempUpstream))
        .trim();

      // Clean up temporary upstream repo
      fs.rmSync(tempUpstream, { recursive: true, force: true });
      this.testRepos.delete(tempUpstream);

      // Add remote to local repository and clone from upstream
      await this.runGitCommand(`remote add upstream file://${upstreamPath}`, repoPath);

      // Create a shared file to avoid unrelated histories
      const sharedFile = path.join(repoPath, 'shared.txt');
      fs.writeFileSync(sharedFile, 'shared content');
      await this.runGitCommand('add shared.txt', repoPath);
      await this.runGitCommand('commit -m "Initial commit"', repoPath);

      // Fetch from upstream
      await this.runGitCommand('fetch upstream', repoPath);

      // Merge upstream/main with allow-unrelated-histories if needed
      try {
        await this.runGitCommand('merge upstream/main --allow-unrelated-histories', repoPath);
      } catch (err) {
        // Merge might have conflicts, which is okay for some tests
      }

      // Create config.json with correct commit hash
      const markerStart = config.customMarkerStart || '// CUSTOM-CODE-START';
      const markerEnd = config.customMarkerEnd || '// CUSTOM-CODE-END';

      const configContent = {
        upstream_repository_name: 'upstream',
        upstream_branch_name: 'main',
        last_merged_upstream_commit: commitHash,
        custom_code_marker: {
          start: markerStart,
          end: markerEnd,
        },
      };

      const configPath = path.join(repoPath, 'config.json');
      fs.writeFileSync(configPath, JSON.stringify(configContent, null, 2));
      await this.runGitCommand('add config.json', repoPath);
      await this.runGitCommand('commit -m "Add config"', repoPath);
    }

    // Create local files with changes
    if (config.localChanges) {
      for (const [filePath, content] of Object.entries(config.localChanges)) {
        const fullPath = path.join(repoPath, filePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
      }
    }

    // For non-upstream repos, create basic config.json
    if (!config.hasUpstream) {
      const markerStart = config.customMarkerStart || '// CUSTOM-CODE-START';
      const markerEnd = config.customMarkerEnd || '// CUSTOM-CODE-END';

      const configContent = {
        upstream_repository_name: 'upstream',
        upstream_branch_name: 'main',
        last_merged_upstream_commit: '0000000000000000000000000000000000000000',
        custom_code_marker: {
          start: markerStart,
          end: markerEnd,
        },
      };

      const configPath = path.join(repoPath, 'config.json');
      fs.writeFileSync(configPath, JSON.stringify(configContent, null, 2));
    }

    return repoPath;
  }

  /**
   * Run merge tool
   * @param repoPath Repository path
   * @param configPath Configuration file path
   * @returns Tool execution result
   */
  static async runMergeTool(repoPath: string, configPath: string): Promise<ToolResult> {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';

      // Get the path to src/main.ts relative to the test repo
      const projectRoot = process.cwd();
      const srcMainPath = path.relative(repoPath, path.join(projectRoot, 'src/main.ts'));

      const child = spawn('bun', ['run', srcMainPath], {
        cwd: repoPath,
        env: {
          ...process.env,
          NODE_ENV: 'test',
        },
      });

      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code: number) => {
        resolve({
          exitCode: code || 0,
          stdout,
          stderr,
        });
      });

      child.on('error', (err: Error) => {
        resolve({
          exitCode: 1,
          stdout,
          stderr: err.message,
        });
      });
    });
  }

  /**
   * Get list of staged files
   * @param repoPath Repository path
   * @returns Array of staged file paths
   */
  static async getStagedFiles(repoPath: string): Promise<string[]> {
    try {
      const { stdout } = await exec('git diff --cached --name-only', { cwd: repoPath });
      return stdout
        .trim()
        .split('\n')
        .filter((line: string) => line.length > 0);
    } catch (err) {
      return [];
    }
  }

  /**
   * Get list of unstaged files (conflicted or modified)
   * @param repoPath Repository path
   * @returns Array of unstaged file paths
   */
  static async getUnstagedFiles(repoPath: string): Promise<string[]> {
    try {
      const { stdout } = await exec('git diff --name-only', { cwd: repoPath });
      return stdout
        .trim()
        .split('\n')
        .filter((line: string) => line.length > 0);
    } catch (err) {
      return [];
    }
  }

  /**
   * Get git status
   * @param repoPath Repository path
   * @returns Git status output
   */
  static async getGitStatus(repoPath: string): Promise<string> {
    try {
      const { stdout } = await exec('git status --porcelain', { cwd: repoPath });
      return stdout;
    } catch (err) {
      return '';
    }
  }

  /**
   * Get file content
   * @param repoPath Repository path
   * @param filePath File path relative to repo root
   * @returns File content
   */
  static getFileContent(repoPath: string, filePath: string): string {
    const fullPath = path.join(repoPath, filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }
    return fs.readFileSync(fullPath, 'utf-8');
  }

  /**
   * Clean up test repository
   * @param repoPath Repository path
   */
  static async cleanupTestRepo(repoPath: string): Promise<void> {
    try {
      // Find and delete all related directories (upstream, temp dirs, etc)
      const baseDir = path.join(repoPath, '..');
      if (fs.existsSync(baseDir)) {
        fs.rmSync(baseDir, { recursive: true, force: true });
      }

      this.testRepos.delete(repoPath);
    } catch (err) {
      console.warn(`Failed to cleanup ${repoPath}:`, err);
    }
  }

  /**
   * Clean up all test repositories
   */
  static async cleanupAll(): Promise<void> {
    for (const repoPath of this.testRepos) {
      await this.cleanupTestRepo(repoPath);
    }
    this.testRepos.clear();
  }

  /**
   * Run git command
   * @param command Git command (without 'git' prefix)
   * @param cwd Working directory
   * @returns Command output
   */
  private static async runGitCommand(command: string, cwd: string): Promise<string> {
    const { stdout, stderr } = await exec(`git ${command}`, { cwd });
    // Ignore stderr for push operations (contains "To" and branch info)
    // Only throw if it's a real error
    if (stderr && !stderr.includes('warning') && !stderr.includes('To ') && !stderr.includes('->')) {
      throw new Error(`Git error: ${stderr}`);
    }
    return stdout;
  }
}

/**
 * Setup and teardown for E2E tests
 */
export function setupE2ETests(): void {
  // This function can be called in test hooks if needed
}

/**
 * Cleanup function to be called after all E2E tests
 */
export async function cleanupE2ETests(): Promise<void> {
  await TestRepoHelper.cleanupAll();
}
