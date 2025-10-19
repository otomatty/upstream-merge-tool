import { ipcMain, BrowserWindow } from 'electron';
import { ConfigManager } from '@/config/ConfigManager';
import { Logger } from '@/logger/Logger';
import type { ConfigType } from '@shared/types/ipc';
import { writeFile } from 'fs/promises';

const logger = new Logger();
const configManager = new ConfigManager(logger);

export function registerConfigHandlers(mainWindow: BrowserWindow | null) {
  ipcMain.handle('config:load', async (_event, configPath: string): Promise<ConfigType> => {
    try {
      logger.info(`Loading config from: ${configPath}`);
      const config = await configManager.loadConfig(configPath);
      return config as ConfigType;
    } catch (error) {
      logger.error(`Failed to load config: ${error}`);
      throw error;
    }
  });

  ipcMain.handle('config:save', async (_event, configPath: string, config: ConfigType) => {
    try {
      logger.info(`Saving config to: ${configPath}`);
      await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
      logger.info('Config saved successfully');
    } catch (error) {
      logger.error(`Failed to save config: ${error}`);
      throw error;
    }
  });

  ipcMain.handle('config:validate', async (_event, config: Partial<ConfigType>) => {
    try {
      const result = configManager.validateConfig(config);
      return {
        isValid: result.isValid,
        errors: result.errors,
      };
    } catch (error) {
      logger.error(`Validation error: ${error}`);
      throw error;
    }
  });
}
