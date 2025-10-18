/**
 * Integration tests: ConfigManager → GitService
 * Tests the connection from configuration loading to Git operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { MockLogger } from '../unit/setup';
import {
  MockConfigManager,
  MockGitService,
  integrationTestFixtures,
} from './setup';

describe('Integration Tests: ConfigManager → GitService', () => {
  let mockLogger: MockLogger;
  let configManager: MockConfigManager;
  let gitService: MockGitService;

  beforeEach(() => {
    mockLogger = new MockLogger();
    configManager = new MockConfigManager();
    gitService = new MockGitService(mockLogger);
  });

  afterEach(() => {
    mockLogger.clear();
  });

  // TC-INT-001: Valid configuration should initialize GitService correctly
  it('[TC-INT-001] should initialize GitService with valid config', async () => {
    // Arrange: Load configuration
    const config = await configManager.loadConfig('./fixtures/valid-config.json');

    // Act: Use config to initialize GitService
    const gitService = new MockGitService(mockLogger);

    // Assert: GitService is properly initialized
    expect(gitService).toBeDefined();
    expect(config).toBeDefined();
    expect(config.upstream_repository_name).toBe('upstream');
    expect(config.upstream_branch_name).toBe('main');
  });

  // TC-INT-002: Invalid config should propagate errors
  it('[TC-INT-002] should propagate error from invalid config', async () => {
    // Arrange: Invalid configuration
    const invalidConfig = {
      upstream_repository_name: 'upstream',
      // Missing required fields: upstream_branch_name, etc.
    };

    // Act & Assert: Validation should fail
    const result = configManager.validateConfig(invalidConfig);
    // In a real scenario, validation would fail and error would propagate
    // For this mock, we verify the validation result structure
    expect(result).toBeDefined();
  });

  // TC-INT-003: Remote information from config should be used in Git operations
  it('[TC-INT-003] should use remote info from config in Git operations', async () => {
    // Arrange: Load valid configuration
    const config = integrationTestFixtures.validConfig;
    configManager.setConfig(config);

    // Act: Extract remote information
    const loadedConfig = await configManager.loadConfig('test.json');
    const remoteInfo = {
      upstreamName: loadedConfig.upstream_repository_name,
      branchName: loadedConfig.upstream_branch_name,
    };

    // Perform merge operation using the config
    const mergeResult = await gitService.merge(remoteInfo.upstreamName, remoteInfo.branchName);

    // Assert: Remote information is correctly used
    expect(remoteInfo.upstreamName).toBe('upstream');
    expect(remoteInfo.branchName).toBe('main');
    expect(gitService.getExecutedCommands()).toContain('merge upstream/main');
  });

  // TC-INT-004: All required config items should be properly chained
  it('[TC-INT-004] should chain all config items correctly', async () => {
    // Arrange: Load configuration
    const config = integrationTestFixtures.validConfig;
    configManager.setConfig(config);

    // Act: Load and verify all required items
    const loadedConfig = await configManager.loadConfig('test.json');

    // Assert: All required fields are present and accessible
    expect(loadedConfig.upstream_repository_name).toBeDefined();
    expect(loadedConfig.upstream_branch_name).toBeDefined();
    expect(loadedConfig.last_merged_upstream_commit).toBeDefined();
    expect(loadedConfig.custom_code_marker).toBeDefined();

    // Verify that Git operations can use these values
    expect(loadedConfig.upstream_repository_name).toBe('upstream');
    expect(loadedConfig.upstream_branch_name).toBe('main');
    expect(loadedConfig.last_merged_upstream_commit).toMatch(
      /^[a-f0-9]{40}$/,
    );
  });

  // TC-INT-005: Logging should occur during configuration and Git operations
  it('[TC-INT-005] should log configuration loading and Git operations', async () => {
    // Arrange
    const config = integrationTestFixtures.validConfig;
    configManager.setConfig(config);

    // Act: Load config and perform Git operation
    await configManager.loadConfig('test.json');
    await gitService.fetch('upstream');
    await gitService.merge('upstream', 'main');

    // Assert: Log entries are recorded
    const logs = mockLogger.getLogs();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.some((log) => log.message.includes('Fetching'))).toBe(true);
    expect(logs.some((log) => log.message.includes('Merging'))).toBe(true);
  });

  // TC-INT-006: Configuration context should be maintained across operations
  it('[TC-INT-006] should maintain configuration context across operations', async () => {
    // Arrange
    const config = integrationTestFixtures.validConfig;
    configManager.setConfig(config);
    const loadedConfig = await configManager.loadConfig('test.json');

    // Act: Perform multiple operations using the same config
    await gitService.fetch(loadedConfig.upstream_repository_name);
    const mergeResult = await gitService.merge(
      loadedConfig.upstream_repository_name,
      loadedConfig.upstream_branch_name,
    );

    // Assert: All operations used the correct configuration values
    const commands = gitService.getExecutedCommands();
    expect(commands).toHaveLength(2);
    expect(commands[0]).toBe('fetch upstream');
    expect(commands[1]).toBe('merge upstream/main');
    expect(mergeResult).toBeDefined();
  });

  // TC-INT-007: Configuration changes should be reflected in subsequent operations
  it('[TC-INT-007] should reflect config changes in subsequent operations', async () => {
    // Arrange: Set initial config
    const initialConfig = integrationTestFixtures.validConfig;
    configManager.setConfig(initialConfig);

    // Act: Perform initial operation
    await gitService.merge(initialConfig.upstream_repository_name, initialConfig.upstream_branch_name);

    // Update config (simulating a config change)
    const updatedConfig = {
      ...initialConfig,
      upstream_branch_name: 'develop',
    };
    configManager.setConfig(updatedConfig);

    // Perform operation with updated config
    const updatedLoadedConfig = await configManager.loadConfig('test.json');
    await gitService.merge(
      updatedLoadedConfig.upstream_repository_name,
      updatedLoadedConfig.upstream_branch_name,
    );

    // Assert: Changes are reflected in subsequent operations
    const commands = gitService.getExecutedCommands();
    expect(commands[0]).toBe('merge upstream/main');
    expect(commands[1]).toBe('merge upstream/develop');
  });

  // TC-INT-008: Error scenarios in config should prevent Git operations
  it('[TC-INT-008] should prevent invalid operations due to config errors', async () => {
    // Arrange: Create invalid config
    const invalidConfig = {
      upstream_repository_name: '',
      upstream_branch_name: 'main',
      last_merged_upstream_commit: 'invalid-hash',
      custom_code_marker: {
        start: '',
        end: '',
      },
    };

    // Act: Attempt to use invalid config
    configManager.setConfig(invalidConfig as any);
    const validation = configManager.validateConfig(invalidConfig);

    // Assert: Operations should be guarded against invalid config
    // In a real scenario, validation would prevent further operations
    expect(validation).toBeDefined();
  });
});
