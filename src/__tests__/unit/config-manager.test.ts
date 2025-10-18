import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ConfigManager } from '../../config/ConfigManager';
import { MockLogger, TempDirManager, testFixtures, describeWithId } from './setup';
import fs from 'fs';
import path from 'path';

describe('ConfigManager - Unit Tests', () => {
  let mockLogger: MockLogger;
  let tempDirManager: TempDirManager;
  let configManager: ConfigManager;

  beforeEach(() => {
    mockLogger = new MockLogger();
    tempDirManager = new TempDirManager();
    configManager = new ConfigManager(mockLogger as any);
  });

  afterEach(() => {
    tempDirManager.cleanup();
  });

  describe(describeWithId('TC-CFG-001', '正常な設定ファイル読み込み'), () => {
    it('should load a valid config file', async () => {
      const tempDir = tempDirManager.createTempDir('config-test-');
      const configPath = tempDirManager.createTempFile(tempDir, 'config.json', JSON.stringify(testFixtures.validConfig));

      const config = await configManager.loadConfig(configPath);

      expect(config).toBeDefined();
      expect(config.upstream_repository_name).toBe('upstream');
      expect(config.upstream_branch_name).toBe('main');
      expect(config.last_merged_upstream_commit).toBe('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0');
      expect(config.custom_code_marker.start).toBe('// CUSTOM-CODE-START');
      expect(config.custom_code_marker.end).toBe('// CUSTOM-CODE-END');
    });

    it('should return all required properties', async () => {
      const tempDir = tempDirManager.createTempDir('config-test-');
      const configPath = tempDirManager.createTempFile(tempDir, 'config.json', JSON.stringify(testFixtures.validConfig));

      const config = await configManager.loadConfig(configPath);

      expect(config).toHaveProperty('upstream_repository_name');
      expect(config).toHaveProperty('upstream_branch_name');
      expect(config).toHaveProperty('last_merged_upstream_commit');
      expect(config).toHaveProperty('custom_code_marker');
    });
  });

  describe(describeWithId('TC-CFG-002', 'ファイル存在チェック'), () => {
    it('should throw error when config file does not exist', async () => {
      const nonexistentPath = '/nonexistent/path/config.json';

      try {
        await configManager.loadConfig(nonexistentPath);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
        expect(error instanceof Error).toBe(true);
      }
    });

    it('should log error when file not found', async () => {
      try {
        await configManager.loadConfig('/nonexistent/config.json');
      } catch {
        // Expected to throw
      }

      const errorLogs = mockLogger.getLogsByLevel('ERROR');
      expect(errorLogs.length).toBeGreaterThan(0);
    });
  });

  describe(describeWithId('TC-CFG-003', 'JSON形式検証'), () => {
    it('should throw error for invalid JSON', async () => {
      const tempDir = tempDirManager.createTempDir('config-test-');
      const configPath = tempDirManager.createTempFile(tempDir, 'config.json', '{invalid json}');

      try {
        await configManager.loadConfig(configPath);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
        expect(error instanceof Error).toBe(true);
      }
    });

    it('should handle malformed JSON gracefully', async () => {
      const tempDir = tempDirManager.createTempDir('config-test-');
      const invalidJson = '{"incomplete": ';
      const configPath = tempDirManager.createTempFile(tempDir, 'config.json', invalidJson);

      try {
        await configManager.loadConfig(configPath);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe(describeWithId('TC-CFG-004', '必須項目検証（upstream_repository_name）'), () => {
    it('should validate missing upstream_repository_name', () => {
      const invalidConfig: any = { ...testFixtures.validConfig };
      delete invalidConfig.upstream_repository_name;

      const result = configManager.validateConfig(invalidConfig);

      expect(result.isValid).toBe(false);
    });
  });

  describe(describeWithId('TC-CFG-005', '必須項目検証（upstream_branch_name）'), () => {
    it('should validate missing upstream_branch_name', () => {
      const invalidConfig: any = { ...testFixtures.validConfig };
      delete invalidConfig.upstream_branch_name;

      const result = configManager.validateConfig(invalidConfig);

      expect(result.isValid).toBe(false);
    });
  });

  describe(describeWithId('TC-CFG-006', '必須項目検証（last_merged_upstream_commit）'), () => {
    it('should validate missing last_merged_upstream_commit', () => {
      const invalidConfig: any = { ...testFixtures.validConfig };
      delete invalidConfig.last_merged_upstream_commit;

      const result = configManager.validateConfig(invalidConfig);

      expect(result.isValid).toBe(false);
    });
  });

  describe(describeWithId('TC-CFG-007', '必須項目検証（custom_code_marker）'), () => {
    it('should validate missing custom_code_marker', () => {
      const invalidConfig: any = { ...testFixtures.validConfig };
      delete invalidConfig.custom_code_marker;

      const result = configManager.validateConfig(invalidConfig);

      expect(result.isValid).toBe(false);
    });

    it('should validate missing custom_code_marker.start', () => {
      const invalidConfig: any = {
        ...testFixtures.validConfig,
        custom_code_marker: {
          end: '// CUSTOM-CODE-END',
        },
      };

      const result = configManager.validateConfig(invalidConfig);

      expect(result.isValid).toBe(false);
    });

    it('should validate missing custom_code_marker.end', () => {
      const invalidConfig: any = {
        ...testFixtures.validConfig,
        custom_code_marker: {
          start: '// CUSTOM-CODE-START',
        },
      };

      const result = configManager.validateConfig(invalidConfig);

      expect(result.isValid).toBe(false);
    });
  });

  describe(describeWithId('TC-CFG-008', 'コミットハッシュ形式検証'), () => {
    it('should validate correct SHA-1 commit hash (40 hex characters)', () => {
      const validConfig = { ...testFixtures.validConfig };

      const result = configManager.validateConfig(validConfig);

      expect(result.isValid).toBe(true);
    });

    it('should validate 40 character hex string', () => {
      const config = {
        ...testFixtures.validConfig,
        last_merged_upstream_commit: '0123456789abcdef0123456789abcdef01234567',
      };

      const result = configManager.validateConfig(config);

      expect(result.isValid).toBe(true);
    });
  });

  describe(describeWithId('TC-CFG-009', 'コミットハッシュ形式検証エラー（39文字）'), () => {
    it('should detect invalid commit hash format (too short)', () => {
      const invalidConfig: any = {
        ...testFixtures.validConfig,
        last_merged_upstream_commit: 'abc123def456', // Too short
      };

      const result = configManager.validateConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe(describeWithId('TC-CFG-010', 'コミットハッシュ形式検証エラー（16進数でない）'), () => {
    it('should detect invalid commit hash (non-hex characters)', () => {
      const invalidConfig: any = {
        ...testFixtures.validConfig,
        last_merged_upstream_commit: 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz', // 40 chars but invalid hex
      };

      const result = configManager.validateConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect mixed invalid characters in commit hash', () => {
      const invalidConfig: any = {
        ...testFixtures.validConfig,
        last_merged_upstream_commit: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9bX', // Has 'X' which is not hex
      };

      const result = configManager.validateConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe(describeWithId('TC-CFG-011', '設定値の返却'), () => {
    it('should return all config values correctly', async () => {
      const tempDir = tempDirManager.createTempDir('config-test-');
      const customConfig = {
        upstream_repository_name: 'my-upstream',
        upstream_branch_name: 'develop',
        last_merged_upstream_commit: '1111111111111111111111111111111111111111',
        custom_code_marker: {
          start: '/* BEGIN CUSTOM */',
          end: '/* END CUSTOM */',
        },
      };

      const configPath = tempDirManager.createTempFile(tempDir, 'config.json', JSON.stringify(customConfig));

      const config = await configManager.loadConfig(configPath);

      expect(config.upstream_repository_name).toBe('my-upstream');
      expect(config.upstream_branch_name).toBe('develop');
      expect(config.last_merged_upstream_commit).toBe('1111111111111111111111111111111111111111');
      expect(config.custom_code_marker.start).toBe('/* BEGIN CUSTOM */');
      expect(config.custom_code_marker.end).toBe('/* END CUSTOM */');
    });

    it('should preserve exact marker strings', async () => {
      const tempDir = tempDirManager.createTempDir('config-test-');
      const customMarkers = {
        start: '<custom-start-marker>',
        end: '<custom-end-marker>',
      };

      const customConfig = {
        ...testFixtures.validConfig,
        custom_code_marker: customMarkers,
      };

      const configPath = tempDirManager.createTempFile(tempDir, 'config.json', JSON.stringify(customConfig));

      const config = await configManager.loadConfig(configPath);

      expect(config.custom_code_marker).toEqual(customMarkers);
    });
  });

  describe('Additional ConfigManager functionality', () => {
    it('should handle config with extra properties', async () => {
      const tempDir = tempDirManager.createTempDir('config-test-');
      const configWithExtra = {
        ...testFixtures.validConfig,
        extra_property: 'should be ignored',
        another_extra: 123,
      };

      const configPath = tempDirManager.createTempFile(tempDir, 'config.json', JSON.stringify(configWithExtra));

      const config = await configManager.loadConfig(configPath);

      expect(config).toBeDefined();
      expect(config.upstream_repository_name).toBeDefined();
    });

    it('should handle whitespace in config file', async () => {
      const tempDir = tempDirManager.createTempDir('config-test-');
      const configWithWhitespace = JSON.stringify(testFixtures.validConfig, null, 2);

      const configPath = tempDirManager.createTempFile(tempDir, 'config.json', configWithWhitespace);

      const config = await configManager.loadConfig(configPath);

      expect(config).toBeDefined();
      expect(config.upstream_repository_name).toBe('upstream');
    });

    it('should log info when config is loaded successfully', async () => {
      const tempDir = tempDirManager.createTempDir('config-test-');
      const configPath = tempDirManager.createTempFile(tempDir, 'config.json', JSON.stringify(testFixtures.validConfig));

      await configManager.loadConfig(configPath);

      const infoLogs = mockLogger.getLogsByLevel('INFO');
      expect(infoLogs.length).toBeGreaterThan(0);
    });

    it('should handle empty string in repository name', () => {
      const invalidConfig = {
        ...testFixtures.validConfig,
        upstream_repository_name: '',
      };

      const result = configManager.validateConfig(invalidConfig);

      expect(result.isValid).toBe(false);
    });

    it('should handle empty string in branch name', () => {
      const invalidConfig = {
        ...testFixtures.validConfig,
        upstream_branch_name: '',
      };

      const result = configManager.validateConfig(invalidConfig);

      expect(result.isValid).toBe(false);
    });
  });
});
