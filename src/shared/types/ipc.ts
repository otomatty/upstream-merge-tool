/**
 * IPC通信用の型定義
 */

export type ConfigType = {
  upstream_repository_name: string;
  upstream_branch_name: string;
  last_merged_upstream_commit: string;
  custom_code_marker: {
    start: string;
    end: string;
  };
  upstream_version_tracking?: {
    enabled: boolean;
    type: 'tag' | 'package' | 'manual';
    value: string;
  };
};

export type MergeResult = {
  success: boolean;
  conflictFiles: string[];
  error?: string;
  mergedCommit?: string;
};

export type ConflictFile = {
  id: string;
  path: string;
  status: 'auto-resolvable' | 'manual-required' | 'resolved';
  conflicts: Conflict[];
};

export type Conflict = {
  id: string;
  lineStart: number;
  lineEnd: number;
  upstream: {
    start: number;
    end: number;
    content: string;
  };
  local: {
    start: number;
    end: number;
    content: string;
  };
  canAutoResolve: boolean;
};

export type ReportSummary = {
  status: 'success' | 'partial' | 'error';
  timestamp: string;
  mergedCommit: string;
  conflictCount: number;
  resolvedCount: number;
};

export type ProgressEvent = {
  type: 'fetch' | 'merge' | 'add' | 'commit';
  status: 'started' | 'completed' | 'error';
  message: string;
  conflictCount?: number;
};
