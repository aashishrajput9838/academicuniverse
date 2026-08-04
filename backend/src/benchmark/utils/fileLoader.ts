/**
 * fileLoader.ts
 *
 * Dataset directory inspection utilities for discovering ground truth and prediction samples.
 */

import * as fs from 'fs';
import * as path from 'path';

export class DatasetFileLoader {
  /**
   * Discover all Ground Truth JSON file paths within a given dataset directory.
   */
  public static discoverGroundTruthFiles(datasetDir: string): string[] {
    const absDir = path.resolve(datasetDir);
    const gtBaseDir = path.join(absDir, 'groundtruth');

    if (!fs.existsSync(gtBaseDir)) {
      return [];
    }

    const foundFiles: string[] = [];
    const walk = (currentPath: string) => {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(currentPath, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          foundFiles.push(path.relative(absDir, full));
        }
      }
    };

    walk(gtBaseDir);
    return foundFiles.sort();
  }
}
