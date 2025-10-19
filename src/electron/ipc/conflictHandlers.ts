import { ipcMain } from 'electron';
import { ConflictResolver } from '@/conflict/ConflictResolver';
import { Logger } from '@/logger/Logger';
import type { ConflictFile } from '@shared/types/ipc';
import { executeCommand } from '@/utils/runtime';

const logger = new Logger();
const conflictResolver = new ConflictResolver(logger);

let currentConflicts: ConflictFile[] = [];

export function registerConflictHandlers() {
  ipcMain.handle('conflict:list', async (): Promise<ConflictFile[]> => {
    try {
      logger.info('Fetching conflict list');
      
      // Get list of conflicted files from git status
      const result = await executeCommand('git diff --name-only --diff-filter=U');
      if (result.exitCode !== 0) {
        logger.warn('No conflicted files found');
        return [];
      }

      const conflictedFiles = result.stdout
        .split('\n')
        .filter((f: string) => f.trim().length > 0);

      const conflicts: ConflictFile[] = [];
      for (const filePath of conflictedFiles) {
        try {
          const fileConflicts = await conflictResolver.detectConflicts(filePath);
          conflicts.push({
            id: filePath,
            path: filePath,
            status: 'manual-required', // Will be updated to 'auto-resolvable' if applicable
            conflicts: fileConflicts.map((c: any) => ({
              id: `${filePath}-${c.startLine}`,
              lineStart: c.startLine,
              lineEnd: c.endLine,
              upstream: { start: 0, end: 0, content: c.theirContent || '' },
              local: { start: 0, end: 0, content: c.ourContent || '' },
              canAutoResolve: false,
            })),
          });
        } catch (error) {
          logger.warn(`Failed to detect conflicts in ${filePath}: ${error}`);
        }
      }

      currentConflicts = conflicts;
      return conflicts;
    } catch (error) {
      logger.error(`Failed to list conflicts: ${error}`);
      throw error;
    }
  });

  ipcMain.handle('conflict:getDiff', async (_event, filePath: string) => {
    try {
      logger.info(`Getting diff for: ${filePath}`);
      // TODO: Implement diff retrieval
      return {
        file: filePath,
        upstream: [],
        local: [],
      };
    } catch (error) {
      logger.error(`Failed to get diff: ${error}`);
      throw error;
    }
  });

  ipcMain.handle('conflict:resolve', async (
    _event,
    fileId: string,
    strategy: 'upstream' | 'local' | 'both'
  ) => {
    try {
      logger.info(`Resolving conflict: ${fileId} with strategy: ${strategy}`);
      
      let command = '';
      switch (strategy) {
        case 'upstream':
          command = `git checkout --theirs "${fileId}"`;
          break;
        case 'local':
          command = `git checkout --ours "${fileId}"`;
          break;
        case 'both':
          // Both means keep the conflict markers resolved manually
          command = '';
          break;
      }

      if (command) {
        const result = await executeCommand(command);
        if (result.exitCode !== 0) {
          throw new Error(`Failed to resolve conflict: ${result.stderr}`);
        }
      }

      logger.info('Conflict resolved');
    } catch (error) {
      logger.error(`Failed to resolve conflict: ${error}`);
      throw error;
    }
  });
}
