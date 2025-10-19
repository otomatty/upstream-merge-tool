import { ipcMain, BrowserWindow } from 'electron';
import { GitService } from '@/git/GitService';
import { Logger } from '@/logger/Logger';
import type { MergeResult } from '@shared/types/ipc';
import { executeCommand } from '@/utils/runtime';

const logger = new Logger();
const gitService = new GitService(logger);

export function registerGitHandlers(mainWindow: BrowserWindow | null) {
  ipcMain.handle('git:fetch', async (_event, remote: string) => {
    try {
      logger.info(`Fetching from remote: ${remote}`);
      mainWindow?.webContents.send('git:progress', {
        type: 'fetch',
        status: 'started',
        message: `Fetching from ${remote}...`,
      });

      await gitService.fetch(remote);

      mainWindow?.webContents.send('git:progress', {
        type: 'fetch',
        status: 'completed',
        message: 'Fetch completed',
      });

      logger.info('Fetch completed successfully');
    } catch (error) {
      logger.error(`Fetch failed: ${error}`);
      mainWindow?.webContents.send('git:progress', {
        type: 'fetch',
        status: 'error',
        message: `Fetch failed: ${error}`,
      });
      throw error;
    }
  });

  ipcMain.handle('git:checkout', async (_event, branchName: string): Promise<void> => {
    try {
      logger.info(`Checking out branch: ${branchName}`);
      mainWindow?.webContents.send('git:progress', {
        type: 'checkout',
        status: 'started',
        message: `Checking out branch: ${branchName}...`,
      });

      await gitService.checkout(branchName);

      mainWindow?.webContents.send('git:progress', {
        type: 'checkout',
        status: 'completed',
        message: `Successfully checked out branch: ${branchName}`,
      });

      logger.info(`Checkout completed for branch: ${branchName}`);
    } catch (error) {
      logger.error(`Checkout failed: ${error}`);
      mainWindow?.webContents.send('git:progress', {
        type: 'checkout',
        status: 'error',
        message: `Checkout failed: ${error}`,
      });
      throw error;
    }
  });

  ipcMain.handle('git:merge', async (_event, remote: string, branch: string): Promise<MergeResult> => {
    try {
      logger.info(`Starting merge: ${remote}/${branch}`);
      mainWindow?.webContents.send('git:progress', {
        type: 'merge',
        status: 'started',
        message: `Starting merge from ${remote}/${branch}...`,
      });

      const result = await gitService.merge(remote, branch);

      mainWindow?.webContents.send('git:progress', {
        type: 'merge',
        status: 'completed',
        message: `Merge completed. Conflicts: ${result.conflictFiles.length}`,
        conflictCount: result.conflictFiles.length,
      });

      logger.info(`Merge completed. Conflicts: ${result.conflictFiles.length}`);
      return result;
    } catch (error) {
      logger.error(`Merge failed: ${error}`);
      mainWindow?.webContents.send('git:progress', {
        type: 'merge',
        status: 'error',
        message: `Merge failed: ${error}`,
      });
      throw error;
    }
  });

  ipcMain.handle('git:status', async () => {
    try {
      const status = await gitService.getStatus();
      return status;
    } catch (error) {
      logger.error(`Status failed: ${error}`);
      throw error;
    }
  });

  ipcMain.handle('git:add', async (_event, files: string[]) => {
    try {
      logger.info(`Staging files: ${files.join(', ')}`);
      mainWindow?.webContents.send('git:progress', {
        type: 'add',
        status: 'started',
        message: `Staging ${files.length} files...`,
      });

      for (const file of files) {
        const result = await executeCommand(`git add "${file}"`);
        if (result.exitCode !== 0) {
          throw new Error(`Failed to add file ${file}: ${result.stderr}`);
        }
      }

      mainWindow?.webContents.send('git:progress', {
        type: 'add',
        status: 'completed',
        message: `Staged ${files.length} files`,
      });

      logger.info('Files staged successfully');
    } catch (error) {
      logger.error(`Add failed: ${error}`);
      mainWindow?.webContents.send('git:progress', {
        type: 'add',
        status: 'error',
        message: `Staging failed: ${error}`,
      });
      throw error;
    }
  });

  ipcMain.handle('git:commit', async (_event, message: string) => {
    try {
      logger.info(`Committing with message: ${message}`);
      mainWindow?.webContents.send('git:progress', {
        type: 'commit',
        status: 'started',
        message: 'Committing changes...',
      });

      const result = await executeCommand(`git commit -m "${message}"`);
      if (result.exitCode !== 0) {
        throw new Error(`Commit failed: ${result.stderr}`);
      }

      mainWindow?.webContents.send('git:progress', {
        type: 'commit',
        status: 'completed',
        message: 'Commit completed',
      });

      logger.info('Commit completed successfully');
    } catch (error) {
      logger.error(`Commit failed: ${error}`);
      mainWindow?.webContents.send('git:progress', {
        type: 'commit',
        status: 'error',
        message: `Commit failed: ${error}`,
      });
      throw error;
    }
  });
}
