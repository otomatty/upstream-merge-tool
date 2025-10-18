/**
 * Integration test setup and utilities
 * Shared mocks and fixtures for integration testing
 */

import { MockLogger, TempDirManager, readFixture } from '../unit/setup';
import type { Config } from '../../types/config';
import type { MergeResult } from '../../types/git';
import type { ConflictMarker } from '../../types/conflict';

/**
 * Mock ConfigManager for integration tests
 */
export class MockConfigManager {
  private config: Config;

  constructor(config?: Config) {
    this.config = config || {
      upstream_repository_name: 'upstream',
      upstream_branch_name: 'main',
      last_merged_upstream_commit: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
      custom_code_marker: {
        start: '// CUSTOM-CODE-START',
        end: '// CUSTOM-CODE-END',
      },
    };
  }

  async loadConfig(path: string): Promise<Config> {
    return this.config;
  }

  validateConfig(config: any) {
    return { isValid: true, errors: [] };
  }

  setConfig(config: Config) {
    this.config = config;
  }
}

/**
 * Mock GitService for integration tests
 */
export class MockGitService {
  private mergeResult: MergeResult;
  private logger: MockLogger;
  private commandExecuted: string[] = [];

  constructor(logger?: MockLogger, mergeResult?: MergeResult) {
    this.logger = logger || new MockLogger();
    this.mergeResult = mergeResult || {
      success: false,
      conflictFiles: ['src/main.ts'],
    };
  }

  async fetch(remote: string): Promise<void> {
    this.commandExecuted.push(`fetch ${remote}`);
    this.logger.info(`Fetching from ${remote}`);
  }

  async merge(upstreamName: string, branchName: string): Promise<MergeResult> {
    this.commandExecuted.push(`merge ${upstreamName}/${branchName}`);
    this.logger.info(`Merging ${upstreamName}/${branchName}`);
    return this.mergeResult;
  }

  async getConflictFiles(): Promise<string[]> {
    return this.mergeResult.conflictFiles;
  }

  async getRepositoryPath(): Promise<string> {
    return '/tmp/test-repo';
  }

  setMergeResult(result: MergeResult) {
    this.mergeResult = result;
  }

  getExecutedCommands(): string[] {
    return this.commandExecuted;
  }

  clearHistory() {
    this.commandExecuted = [];
  }
}

/**
 * Mock ConflictResolver for integration tests
 */
export class MockConflictResolver {
  private logger: MockLogger;
  private resolveResult: {
    autoResolved: string[];
    manualRequired: string[];
    totalConflicts: number;
  };

  constructor(logger?: MockLogger, resolveResult?: any) {
    this.logger = logger || new MockLogger();
    this.resolveResult = resolveResult || {
      autoResolved: [],
      manualRequired: [],
      totalConflicts: 0,
    };
  }

  async detectConflicts(content: string): Promise<ConflictMarker[]> {
    const conflictMarkerRegex = /<<<<<<< HEAD\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> upstream\/\w+/g;
    const conflicts: ConflictMarker[] = [];
    let match;

    while ((match = conflictMarkerRegex.exec(content)) !== null) {
      conflicts.push({
        startLine: 0,
        markerLine: 0,
        endLine: 0,
        oursStart: 0,
        oursEnd: 0,
        theirsStart: 0,
        theirsEnd: 0,
        ours: match[1] || '',
        theirs: match[2] || '',
      });
    }

    return conflicts;
  }

  async resolveConflicts(files: string[], config: Config, gitService: MockGitService): Promise<void> {
    this.logger.info(`Resolving ${files.length} conflicted files`);
  }

  setResolveResult(result: any) {
    this.resolveResult = result;
  }

  getResolveResult() {
    return this.resolveResult;
  }
}

/**
 * Mock ReportGenerator for integration tests
 */
export class MockReportGenerator {
  private logger: MockLogger;

  constructor(logger?: MockLogger) {
    this.logger = logger || new MockLogger();
  }

  generateCLISummary(result: {
    autoResolved: string[];
    manualRequired: string[];
    totalConflicts: number;
  }): string {
    let summary = '';

    if (result.totalConflicts === 0) {
      summary = 'コンフリクトはありません\n';
    } else {
      summary += `自動解決されたファイル数: ${result.autoResolved.length} 件\n`;
      summary += `手動解決が必要なファイル数: ${result.manualRequired.length} 件\n\n`;
      summary += '自動解決されたファイル:\n';
      result.autoResolved.forEach((file) => {
        summary += `  - ${file}\n`;
      });
      summary += '\n手動解決が必要なファイル:\n';
      result.manualRequired.forEach((file) => {
        summary += `  - ${file}\n`;
      });
    }

    return summary;
  }

  async generateLogFile(
    result: {
      autoResolved: string[];
      manualRequired: string[];
      totalConflicts: number;
    },
    logs: any[],
  ): Promise<string> {
    const now = new Date();
    // Format: YYYYMMDD-HHMMSS
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const timestamp = `${year}${month}${date}-${hours}${minutes}${seconds}`;
    return `merge-report-${timestamp}.log`;
  }
}

/**
 * Helper to create integration test data
 */
export const integrationTestFixtures = {
  validConfig: {
    upstream_repository_name: 'upstream',
    upstream_branch_name: 'main',
    last_merged_upstream_commit: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
    custom_code_marker: {
      start: '// CUSTOM-CODE-START',
      end: '// CUSTOM-CODE-END',
    },
  },

  mergeResultWithConflicts: {
    success: false,
    conflictFiles: ['src/main.ts', 'src/config.ts'],
  },

  mergeResultNoConflicts: {
    success: true,
    conflictFiles: [],
  },

  resolveResultAutoResolved: {
    autoResolved: ['src/config.ts', 'src/utils.ts'],
    manualRequired: ['src/main.ts'],
    totalConflicts: 3,
  },

  resolveResultNoConflicts: {
    autoResolved: [],
    manualRequired: [],
    totalConflicts: 0,
  },
};

export default {
  MockConfigManager,
  MockGitService,
  MockConflictResolver,
  MockReportGenerator,
  integrationTestFixtures,
};
