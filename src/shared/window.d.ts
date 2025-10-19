/**
 * Global window interface extensions for Electron renderer process
 * Defines the electronAPI object available to React components
 */

import type {
	ConfigPreset,
	PresetListResponse,
	PresetOperationResult,
	ConfigType,
} from "./types/ipc";

interface ElectronAPI {
	config?: {
		load?: (path: string) => Promise<ConfigType>;
		save?: (path: string, data: ConfigType) => Promise<void>;
		validate?: (
			data: ConfigType,
		) => Promise<{ valid: boolean; errors: string[] }>;
		getDefaultPath?: () => Promise<string | null>;
		setDefaultPath?: (path: string) => Promise<void>;
		clearDefault?: () => Promise<void>;
	};
	file?: {
		openFile?: (options: {
			defaultPath?: string;
			filters?: Array<{ name: string; extensions: string[] }>;
		}) => Promise<{ filePaths: string[]; canceled: boolean } | null>;
		selectDirectory?: (options: {
			defaultPath?: string;
		}) => Promise<{ filePath: string } | null>;
	};
	preset?: {
		list: () => Promise<PresetListResponse>;
		save: (preset: ConfigPreset) => Promise<PresetOperationResult>;
		delete: (presetId: string) => Promise<PresetOperationResult>;
		load: (presetId: string) => Promise<ConfigPreset | null>;
		getDefault: () => Promise<ConfigPreset | null>;
		setDefault: (presetId: string) => Promise<PresetOperationResult>;
		rename: (
			presetId: string,
			newName: string,
		) => Promise<PresetOperationResult>;
		updateDescription: (
			presetId: string,
			description: string,
		) => Promise<PresetOperationResult>;
		duplicate: (
			presetId: string,
			newName: string,
		) => Promise<PresetOperationResult>;
	};
}

declare global {
	interface Window {
		electronAPI?: ElectronAPI;
	}
}

export type { ElectronAPI };
