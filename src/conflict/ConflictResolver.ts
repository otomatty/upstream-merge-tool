import type { ConflictMarker } from '../types/conflict';
import type { Logger } from '../logger/Logger';
import type { GitService } from '../git/GitService';
import { readFileAsText, writeFile } from '../utils/runtime';

/**
 * ConflictResolver class for handling merge conflicts
 * Supports both Bun and Node.js runtimes
 * Part 1: Detect conflicts
 * Part 2: Check conditions for auto-resolution
 * Part 3: Perform auto-resolution
 */
export class ConflictResolver {
  constructor(private logger: Logger) {}

  /**
   * Part 1: Detect conflicts in a file
   * Parses conflict markers and returns structured conflict information
   */
  async detectConflicts(filePath: string): Promise<ConflictMarker[]> {
    try {
      this.logger.info(`Detecting conflicts in: ${filePath}`);

      // Read file content
      const fileContent = await readFileAsText(filePath);
      const conflicts = this.parseConflictMarkers(fileContent);

      this.logger.debug(`Found ${conflicts.length} conflict marker(s)`, { filePath });
      return conflicts;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to detect conflicts in ${filePath}: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Parse conflict markers from file content
   * Returns array of ConflictMarker objects
   */
  private parseConflictMarkers(content: string): ConflictMarker[] {
    const lines = content.split('\n');
    const conflicts: ConflictMarker[] = [];

    let i = 0;
    while (i < lines.length) {
      // Look for the start of a conflict marker
      if (lines[i]?.startsWith('<<<<<<<')) {
        const startLine = i;

        // Find the middle marker
        let markerLine = -1;
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j]?.startsWith('=======')) {
            markerLine = j;
            break;
          }
        }

        if (markerLine === -1) {
          // Malformed marker, skip
          i++;
          continue;
        }

        // Find the end marker
        let endLine = -1;
        for (let j = markerLine + 1; j < lines.length; j++) {
          if (lines[j]?.startsWith('>>>>>>>')) {
            endLine = j;
            break;
          }
        }

        if (endLine === -1) {
          // Malformed marker, skip
          i++;
          continue;
        }

        // Extract content
        const oursStart = startLine + 1;
        const oursEnd = markerLine - 1;
        const theirsStart = markerLine + 1;
        const theirsEnd = endLine - 1;

        const ours = lines.slice(oursStart, oursEnd + 1).join('\n');
        const theirs = lines.slice(theirsStart, theirsEnd + 1).join('\n');

        conflicts.push({
          startLine,
          markerLine,
          endLine,
          oursStart,
          oursEnd,
          theirsStart,
          theirsEnd,
          ours,
          theirs,
        });

        // Move past this conflict
        i = endLine + 1;
      } else {
        i++;
      }
    }

