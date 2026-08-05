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
   * Looks for per-profile sample files at: <datasetDir>/groundtruth/<sampleId>.json
   * These are flat files (not in subdirectories) named like DOC-xxxxx_clean.json.
   */
  public static discoverGroundTruthFiles(datasetDir: string): string[] {
    const absDir = path.resolve(datasetDir);
    const gtBaseDir = path.join(absDir, 'groundtruth');

    if (!fs.existsSync(gtBaseDir)) {
      return [];
    }

    const foundFiles: string[] = [];

    // Only read top-level JSON files (per-profile flat files), skip subdirectories
    const entries = fs.readdirSync(gtBaseDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        foundFiles.push(path.relative(absDir, path.join(gtBaseDir, entry.name)));
      }
    }

    return foundFiles.sort();
  }
}

