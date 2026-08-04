/**
 * reproducibility.ts
 *
 * Utilities for computing dataset SHA-256 hashes, git commit hashes,
 * and run metadata for reproducible benchmark execution.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { execSync } from 'child_process';

export class ReproducibilityUtils {
  /**
   * Compute a deterministic SHA-256 hash over the dataset directory structure and file sizes.
   */
  public static computeDatasetHash(datasetDir: string): string {
    const hash = crypto.createHash('sha256');

    try {
      if (fs.existsSync(datasetDir)) {
        const stats = fs.statSync(datasetDir);
        hash.update(`${datasetDir}_${stats.mtimeMs}_${stats.size}`);

        const gtDir = path.join(datasetDir, 'groundtruth');
        if (fs.existsSync(gtDir)) {
          const files = this.getAllFiles(gtDir);
          for (const f of files.sort()) {
            const fStat = fs.statSync(f);
            hash.update(`${f}_${fStat.size}_${fStat.mtimeMs}`);
          }
        }
      }
    } catch {
      hash.update(datasetDir);
    }

    return hash.digest('hex').substring(0, 16);
  }

  /**
   * Retrieve current Git commit hash or fallback string.
   */
  public static getGitCommit(): string {
    try {
      return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    } catch {
      return 'uncommitted_build';
    }
  }

  private static getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
      const fullPath = path.join(dirPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        arrayOfFiles = this.getAllFiles(fullPath, arrayOfFiles);
      } else {
        arrayOfFiles.push(fullPath);
      }
    });

    return arrayOfFiles;
  }
}
