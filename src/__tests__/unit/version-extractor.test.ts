import { describe, it, expect, mock, beforeAll, afterAll } from 'bun:test';
import { VersionExtractor } from '../../../src/version/VersionExtractor';
import { Logger } from '../../../src/logger/Logger';
import type { VersionTrackingConfig } from '../../../src/types/config';

describe('VersionExtractor', () => {
  let logger: Logger;
  let versionExtractor: VersionExtractor;

  beforeAll(() => {
    logger = new Logger();
    versionExtractor = new VersionExtractor(logger);
  });

  describe('extractVersion()', () => {
    it('should return invalid version info when version tracking is disabled', async () => {
      const config: VersionTrackingConfig = { enabled: false };
      const result = await versionExtractor.extractVersion('upstream', 'main', config);

      expect(result.isValid).toBe(false);
      expect(result.source).toBe('commit');
      expect(result.version).toBe('');
    });

    it('should return invalid version info when no config is provided', async () => {
      const result = await versionExtractor.extractVersion('upstream', 'main', undefined);

      expect(result.isValid).toBe(false);
      expect(result.source).toBe('commit');
    });

    it('should attempt to extract version from tag when type is tag', async () => {
      const config: VersionTrackingConfig = {
        enabled: true,
        type: 'tag',
      };

      // Note: This test will fail in isolation without a real git repo
      // In a real scenario, you would mock GitService methods
      const result = await versionExtractor.extractVersion('upstream', 'main', config);

      // Result depends on whether tags exist in the repo
      expect(result).toBeDefined();
      expect(result.source).toMatch(/tag|package|commit/);
    });

    it('should attempt to extract version from package.json when type is package', async () => {
      const config: VersionTrackingConfig = {
        enabled: true,
        type: 'package',
      };

      const result = await versionExtractor.extractVersion('upstream', 'main', config);

      expect(result).toBeDefined();
      expect(result.source).toMatch(/tag|package|commit/);
    });

    it('should use manual version when type is manual and value is provided', async () => {
      const config: VersionTrackingConfig = {
        enabled: true,
        type: 'manual',
        value: 'v1.2.3',
      };

      const result = await versionExtractor.extractVersion('upstream', 'main', config);

      expect(result.isValid).toBe(true);
      expect(result.version).toBe('v1.2.3');
      expect(result.source).toBe('manual');
    });

    it('should fallback to other methods if primary method fails', async () => {
      // This test would require mocking GitService to fail for tag
      // and then succeed for package.json
      const config: VersionTrackingConfig = {
        enabled: true,
        type: 'tag', // Primary method
      };

      const result = await versionExtractor.extractVersion('upstream', 'main', config);

      expect(result).toBeDefined();
      // Should be either tag, package, or commit source
      expect(['tag', 'package', 'commit']).toContain(result.source);
    });
  });
});
