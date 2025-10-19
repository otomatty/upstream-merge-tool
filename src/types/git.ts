// Version information extracted from upstream repository
export interface VersionInfo {
  version: string;
  source: "tag" | "package" | "manual" | "commit";
  isValid: boolean;
  error?: string;
}

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
