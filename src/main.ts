import { Logger } from './logger/Logger';
import { ConfigManager } from './config/ConfigManager';
import { GitService } from './git/GitService';
import { ConflictResolver } from './conflict/ConflictResolver';
import { ReportGenerator } from './report/ReportGenerator';
import { readFileAsText } from './utils/runtime';
import type { ReportData } from './types/report';

/**
 * Main application entry point
 * Orchestrates the complete merge process:
 * Phase 1: Fetch and merge from upstream
 * Phase 2: Detect and auto-resolve conflicts
 * Phase 3: Generate reports and exit
 */
async function main(): Promise<void> {
  const logger = new Logger();
  const startTime = new Date();

  try {
    logger.info('=== Upstream Merge Tool Started ===');

    // Step 1: Load configuration
    const configManager = new ConfigManager(logger);
    const config = await configManager.loadConfig('./config.json');

    // Step 2: Verify git repository
    const gitService = new GitService(logger);
    const status = await gitService.getStatus();

    if (!status.isRepository) {
      throw new Error('Not in a git repository. Please run this tool from a git repository root.');
    }

    logger.info('Git repository verified. Current branch: ' + status.branch);

    if (status.isDirty) {
      logger.warn(
        'Working directory has uncommitted changes. Consider committing before merge.'
      );
    }

    // Step 3: Fetch from upstream
    logger.info('Fetching from upstream repository...');
    await gitService.fetch(config.upstream_repository_name);

    // Step 4: Attempt merge
    logger.info(
      'Starting merge of ' +
        config.upstream_repository_name +
        '/' +
        config.upstream_branch_name +
        '...'
    );
    const mergeResult = await gitService.merge(
      config.upstream_repository_name,
      config.upstream_branch_name
    );

    // Track resolved and unresolved conflicts
    const autoResolvedFiles: string[] = [];
    const manualRequiredFiles: string[] = [];

    // Step 5: Handle merge result
    if (mergeResult.success) {
      logger.info('✓ Merge completed successfully with no conflicts!');
    } else {
      if (mergeResult.error) {
        logger.error('Merge failed: ' + mergeResult.error);
        throw new Error(mergeResult.error);
      }

      logger.info(
        'Merge completed with ' + mergeResult.conflictFiles.length + ' conflicted file(s)'
      );
      logger.info('Conflicted files:', { files: mergeResult.conflictFiles });

      // Phase 2: Attempt to auto-resolve conflicts
      logger.info('Phase 2: Attempting to auto-resolve conflicts...');
      const conflictResolver = new ConflictResolver(logger);

      for (const filePath of mergeResult.conflictFiles) {
        try {
          logger.debug('Processing file: ' + filePath);

          // Detect conflicts in file
          const conflicts = await conflictResolver.detectConflicts(filePath);

          if (conflicts.length === 0) {
            logger.debug('No conflicts detected in: ' + filePath);
            autoResolvedFiles.push(filePath);
            continue;
          }

          // Check if we can auto-resolve
          let canResolveFile = true;
          const fileContent = await readFileAsText(filePath);

          for (const conflict of conflicts) {
            // Check conditions for auto-resolution
            const hasConflict = true; // Condition 1: always true here
            const hasUpstreamChanges = await conflictResolver.checkUpstreamChanges(
              filePath,
              config.last_merged_upstream_commit,
              config.upstream_repository_name + '/' + config.upstream_branch_name,
              gitService
            );
            const isMarkedAsCustom = conflictResolver.isMarkedAsCustom(
              fileContent,
              conflict,
              config.custom_code_marker.start,
              config.custom_code_marker.end
            );

            if (!conflictResolver.canAutoResolve(hasConflict, hasUpstreamChanges, isMarkedAsCustom)) {
              canResolveFile = false;
              logger.info(
                'Cannot auto-resolve conflict in ' +
                  filePath +
                  ' (does not meet all 3 conditions)'
              );
              break;
            }
          }

          if (canResolveFile) {
            // Resolve all conflicts in the file
            await conflictResolver.resolveAllConflictsInFile(filePath);
            await gitService.add(filePath);
            autoResolvedFiles.push(filePath);
            logger.info('✓ Auto-resolved: ' + filePath);
          } else {
            manualRequiredFiles.push(filePath);
            logger.info('✗ Manual resolution required: ' + filePath);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error('Error processing ' + filePath + ': ' + errorMessage);
          manualRequiredFiles.push(filePath);
        }
      }

      logger.info(
        'Auto-resolution complete: ' +
          autoResolvedFiles.length +
          ' resolved, ' +
          manualRequiredFiles.length +
          ' manual required'
      );
    }

    // Phase 3: Generate report
    logger.info('Phase 3: Generating report...');
    const reportGenerator = new ReportGenerator(logger);

    const reportData: ReportData = {
      startTime,
      endTime: new Date(),
      autoResolvedCount: autoResolvedFiles.length,
      manualRequiredCount: manualRequiredFiles.length,
      totalConflictCount: autoResolvedFiles.length + manualRequiredFiles.length,
      autoResolvedFiles,
      manualRequiredFiles,
      success: manualRequiredFiles.length === 0 && mergeResult.success,
    };

    const summary = reportGenerator.generateCLISummary(reportData);
    console.log(summary);

    await reportGenerator.generateLogFile(reportData, logger.getLogs());

    logger.info('=== Upstream Merge Tool Completed ===');
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Unexpected error: ' + errorMessage);
    logger.error('=== Upstream Merge Tool Failed ===');

    // Print all logs for debugging
    logger.printLogs();

    process.exit(1);
  }
}

main();
