import { ipcMain, dialog, BrowserWindow } from 'electron';
import { Logger } from '@/logger/Logger';

const logger = new Logger();

export function registerFileHandlers(mainWindow: BrowserWindow | null) {
  ipcMain.handle('file:openFile', async (_event, options: any) => {
    try {
      if (!mainWindow) {
        throw new Error('Main window not available');
      }

      logger.info('Opening file dialog');

      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Config File',
        filters: options.filters || [{ name: 'JSON Files', extensions: ['json'] }],
        properties: options.properties || ['openFile'],
      });

      logger.info(`File dialog result: ${result.filePaths.length} file(s) selected`);

      return {
        canceled: result.canceled,
        filePaths: result.filePaths,
      };
    } catch (error) {
      logger.error(`File dialog error: ${error}`);
      throw error;
    }
  });
}
