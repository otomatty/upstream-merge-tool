// Version tracking configuration
export interface VersionTrackingConfig {
  enabled: boolean;
  type?: "tag" | "package" | "manual";
  value?: string;
}

// Configuration structure
export interface Config {
  upstream_repository_name: string;
  upstream_branch_name: string;
  last_merged_upstream_commit: string;
  last_merged_upstream_version?: string;
  upstream_version_tracking?: VersionTrackingConfig;
  custom_code_marker: {
    start: string;
    end: string;
  };
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
