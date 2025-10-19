import { ipcMain, app } from "electron";
import { PresetManager } from "@/config/PresetManager";
import { Logger } from "@/logger/Logger";
import type {
	ConfigPreset,
	PresetListResponse,
	PresetOperationResult,
} from "@shared/types/ipc";

const logger = new Logger();
let presetManager: PresetManager;

/**
 * Register preset-related IPC handlers
 */
export function registerPresetHandlers() {
	// Initialize PresetManager on first call
	if (!presetManager) {
		presetManager = new PresetManager(logger, app.getPath("userData"));
		presetManager.initialize().catch((error) => {
			logger.error(`Failed to initialize PresetManager: ${error}`);
		});
	}

	/**
	 * IPC Handler: preset:list
	 * Get list of all presets
	 */
	ipcMain.handle("preset:list", async (): Promise<PresetListResponse> => {
		try {
			logger.debug("Handling preset:list request");

			const presets = await presetManager.listPresets();
			const defaultPreset = await presetManager.getDefaultPreset();

			return {
				presets,
				defaultPresetId: defaultPreset?.id,
			};
		} catch (error) {
			logger.error(`Failed to list presets: ${error}`);
			throw error;
		}
	});

	/**
	 * IPC Handler: preset:save
	 * Save or update a preset
	 */
	ipcMain.handle(
		"preset:save",
		async (_event, preset: ConfigPreset): Promise<PresetOperationResult> => {
			try {
				logger.debug(`Handling preset:save request for preset: ${preset.name}`);

				const result = await presetManager.savePreset(preset);

				if (result.success) {
					logger.info(`Preset saved: ${preset.name} (${result.presetId})`);
				} else {
					logger.warn(`Failed to save preset: ${result.error}`);
				}

				return result;
			} catch (error) {
				logger.error(`Failed to save preset: ${error}`);
				throw error;
			}
		},
	);

	/**
	 * IPC Handler: preset:delete
	 * Delete a preset
	 */
	ipcMain.handle(
		"preset:delete",
		async (_event, presetId: string): Promise<PresetOperationResult> => {
			try {
				logger.debug(`Handling preset:delete request for preset: ${presetId}`);

				const result = await presetManager.deletePreset(presetId);

				if (result.success) {
					logger.info(`Preset deleted: ${presetId}`);
				} else {
					logger.warn(`Failed to delete preset: ${result.error}`);
				}

				return result;
			} catch (error) {
				logger.error(`Failed to delete preset: ${error}`);
				throw error;
			}
		},
	);

	/**
	 * IPC Handler: preset:load
	 * Load a specific preset
	 */
	ipcMain.handle(
		"preset:load",
		async (_event, presetId: string): Promise<ConfigPreset | null> => {
			try {
				logger.debug(`Handling preset:load request for preset: ${presetId}`);

				const preset = await presetManager.loadPreset(presetId);

				if (preset) {
					logger.debug(`Preset loaded: ${presetId}`);
				} else {
					logger.warn(`Preset not found: ${presetId}`);
				}

				return preset;
			} catch (error) {
				logger.error(`Failed to load preset: ${error}`);
				throw error;
			}
		},
	);

	/**
	 * IPC Handler: preset:getDefault
	 * Get default preset
	 */
	ipcMain.handle(
		"preset:getDefault",
		async (): Promise<ConfigPreset | null> => {
			try {
				logger.debug("Handling preset:getDefault request");

				const preset = await presetManager.getDefaultPreset();

				if (preset) {
					logger.debug(`Default preset found: ${preset.id}`);
				} else {
					logger.debug("No default preset set");
				}

				return preset;
			} catch (error) {
				logger.error(`Failed to get default preset: ${error}`);
				throw error;
			}
		},
	);

	/**
	 * IPC Handler: preset:setDefault
	 * Set a preset as default
	 */
	ipcMain.handle(
		"preset:setDefault",
		async (_event, presetId: string): Promise<PresetOperationResult> => {
			try {
				logger.debug(
					`Handling preset:setDefault request for preset: ${presetId}`,
				);

				const result = await presetManager.setDefaultPreset(presetId);

				if (result.success) {
					logger.info(`Default preset set: ${presetId}`);
				} else {
					logger.warn(`Failed to set default preset: ${result.error}`);
				}

				return result;
			} catch (error) {
				logger.error(`Failed to set default preset: ${error}`);
				throw error;
			}
		},
	);

	/**
	 * IPC Handler: preset:rename
	 * Rename a preset
	 */
	ipcMain.handle(
		"preset:rename",
		async (
			_event,
			presetId: string,
			newName: string,
		): Promise<PresetOperationResult> => {
			try {
				logger.debug(`Handling preset:rename request for preset: ${presetId}`);

				const result = await presetManager.renamePreset(presetId, newName);

				if (result.success) {
					logger.info(`Preset renamed: ${presetId} -> ${newName}`);
				} else {
					logger.warn(`Failed to rename preset: ${result.error}`);
				}

				return result;
			} catch (error) {
				logger.error(`Failed to rename preset: ${error}`);
				throw error;
			}
		},
	);

	/**
	 * IPC Handler: preset:updateDescription
	 * Update preset description
	 */
	ipcMain.handle(
		"preset:updateDescription",
		async (
			_event,
			presetId: string,
			description: string,
		): Promise<PresetOperationResult> => {
			try {
				logger.debug(
					`Handling preset:updateDescription request for preset: ${presetId}`,
				);

				const result = await presetManager.updatePresetDescription(
					presetId,
					description,
				);

				if (result.success) {
					logger.info(`Preset description updated: ${presetId}`);
				} else {
					logger.warn(`Failed to update preset description: ${result.error}`);
				}

				return result;
			} catch (error) {
				logger.error(`Failed to update preset description: ${error}`);
				throw error;
			}
		},
	);

	/**
	 * IPC Handler: preset:duplicate
	 * Duplicate a preset
	 */
	ipcMain.handle(
		"preset:duplicate",
		async (
			_event,
			presetId: string,
			newName: string,
		): Promise<PresetOperationResult> => {
			try {
				logger.debug(
					`Handling preset:duplicate request for preset: ${presetId}`,
				);

				const result = await presetManager.duplicatePreset(presetId, newName);

				if (result.success) {
					logger.info(`Preset duplicated: ${presetId} -> ${result.presetId}`);
				} else {
					logger.warn(`Failed to duplicate preset: ${result.error}`);
				}

				return result;
			} catch (error) {
				logger.error(`Failed to duplicate preset: ${error}`);
				throw error;
			}
		},
	);

	logger.info("Preset IPC handlers registered successfully");
}
