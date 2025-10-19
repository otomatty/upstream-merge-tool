/**
 * IPC通信用の型定義
 */

export type ConfigType = {
	upstream_repository_name: string;
	upstream_branch_name: string;
	last_merged_upstream_commit: string;
	merge_target_branch: string;
	custom_code_marker: {
		start: string;
		end: string;
	};
	upstream_version_tracking?: {
		enabled: boolean;
		type: "tag" | "package" | "manual";
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
	status: "auto-resolvable" | "manual-required" | "resolved";
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
	status: "success" | "partial" | "error";
	timestamp: string;
	mergedCommit: string;
	conflictCount: number;
	resolvedCount: number;
};

export type ProgressEvent = {
	type: "fetch" | "checkout" | "merge" | "add" | "commit";
	status: "started" | "completed" | "error";
	message: string;
	conflictCount?: number;
};

/**
 * ========== プリセット管理用型定義 ==========
 */

/**
 * Upstream リポジトリ設定
 */
export type UpstreamConfig = {
	upstream_repository_name: string;
	upstream_branch_name: string;
	upstream_version_tracking?: {
		enabled: boolean;
		type?: "tag" | "package" | "manual";
		value?: string;
	};
};

/**
 * ローカルリポジトリ設定
 */
export type LocalConfig = {
	local_repository_path: string;
	merge_target_branch: string;
	last_merged_upstream_commit?: string;
	last_merged_upstream_version?: string;
};

/**
 * カスタムコード保護設定
 */
export type CustomCodeConfig = {
	custom_code_marker: {
		start: string;
		end: string;
	};
};

/**
 * プリセット設定（Upstream + ローカル + カスタムコード）
 */
export type PresetConfig = UpstreamConfig & LocalConfig & CustomCodeConfig;

/**
 * プリセット定義
 */
export type ConfigPreset = {
	id: string;
	name: string;
	description?: string;
	isDefault: boolean;
	createdAt: number;
	updatedAt: number;
	config: PresetConfig;
};

/**
 * プリセット一覧応答
 */
export type PresetListResponse = {
	presets: ConfigPreset[];
	defaultPresetId?: string;
};

/**
 * プリセット操作結果
 */
export type PresetOperationResult = {
	success: boolean;
	presetId?: string;
	error?: string;
};

/**
 * バリデーション結果
 */
export type ValidationResult = {
	isValid: boolean;
	errors: string[];
};
