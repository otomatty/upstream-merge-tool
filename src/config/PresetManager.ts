import { readdir, readFile, writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import type { ConfigPreset, PresetOperationResult } from "../shared/types/ipc";
import type { Logger } from "../logger/Logger";

/**
 * PresetManager class for managing configuration presets
 * Handles saving, loading, and managing multiple presets
 */
export class PresetManager {
	private presetsDir: string;

	constructor(
		private logger: Logger,
		userDataPath: string,
	) {
		this.presetsDir = join(userDataPath, "presets");
	}

	/**
	 * Initialize presets directory
	 */
	async initialize(): Promise<void> {
		try {
			if (!existsSync(this.presetsDir)) {
				await mkdir(this.presetsDir, { recursive: true });
				this.logger.info(`Created presets directory: ${this.presetsDir}`);
			}
		} catch (error) {
			this.logger.error(`Failed to initialize presets directory: ${error}`);
			throw error;
		}
	}

	/**
	 * List all presets
	 */
	async listPresets(): Promise<ConfigPreset[]> {
		try {
			this.logger.debug(`Listing presets from: ${this.presetsDir}`);

			if (!existsSync(this.presetsDir)) {
				this.logger.debug(
					"Presets directory does not exist, returning empty list",
				);
				return [];
			}

			const files = await readdir(this.presetsDir);
			const presets: ConfigPreset[] = [];

			for (const file of files) {
				if (file.endsWith(".json") && !file.startsWith(".")) {
					const preset = await this.loadPresetFile(join(this.presetsDir, file));
					if (preset) {
						presets.push(preset);
					}
				}
			}

			// Sort by updated time (newest first)
			presets.sort((a, b) => b.updatedAt - a.updatedAt);

			this.logger.debug(`Found ${presets.length} presets`);
			return presets;
		} catch (error) {
			this.logger.error(`Failed to list presets: ${error}`);
			return [];
		}
	}

	/**
	 * Save a preset
	 */
	async savePreset(preset: ConfigPreset): Promise<PresetOperationResult> {
		try {
			// Initialize directory if needed
			await this.initialize();

			// Generate ID if not provided
			const id = preset.id || randomUUID();

			// Set timestamps
			const presetToSave: ConfigPreset = {
				...preset,
				id,
				updatedAt: Date.now(),
				createdAt: preset.createdAt || Date.now(),
			};

			// Validate preset
			const validation = this.validatePreset(presetToSave);
			if (!validation.isValid) {
				this.logger.warn(
					`Preset validation failed: ${validation.errors.join(", ")}`,
				);
				return {
					success: false,
					error: `Validation failed: ${validation.errors.join(", ")}`,
				};
			}

			const filePath = join(this.presetsDir, `${id}.json`);
			await writeFile(filePath, JSON.stringify(presetToSave, null, 2), "utf-8");

			this.logger.info(`Preset saved successfully: ${id} (${preset.name})`);

			return {
				success: true,
				presetId: id,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			this.logger.error(`Failed to save preset: ${errorMessage}`);
			return {
				success: false,
				error: errorMessage,
			};
		}
	}

	/**
	 * Load a specific preset
	 */
	async loadPreset(presetId: string): Promise<ConfigPreset | null> {
		try {
			const filePath = join(this.presetsDir, `${presetId}.json`);
			return await this.loadPresetFile(filePath);
		} catch (error) {
			this.logger.error(`Failed to load preset ${presetId}: ${error}`);
			return null;
		}
	}

	/**
	 * Delete a preset
	 */
	async deletePreset(presetId: string): Promise<PresetOperationResult> {
		try {
			const filePath = join(this.presetsDir, `${presetId}.json`);

			if (!existsSync(filePath)) {
				this.logger.warn(`Preset file not found: ${presetId}`);
				return {
					success: false,
					error: "Preset not found",
				};
			}

			await unlink(filePath);
			this.logger.info(`Preset deleted: ${presetId}`);

			return { success: true };
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			this.logger.error(`Failed to delete preset: ${errorMessage}`);
			return {
				success: false,
				error: errorMessage,
			};
		}
	}

	/**
	 * Get default preset
	 */
	async getDefaultPreset(): Promise<ConfigPreset | null> {
		try {
			const presets = await this.listPresets();
			const defaultPreset = presets.find((p) => p.isDefault);

			if (defaultPreset) {
				this.logger.debug(`Default preset found: ${defaultPreset.id}`);
				return defaultPreset;
			}

			this.logger.debug("No default preset set");
			return null;
		} catch (error) {
			this.logger.error(`Failed to get default preset: ${error}`);
			return null;
		}
	}

	/**
	 * Set default preset
	 */
	async setDefaultPreset(presetId: string): Promise<PresetOperationResult> {
		try {
			const presets = await this.listPresets();

			// Find target preset
			const targetPreset = presets.find((p) => p.id === presetId);
			if (!targetPreset) {
				this.logger.warn(`Preset not found: ${presetId}`);
				return {
					success: false,
					error: "Preset not found",
				};
			}

			// Unset previous default
			for (const preset of presets) {
				if (preset.isDefault && preset.id !== presetId) {
					preset.isDefault = false;
					await this.savePreset(preset);
					this.logger.debug(`Unset default for: ${preset.id}`);
				}
			}

			// Set new default
			targetPreset.isDefault = true;
			const result = await this.savePreset(targetPreset);

			if (result.success) {
				this.logger.info(`Default preset set: ${presetId}`);
			}

			return result;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			this.logger.error(`Failed to set default preset: ${errorMessage}`);
			return {
				success: false,
				error: errorMessage,
			};
		}
	}

	/**
	 * Rename a preset
	 */
	async renamePreset(
		presetId: string,
		newName: string,
	): Promise<PresetOperationResult> {
		try {
			const preset = await this.loadPreset(presetId);
			if (!preset) {
				return {
					success: false,
					error: "Preset not found",
				};
			}

			if (!newName.trim()) {
				return {
					success: false,
					error: "Preset name cannot be empty",
				};
			}

			preset.name = newName.trim();
			return await this.savePreset(preset);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			this.logger.error(`Failed to rename preset: ${errorMessage}`);
			return {
				success: false,
				error: errorMessage,
			};
		}
	}

	/**
	 * Update preset description
	 */
	async updatePresetDescription(
		presetId: string,
		description: string,
	): Promise<PresetOperationResult> {
		try {
			const preset = await this.loadPreset(presetId);
			if (!preset) {
				return {
					success: false,
					error: "Preset not found",
				};
			}

			preset.description = description.trim() || undefined;
			return await this.savePreset(preset);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			this.logger.error(`Failed to update preset description: ${errorMessage}`);
			return {
				success: false,
				error: errorMessage,
			};
		}
	}

	/**
	 * Duplicate a preset
	 */
	async duplicatePreset(
		presetId: string,
		newName: string,
	): Promise<PresetOperationResult> {
		try {
			const preset = await this.loadPreset(presetId);
			if (!preset) {
				return {
					success: false,
					error: "Preset not found",
				};
			}

			if (!newName.trim()) {
				return {
					success: false,
					error: "Preset name cannot be empty",
				};
			}

			const newPreset: ConfigPreset = {
				...preset,
				id: randomUUID(),
				name: newName.trim(),
				isDefault: false,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};

			return await this.savePreset(newPreset);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			this.logger.error(`Failed to duplicate preset: ${errorMessage}`);
			return {
				success: false,
				error: errorMessage,
			};
		}
	}

	/**
	 * Validate preset structure
	 */
	private validatePreset(preset: ConfigPreset): {
		isValid: boolean;
		errors: string[];
	} {
		const errors: string[] = [];

		// Validate basic fields
		if (!preset.id) {
			errors.push("Preset ID is required");
		}

		if (!preset.name || !preset.name.trim()) {
			errors.push("Preset name is required");
		}

		// Validate config
		if (!preset.config) {
			errors.push("Preset config is required");
		} else {
			// Validate upstream config
			if (!preset.config.upstream_repository_name) {
				errors.push("upstream_repository_name is required");
			}

			if (!preset.config.upstream_branch_name) {
				errors.push("upstream_branch_name is required");
			}

			// Validate local config
			if (!preset.config.local_repository_path) {
				errors.push("local_repository_path is required");
			}

			if (!preset.config.merge_target_branch) {
				errors.push("merge_target_branch is required");
			}

			// Validate custom code marker
			if (!preset.config.custom_code_marker) {
				errors.push("custom_code_marker is required");
			} else {
				if (!preset.config.custom_code_marker.start) {
					errors.push("custom_code_marker.start is required");
				}

				if (!preset.config.custom_code_marker.end) {
					errors.push("custom_code_marker.end is required");
				}

				if (
					preset.config.custom_code_marker.start ===
					preset.config.custom_code_marker.end
				) {
					errors.push("custom_code_marker.start and .end must be different");
				}
			}
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Load preset from file
	 */
	private async loadPresetFile(filePath: string): Promise<ConfigPreset | null> {
		try {
			if (!existsSync(filePath)) {
				this.logger.debug(`Preset file not found: ${filePath}`);
				return null;
			}

			const content = await readFile(filePath, "utf-8");
			const preset: ConfigPreset = JSON.parse(content);

			// Validate loaded preset
			const validation = this.validatePreset(preset);
			if (!validation.isValid) {
				this.logger.warn(
					`Loaded preset has validation errors: ${validation.errors.join(", ")}`,
				);
				return null;
			}

			return preset;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			this.logger.warn(
				`Failed to load preset file ${filePath}: ${errorMessage}`,
			);
			return null;
		}
	}
}
