import { ipcMain, BrowserWindow, app } from 'electron';
import { ConfigManager } from '@/config/ConfigManager';
import { Logger } from '@/logger/Logger';
import type { ConfigType } from '@shared/types/ipc';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const logger = new Logger();
const configManager = new ConfigManager(logger);

// ユーザー設定ディレクトリのパス
const getUserSettingsPath = () => join(app.getPath('userData'), 'settings');
const getDefaultConfigPath = () => join(getUserSettingsPath(), 'default-config.json');

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

  // デフォルト設定ファイルのパスを保存
  ipcMain.handle('config:setDefaultPath', async (_event, configPath: string) => {
    try {
      logger.info(`Setting default config path: ${configPath}`);
      const settingsPath = getUserSettingsPath();
      
      // settings ディレクトリが存在しない場合は作成
      if (!existsSync(settingsPath)) {
        await mkdir(settingsPath, { recursive: true });
      }

      const defaultSettings = { defaultConfigPath: configPath };
      await writeFile(getDefaultConfigPath(), JSON.stringify(defaultSettings, null, 2), 'utf-8');
      logger.info('Default config path saved successfully');
    } catch (error) {
      logger.error(`Failed to save default config path: ${error}`);
      throw error;
    }
  });

  // デフォルト設定ファイルのパスを取得
  ipcMain.handle('config:getDefaultPath', async (_event): Promise<string | null> => {
    try {
      const defaultConfigPath = getDefaultConfigPath();
      if (!existsSync(defaultConfigPath)) {
        return null;
      }

      const content = await readFile(defaultConfigPath, 'utf-8');
      const settings = JSON.parse(content);
      
      // デフォルトファイルが実際に存在するかチェック
      if (settings.defaultConfigPath && existsSync(settings.defaultConfigPath)) {
        logger.info(`Found default config path: ${settings.defaultConfigPath}`);
        return settings.defaultConfigPath;
      }
      
      return null;
    } catch (error) {
      logger.error(`Failed to get default config path: ${error}`);
      return null;
    }
  });

  // デフォルト設定をクリア
  ipcMain.handle('config:clearDefault', async (_event) => {
    try {
      const defaultConfigPath = getDefaultConfigPath();
      if (existsSync(defaultConfigPath)) {
        await writeFile(defaultConfigPath, JSON.stringify({ defaultConfigPath: null }, null, 2), 'utf-8');
        logger.info('Default config path cleared');
      }
    } catch (error) {
      logger.error(`Failed to clear default config path: ${error}`);
      throw error;
    }
  });
}