    return conflicts;
  }

  /**
   * Part 2: Check if upstream changed the file
   * Compares file between fromCommit and toCommit
   */
  async checkUpstreamChanges(
    filePath: string,
    fromCommit: string,
    toCommit: string,
    gitService: GitService
  ): Promise<boolean> {
    try {
      this.logger.info(
        `Checking upstream changes for ${filePath} between ${fromCommit} and ${toCommit}`
      );

      const diff = await gitService.getDiff(fromCommit, toCommit, filePath);

      // If diff is empty, upstream didn't change the file
      const hasChanges = diff.trim().length > 0;

      this.logger.debug(`Upstream changes detected: ${hasChanges}`);
      return hasChanges;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to check upstream changes: ${errorMessage}`);
      // On error, assume upstream changed the file (conservative approach)
      return true;
    }
  }

  /**
   * Part 2: Check if conflict is marked with custom code markers
   * Verifies that the conflict content is surrounded by custom markers
   */
  isMarkedAsCustom(
    fileContent: string,
    marker: ConflictMarker,
    startMarker: string,
    endMarker: string
  ): boolean {
    try {
      this.logger.debug('Checking if conflict is marked as custom code');

      // Get content around the conflict
      const lines = fileContent.split('\n');

      // Check if there's a line with the start marker before the conflict
      let hasStartMarker = false;
      for (let i = Math.max(0, marker.oursStart - 5); i < marker.oursStart; i++) {
        if (lines[i]?.includes(startMarker)) {
          hasStartMarker = true;
          break;
        }
      }

      // Check if there's a line with the end marker after the conflict
      let hasEndMarker = false;
      for (let i = marker.oursEnd + 1; i < Math.min(lines.length, marker.oursEnd + 6); i++) {
        if (lines[i]?.includes(endMarker)) {
          hasEndMarker = true;
          break;
        }
      }

      const isMarked = hasStartMarker && hasEndMarker;
      this.logger.debug(`Conflict marked as custom: ${isMarked}`, {
        hasStartMarker,
        hasEndMarker,
      });

      return isMarked;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to check custom markers: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Part 2: Unified check for auto-resolution conditions
   * Returns true only if all three conditions are met
   */
  canAutoResolve(condition1: boolean, condition2: boolean, condition3: boolean): boolean {
    const canResolve = condition1 && !condition2 && condition3;

    this.logger.info('Auto-resolution condition check', {
      condition1, // Conflict exists
      condition2_negated: !condition2, // Upstream did NOT change
      condition3, // File is marked as custom
      result: canResolve,
    });

    return canResolve;
  }

  /**
   * Part 3: Resolve a single conflict by removing conflict markers
   * Keeps the "ours" (our custom code) side and removes conflict markers
   * Also removes custom code markers if present
   */
  async resolveConflict(
    filePath: string,
    marker: ConflictMarker,
    startMarker?: string,
    endMarker?: string
  ): Promise<void> {
    try {
      this.logger.info(`Resolving conflict in: ${filePath}`);

      // Read file content
      const fileContent = await readFileAsText(filePath);

      // Remove conflict markers
      let resolvedContent = this.removeConflictMarkers(fileContent, marker);

      // Remove custom code markers if provided
      if (startMarker && endMarker) {
        resolvedContent = this.removeCustomCodeMarkers(resolvedContent, startMarker, endMarker);
      }

      // Write resolved content back
      await writeFile(filePath, resolvedContent);

      this.logger.info(`Conflict resolved in: ${filePath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to resolve conflict in ${filePath}: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Part 3: Remove conflict markers from content
   * Keeps the "ours" section and removes all conflict markers
   */
  private removeConflictMarkers(content: string, marker: ConflictMarker): string {
    const lines = content.split('\n');

    // Replace the conflicted section with just the "ours" content
    const newLines: string[] = [];

    // Add all lines before the conflict
    for (let i = 0; i < marker.startLine; i++) {
      newLines.push(lines[i] || '');
    }

    // Add the "ours" content (without the conflict markers)
    for (let i = marker.oursStart; i <= marker.oursEnd; i++) {
      newLines.push(lines[i] || '');
    }

    // Add all lines after the conflict
    for (let i = marker.endLine + 1; i < lines.length; i++) {
      newLines.push(lines[i] || '');
    }

    return newLines.join('\n');
  }

  /**
   * Remove custom code markers from content
   * Removes lines containing custom code start and end markers
   */
  private removeCustomCodeMarkers(content: string, startMarker: string, endMarker: string): string {
    const lines = content.split('\n');
    const result: string[] = [];

    let insideMarker = false;

    for (const line of lines) {
      if (line.includes(startMarker)) {
        insideMarker = true;
        // Skip the start marker line
        continue;
      }

      if (line.includes(endMarker)) {
        insideMarker = false;
        // Skip the end marker line
        continue;
      }

      if (!insideMarker) {
        result.push(line);
      }
    }

    return result.join('\n');
  }

  /**
   * Part 3: Resolve multiple conflicts in a file
   * Returns true if all conflicts were resolved
   * Also removes custom code markers after resolving conflicts
   */
  async resolveAllConflictsInFile(
    filePath: string,
    startMarker?: string,
    endMarker?: string
  ): Promise<boolean> {
    try {
      this.logger.info(`Resolving all conflicts in: ${filePath}`);

      const conflicts = await this.detectConflicts(filePath);

      if (conflicts.length === 0) {
        this.logger.info(`No conflicts found in: ${filePath}`);
        return true;
      }

      // Read file once for all resolutions
      let resolvedContent = await readFileAsText(filePath);

      // Process conflicts in reverse order to maintain line numbers
      for (let i = conflicts.length - 1; i >= 0; i--) {
        const marker = conflicts[i];
        if (marker) {
          resolvedContent = this.removeConflictMarkers(resolvedContent, marker);
        }
      }

      // Remove custom code markers if provided
      if (startMarker && endMarker) {
        resolvedContent = this.removeCustomCodeMarkers(resolvedContent, startMarker, endMarker);
      }

      // Write resolved content
      await writeFile(filePath, resolvedContent);

      this.logger.info(`All ${conflicts.length} conflict(s) resolved in: ${filePath}`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to resolve all conflicts in ${filePath}: ${errorMessage}`);
      return false;
    }
  }
}