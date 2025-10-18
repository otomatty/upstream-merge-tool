import type { LogEntry } from '../types/logger';

// Report data structure
export interface ReportData {
  startTime: Date;
  endTime: Date;
  autoResolvedCount: number;
  manualRequiredCount: number;
  totalConflictCount: number;
  autoResolvedFiles: string[];
  manualRequiredFiles: string[];
  success: boolean;
}
