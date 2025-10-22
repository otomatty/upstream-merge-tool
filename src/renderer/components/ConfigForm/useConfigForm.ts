import { useState, useCallback, useEffect } from 'react';
import type { ConfigType } from '@shared/types/ipc';

interface UseConfigFormReturn {
  config: ConfigType;
  errors: string[];
  isValid: boolean;
  isLoading: boolean;
  updateConfig: (updates: Partial<ConfigType>) => void;
  validate: () => Promise<boolean>;
  loadFromFile: (filePath: string) => Promise<void>;
  saveToFile: (filePath: string) => Promise<void>;
  reset: (newConfig?: ConfigType) => void;
}

/**
 * Custom hook for managing configuration form state and validation
 */
export function useConfigForm(initialConfig?: ConfigType): UseConfigFormReturn {
  const [config, setConfig] = useState<ConfigType>(
    initialConfig || getDefaultConfig(),
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Update configuration
  const updateConfig = useCallback((updates: Partial<ConfigType>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  // Validate configuration
  const validate = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const validationResult = await window.electronAPI?.config?.validate?.(
        config,
      );

      if (validationResult) {
        const isValid = validationResult.valid;
        const errorList = validationResult.errors || [];
        setErrors(errorList);
        setIsValid(isValid);
        return isValid;
      }

      setIsValid(false);
      setErrors(['Validation not available']);
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Validation failed';
      setErrors([message]);
      setIsValid(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  // Load configuration from file
  const loadFromFile = useCallback(async (filePath: string) => {
    try {
      setIsLoading(true);
      const loadedConfig = await window.electronAPI?.config?.load?.(filePath);

      if (loadedConfig) {
        setConfig(loadedConfig);
        setErrors([]);
      } else {
        setErrors(['Failed to load configuration from file']);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Load failed';
      setErrors([message]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save configuration to file
  const saveToFile = useCallback(async (filePath: string) => {
    try {
      setIsLoading(true);

      // Validate before saving
      const isValid = await validate();
      if (!isValid) {
        throw new Error('Configuration is not valid. Please fix errors before saving.');
      }

      await window.electronAPI?.config?.save?.(filePath, config);
      setErrors([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Save failed';
      setErrors([message]);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [config, validate]);

  // Reset configuration
  const reset = useCallback((newConfig?: ConfigType) => {
    setConfig(newConfig || getDefaultConfig());
    setErrors([]);
    setIsValid(false);
  }, []);

  return {
    config,
    errors,
    isValid,
    isLoading,
    updateConfig,
    validate,
    loadFromFile,
    saveToFile,
    reset,
  };
}

/**
 * Get default configuration object
 */
function getDefaultConfig(): ConfigType {
  return {
    upstream_repository_name: '',
    upstream_branch_name: '',
    last_merged_upstream_commit: '',
    merge_target_branch: 'main',
    custom_code_marker: {
      start: '## BEGIN CUSTOM CODE SECTION',
      end: '## END CUSTOM CODE SECTION',
    },
    upstream_version_tracking: {
      enabled: true,
      type: 'tag',
      value: '',
    },
  };
}
