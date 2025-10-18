import { describe, it, expect, beforeEach } from 'bun:test';
import { Logger } from '../../logger/Logger';
import { MockLogger, describeWithId } from './setup';

describe('Logger - Unit Tests', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
  });

  describe(describeWithId('TC-LOG-001', 'info メソッド'), () => {
    it('should create an info log entry', () => {
      const message = 'Test info message';
      logger.info(message);

      const logs = logger.getLogs();
      expect(logs.length).toBeGreaterThan(0);

      const lastLog = logs[logs.length - 1]!;
      expect(lastLog.level).toBe('INFO');
      expect(lastLog.message).toBe(message);
    });

    it('should include timestamp in log entry', () => {
      logger.info('Test message');

      const logs = logger.getLogs();
      const lastLog = logs[logs.length - 1]!;

      expect(lastLog.timestamp).toBeDefined();
      expect(lastLog.timestamp instanceof Date).toBe(true);
    });
  });

  describe(describeWithId('TC-LOG-002', 'warn メソッド'), () => {
    it('should create a warn log entry', () => {
      const message = 'Test warning message';
      logger.warn(message);

      const logs = logger.getLogs();
      const lastLog = logs[logs.length - 1]!;

      expect(lastLog.level).toBe('WARN');
      expect(lastLog.message).toBe(message);
    });
  });

  describe(describeWithId('TC-LOG-003', 'error メソッド'), () => {
    it('should create an error log entry', () => {
      const message = 'Test error message';
      logger.error(message);

      const logs = logger.getLogs();
      const lastLog = logs[logs.length - 1]!;

      expect(lastLog.level).toBe('ERROR');
      expect(lastLog.message).toBe(message);
    });
  });

  describe(describeWithId('TC-LOG-004', 'debug メソッド'), () => {
    it('should create a debug log entry', () => {
      const message = 'Test debug message';
      logger.debug(message);

      const logs = logger.getLogs();
      const lastLog = logs[logs.length - 1]!;

      expect(lastLog.level).toBe('DEBUG');
      expect(lastLog.message).toBe(message);
    });
  });

  describe(describeWithId('TC-LOG-005', 'コンテキスト付きログ'), () => {
    it('should include context in log entry', () => {
      const message = 'User action';
      const context = { userId: '123', action: 'login', timestamp: '2025-10-19' };

      logger.info(message, context);

      const logs = logger.getLogs();
      const lastLog = logs[logs.length - 1]!;

      expect(lastLog.context).toBeDefined();
      expect(lastLog.context).toEqual(context);
    });

    it('should store context as object property', () => {
      const context = { key1: 'value1', key2: 42, key3: true };
      logger.warn('Test', context);

      const logs = logger.getLogs();
      const lastLog = logs[logs.length - 1]!;

      expect(lastLog.context?.key1).toBe('value1');
      expect(lastLog.context?.key2).toBe(42);
      expect(lastLog.context?.key3).toBe(true);
    });
  });

  describe(describeWithId('TC-LOG-006', 'ログ取得'), () => {
    it('should return all log entries as array', () => {
      logger.info('Message 1');
      logger.warn('Message 2');
      logger.error('Message 3');

      const logs = logger.getLogs();

      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBe(3);
    });

    it('should return empty array when no logs', () => {
      const logs = logger.getLogs();
      expect(Array.isArray(logs)).toBe(true);
    });
  });

  describe(describeWithId('TC-LOG-007', 'ログエントリの形式'), () => {
    it('should have required properties in log entry', () => {
      logger.info('Test message');

      const logs = logger.getLogs();
      const logEntry = logs[logs.length - 1]!;

      expect(logEntry).toHaveProperty('timestamp');
      expect(logEntry).toHaveProperty('level');
      expect(logEntry).toHaveProperty('message');
    });

    it('should have correct types for log properties', () => {
      logger.error('Test', { errorCode: 500 });

      const logs = logger.getLogs();
      const logEntry = logs[logs.length - 1]!;

      expect(typeof logEntry.timestamp).toBe('object');
      expect(typeof logEntry.level).toBe('string');
      expect(typeof logEntry.message).toBe('string');
      expect(typeof logEntry.context).toBe('object');
    });
  });

  describe(describeWithId('TC-LOG-008', 'ログの順序'), () => {
    it('should maintain log order', () => {
      logger.info('First');
      logger.warn('Second');
      logger.error('Third');
      logger.debug('Fourth');

      const logs = logger.getLogs();

      expect(logs[0]!.message).toBe('First');
      expect(logs[0]!.level).toBe('INFO');

      expect(logs[1]!.message).toBe('Second');
      expect(logs[1]!.level).toBe('WARN');

      expect(logs[2]!.message).toBe('Third');
      expect(logs[2]!.level).toBe('ERROR');

      expect(logs[3]!.message).toBe('Fourth');
      expect(logs[3]!.level).toBe('DEBUG');
    });

    it('should preserve chronological order with timestamps', () => {
      logger.info('First');
      logger.info('Second');
      logger.info('Third');

      const logs = logger.getLogs();

      for (let i = 1; i < logs.length; i++) {
        expect(logs[i]!.timestamp.getTime()).toBeGreaterThanOrEqual(
          logs[i - 1]!.timestamp.getTime()
        );
      }
    });
  });

  describe('Additional Logger functionality', () => {
    it('should handle multiple messages in sequence', () => {
      const messages = ['msg1', 'msg2', 'msg3', 'msg4', 'msg5'];

      messages.forEach((msg) => {
        logger.info(msg);
      });

      const logs = logger.getLogs();
      expect(logs.length).toBe(messages.length);

      messages.forEach((msg, index) => {
        expect(logs[index]!.message).toBe(msg);
      });
    });

    it('should handle empty message strings', () => {
      logger.info('');
      const logs = logger.getLogs();
      const lastLog = logs[logs.length - 1]!;

      expect(lastLog.message).toBe('');
      expect(lastLog.level).toBe('INFO');
    });

    it('should handle very long messages', () => {
      const longMessage = 'a'.repeat(10000);
      logger.info(longMessage);

      const logs = logger.getLogs();
      const lastLog = logs[logs.length - 1]!;

      expect(lastLog.message).toBe(longMessage);
      expect(lastLog.message.length).toBe(10000);
    });

    it('should handle special characters in messages', () => {
      const specialMessage = 'Test with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
      logger.info(specialMessage);

      const logs = logger.getLogs();
      const lastLog = logs[logs.length - 1]!;

      expect(lastLog.message).toBe(specialMessage);
    });

    it('should handle unicode characters', () => {
      const unicodeMessage = 'Unicode: 日本語, 中文, 한글, العربية, Ελληνικά';
      logger.info(unicodeMessage);

      const logs = logger.getLogs();
      const lastLog = logs[logs.length - 1]!;

      expect(lastLog.message).toBe(unicodeMessage);
    });

    it('should distinguish between different log levels', () => {
      logger.info('info');
      logger.warn('warn');
      logger.error('error');
      logger.debug('debug');

      const logs = logger.getLogs();
      const levels = logs.map((log) => log.level);

      expect(levels[0]).toBe('INFO');
      expect(levels[1]).toBe('WARN');
      expect(levels[2]).toBe('ERROR');
      expect(levels[3]).toBe('DEBUG');
    });

    it('should handle context with null values', () => {
      const context = { key1: null, key2: undefined };
      logger.info('Test', context);

      const logs = logger.getLogs();
      const lastLog = logs[logs.length - 1]!;

      expect(lastLog.context?.key1).toBe(null);
      expect(lastLog.context?.key2).toBe(undefined);
    });
  });
});
