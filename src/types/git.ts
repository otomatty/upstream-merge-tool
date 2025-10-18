// Git merge result
export interface MergeResult {
  success: boolean;
  conflictFiles: string[];
  error?: string;
}

// Git status
export interface GitStatus {
  isRepository: boolean;
  isDirty: boolean;
  branch: string;
}

// Command execution result
export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
