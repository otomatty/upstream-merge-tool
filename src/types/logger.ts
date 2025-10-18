// Log level type
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

// Log entry structure
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
}
