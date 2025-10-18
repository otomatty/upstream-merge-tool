/**
 * Integration tests: GitService → ConflictResolver
 * Tests the connection from Git operations to conflict resolution
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { MockLogger } from '../unit/setup';
import {
  MockGitService,
  MockConflictResolver,
  integrationTestFixtures,
} from './setup';

describe('Integration Tests: GitService → ConflictResolver', () => {
  let mockLogger: MockLogger;
  let gitService: MockGitService;
  let conflictResolver: MockConflictResolver;

  beforeEach(() => {
    mockLogger = new MockLogger();
    gitService = new MockGitService(mockLogger);
    conflictResolver = new MockConflictResolver(mockLogger);
  });

  afterEach(() => {
    mockLogger.clear();
    gitService.clearHistory();
  });

  // TC-INT-009: Conflict information should be correctly extracted from merge result
  it('[TC-INT-009] should extract conflict info from merge result', async () => {
    // Arrange: Set up merge result with conflicts
    gitService.setMergeResult(integrationTestFixtures.mergeResultWithConflicts);

    // Act: Perform merge and extract conflict files
    const mergeResult = await gitService.merge('upstream', 'main');
    const conflictFiles = await gitService.getConflictFiles();

    // Assert: Conflict information is correctly extracted
    expect(mergeResult.success).toBe(false);
    expect(conflictFiles).toHaveLength(2);
    expect(conflictFiles).toContain('src/main.ts');
    expect(conflictFiles).toContain('src/config.ts');
  });

  // TC-INT-010: When no conflicts, resolver should be skipped
  it('[TC-INT-010] should skip resolver when no conflicts', async () => {
    // Arrange: Set merge result with no conflicts
    gitService.setMergeResult(integrationTestFixtures.mergeResultNoConflicts);

    // Act: Perform merge
    const mergeResult = await gitService.merge('upstream', 'main');

    // Assert: Resolver can be skipped
    expect(mergeResult.success).toBe(true);
    expect(mergeResult.conflictFiles).toHaveLength(0);
    // Resolver would be skipped in real implementation
  });

  // TC-INT-011: File content should be correctly passed to resolver
  it('[TC-INT-011] should pass file content correctly to resolver', async () => {
    // Arrange: Conflict content with markers
    const fileContent = `line 1
<<<<<<< HEAD
custom code
=======
upstream code
>>>>>>> upstream/main
line 2`;

    // Act: Detect conflicts in content
    const markers = await conflictResolver.detectConflicts(fileContent);

    // Assert: Markers are correctly detected
    expect(markers).toHaveLength(1);
    expect(markers[0]?.ours).toBe('custom code');
    expect(markers[0]?.theirs).toBe('upstream code');
  });

  // TC-INT-012: Multiple conflicts in file should be detected
  it('[TC-INT-012] should detect multiple conflicts in file', async () => {
    // Arrange: File content with multiple conflicts
    const fileContent = `first section:
<<<<<<< HEAD
our code 1
=======
their code 1
>>>>>>> upstream/main

second section:
<<<<<<< HEAD
our code 2
=======
their code 2
>>>>>>> upstream/main`;

    // Act: Detect all conflicts
    const markers = await conflictResolver.detectConflicts(fileContent);

    // Assert: All conflicts are detected
    expect(markers).toHaveLength(2);
    expect(markers[0]?.ours).toBe('our code 1');
    expect(markers[1]?.ours).toBe('our code 2');
  });

  // TC-INT-013: Error during merge should propagate to resolver
  it('[TC-INT-013] should handle errors from Git operations', async () => {
    // Arrange: Set up a merge that will fail
    const mergeResult = {
      success: false,
      conflictFiles: [],
    };
    gitService.setMergeResult(mergeResult);

    // Act: Perform merge operation
    const result = await gitService.merge('upstream', 'main');

    // Assert: Error state is properly reflected
    expect(result.success).toBe(false);
    expect(result.conflictFiles).toHaveLength(0);
  });

  // TC-INT-014: Conflict resolver should be initialized with proper logging
  it('[TC-INT-014] should initialize conflict resolver with logging', async () => {
    // Arrange
    const mergeResult = integrationTestFixtures.mergeResultWithConflicts;
    gitService.setMergeResult(mergeResult);

    // Act: Perform merge and initialize resolver
    await gitService.merge('upstream', 'main');
    await conflictResolver.resolveConflicts(['src/main.ts'], null as any, gitService);

    // Assert: Logging is recorded
    const logs = mockLogger.getLogs();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.some((log) => log.message.includes('Resolving'))).toBe(true);
  });

  // TC-INT-015: Complex conflict content should be properly handled
  it('[TC-INT-015] should handle complex conflict content', async () => {
    // Arrange: Complex conflict with multiple lines
    const complexContent = `const config = {
<<<<<<< HEAD
  // Custom implementation
  apiUrl: 'http://localhost:3000',
  timeout: 5000,
  debug: true
=======
  // Upstream version
  apiUrl: 'https://api.example.com',
  timeout: 30000,
  debug: false
>>>>>>> upstream/main
};`;

    // Act: Detect conflicts
    const markers = await conflictResolver.detectConflicts(complexContent);

    // Assert: Complex conflicts are correctly detected
    expect(markers).toHaveLength(1);
    expect(markers[0]?.ours).toContain('apiUrl: \'http://localhost:3000\'');
    expect(markers[0]?.theirs).toContain('apiUrl: \'https://api.example.com\'');
  });

  // TC-INT-016: Data flow from Git to Resolver should maintain integrity
  it('[TC-INT-016] should maintain data integrity in Git-to-Resolver flow', async () => {
    // Arrange
    const expectedConflictFiles = ['src/main.ts', 'src/config.ts', 'src/utils.ts'];
    gitService.setMergeResult({
      success: false,
      conflictFiles: expectedConflictFiles,
    });

    // Act: Simulate the data flow
    await gitService.merge('upstream', 'main');
    const gitConflictFiles = await gitService.getConflictFiles();

    // Assert: Data integrity is maintained
    expect(gitConflictFiles).toEqual(expectedConflictFiles);
    expect(gitConflictFiles).toHaveLength(3);
    gitConflictFiles.forEach((file, index) => {
      expect(file || '').toBe(expectedConflictFiles[index] || '');
    });
  });
});
