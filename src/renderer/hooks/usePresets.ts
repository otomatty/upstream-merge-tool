import { useState, useCallback, useEffect } from 'react';
import type { ConfigPreset, PresetListResponse, PresetOperationResult } from '@shared/types/ipc';

interface UsePresetsReturn {
  presets: ConfigPreset[];
  defaultPresetId: string | undefined;
  isLoading: boolean;
  error: string | null;
  listPresets: () => Promise<void>;
  savePreset: (preset: ConfigPreset) => Promise<PresetOperationResult>;
  deletePreset: (presetId: string) => Promise<PresetOperationResult>;
  loadPreset: (presetId: string) => Promise<ConfigPreset | null>;
  setDefaultPreset: (presetId: string) => Promise<PresetOperationResult>;
  getDefaultPreset: () => Promise<ConfigPreset | null>;
  renamePreset: (presetId: string, newName: string) => Promise<PresetOperationResult>;
  updatePresetDescription: (
    presetId: string,
    description: string,
  ) => Promise<PresetOperationResult>;
  duplicatePreset: (presetId: string, newName: string) => Promise<PresetOperationResult>;
}

/**
 * Custom hook for managing presets via Electron IPC
 */
export function usePresets(): UsePresetsReturn {
  const [presets, setPresets] = useState<ConfigPreset[]>([]);
  const [defaultPresetId, setDefaultPresetId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get Electron IPC API
  const getApi = useCallback(() => {
    const api = (window as any).electronAPI?.preset;
    if (!api) {
      throw new Error('Electron Preset API not available');
    }
    return api;
  }, []);

  /**
   * List all presets
   */
  const listPresets = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const api = getApi();
      const response: PresetListResponse = await api.list();

      setPresets(response.presets);
      setDefaultPresetId(response.defaultPresetId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to list presets';
      setError(message);
      console.error('usePresets: Failed to list presets:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getApi]);

  /**
   * Save a preset (create or update)
   */
  const savePreset = useCallback(
    async (preset: ConfigPreset): Promise<PresetOperationResult> => {
      try {
        setError(null);
        const api = getApi();
        const result: PresetOperationResult = await api.save(preset);

        if (result.success) {
          // Refresh preset list after successful save
          await listPresets();
        } else {
          setError(result.error || 'Failed to save preset');
        }

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save preset';
        setError(message);
        console.error('usePresets: Failed to save preset:', err);
        return {
          success: false,
          error: message,
        };
      }
    },
    [getApi, listPresets],
  );

  /**
   * Delete a preset
   */
  const deletePreset = useCallback(
    async (presetId: string): Promise<PresetOperationResult> => {
      try {
        setError(null);
        const api = getApi();
        const result: PresetOperationResult = await api.delete(presetId);

        if (result.success) {
          // Refresh preset list after successful deletion
          await listPresets();
        } else {
          setError(result.error || 'Failed to delete preset');
        }

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete preset';
        setError(message);
        console.error('usePresets: Failed to delete preset:', err);
        return {
          success: false,
          error: message,
        };
      }
    },
    [getApi, listPresets],
  );

  /**
   * Load a specific preset
   */
  const loadPreset = useCallback(
    async (presetId: string): Promise<ConfigPreset | null> => {
      try {
        setError(null);
        const api = getApi();
        const preset: ConfigPreset | null = await api.load(presetId);
        return preset;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load preset';
        setError(message);
        console.error('usePresets: Failed to load preset:', err);
        return null;
      }
    },
    [getApi],
  );

  /**
   * Set default preset
   */
  const setDefaultPreset = useCallback(
    async (presetId: string): Promise<PresetOperationResult> => {
      try {
        setError(null);
        const api = getApi();
        const result: PresetOperationResult = await api.setDefault(presetId);

        if (result.success) {
          // Update default preset ID
          setDefaultPresetId(presetId);
          // Refresh preset list to update isDefault flag
          await listPresets();
        } else {
          setError(result.error || 'Failed to set default preset');
        }

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to set default preset';
        setError(message);
        console.error('usePresets: Failed to set default preset:', err);
        return {
          success: false,
          error: message,
        };
      }
    },
    [getApi, listPresets],
  );

  /**
   * Get default preset
   */
  const getDefaultPreset = useCallback(async (): Promise<ConfigPreset | null> => {
    try {
      setError(null);
      const api = getApi();
      const preset: ConfigPreset | null = await api.getDefault();
      return preset;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get default preset';
      setError(message);
      console.error('usePresets: Failed to get default preset:', err);
      return null;
    }
  }, [getApi]);

  /**
   * Rename a preset
   */
  const renamePreset = useCallback(
    async (presetId: string, newName: string): Promise<PresetOperationResult> => {
      try {
        setError(null);
        const api = getApi();
        const result: PresetOperationResult = await api.rename?.(presetId, newName) || {
          success: false,
          error: 'Rename operation not supported',
        };

        if (result.success) {
          await listPresets();
        } else {
          setError(result.error || 'Failed to rename preset');
        }

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to rename preset';
        setError(message);
        console.error('usePresets: Failed to rename preset:', err);
        return {
          success: false,
          error: message,
        };
      }
    },
    [getApi, listPresets],
  );

  /**
   * Update preset description
   */
  const updatePresetDescription = useCallback(
    async (presetId: string, description: string): Promise<PresetOperationResult> => {
      try {
        setError(null);
        const api = getApi();
        const result: PresetOperationResult = await api.updateDescription?.(
          presetId,
          description,
        ) || {
          success: false,
          error: 'Update description operation not supported',
        };

        if (result.success) {
          await listPresets();
        } else {
          setError(result.error || 'Failed to update preset description');
        }

        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update preset description';
        setError(message);
        console.error('usePresets: Failed to update preset description:', err);
        return {
          success: false,
          error: message,
        };
      }
    },
    [getApi, listPresets],
  );

  /**
   * Duplicate a preset
   */
  const duplicatePreset = useCallback(
    async (presetId: string, newName: string): Promise<PresetOperationResult> => {
      try {
        setError(null);
        const api = getApi();
        const result: PresetOperationResult = await api.duplicate?.(presetId, newName) || {
          success: false,
          error: 'Duplicate operation not supported',
        };

        if (result.success) {
          await listPresets();
        } else {
          setError(result.error || 'Failed to duplicate preset');
        }

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to duplicate preset';
        setError(message);
        console.error('usePresets: Failed to duplicate preset:', err);
        return {
          success: false,
          error: message,
        };
      }
    },
    [getApi, listPresets],
  );

  /**
   * Load presets on mount
   */
  useEffect(() => {
    listPresets();
  }, []);

  return {
    presets,
    defaultPresetId,
    isLoading,
    error,
    listPresets,
    savePreset,
    deletePreset,
    loadPreset,
    setDefaultPreset,
    getDefaultPreset,
    renamePreset,
    updatePresetDescription,
    duplicatePreset,
  };
}
