import type { LogEntry, LogLevel } from '../types/logger';

/**
 * Logger class for managing application logs
 * Stores log entries and provides methods for different log levels
 * Supports both Node.js and Bun runtimes
 */
export class Logger {
  private logs: LogEntry[] = [];
  private isDevelopment = this.getEnvironment() === 'development';

  /**
   * Get the current runtime environment
   * Checks for Bun or uses process.env for Node.js
   */
  private getEnvironment(): string {
    // Support both Bun and Node.js
    if (typeof Bun !== 'undefined' && Bun?.env) {
      return Bun.env.NODE_ENV || 'production';
    }
    return process.env.NODE_ENV || 'production';
  }

  /**
   * Add an info level log entry
   */
  info(message: string, context?: Record<string, any>): void {
    this.addLog('INFO', message, context);
  }

  /**
   * Add a warning level log entry
   */
  warn(message: string, context?: Record<string, any>): void {
    this.addLog('WARN', message, context);
  }

  /**
   * Add an error level log entry
   */
  error(message: string, context?: Record<string, any>): void {
    this.addLog('ERROR', message, context);
  }

  /**
   * Add a debug level log entry
   */
  debug(message: string, context?: Record<string, any>): void {
    this.addLog('DEBUG', message, context);
  }

  /**
   * Get all logged entries
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Format a single log entry for display
   */
  formatLogEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.padEnd(5);
    const context = entry.context ? ` | ${JSON.stringify(entry.context)}` : '';
    return `[${timestamp}] ${level} | ${entry.message}${context}`;
  }

  /**
   * Format all logs for display
   */
  formatAllLogs(): string {
    return this.logs.map((entry) => this.formatLogEntry(entry)).join('\n');
  }

  /**
   * Print all logs to console
   */
  printLogs(): void {
    console.log(this.formatAllLogs());
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Internal method to add a log entry
   */
  private addLog(level: LogLevel, message: string, context?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
    };

    this.logs.push(entry);

    // Also print to console if in development mode
    if (this.isDevelopment || level === 'ERROR' || level === 'WARN') {
      console.log(this.formatLogEntry(entry));
    }
  }
}
