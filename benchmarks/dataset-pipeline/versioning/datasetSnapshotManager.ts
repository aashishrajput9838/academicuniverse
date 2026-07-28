/**
 * Academic Universe — Dataset Snapshot & Version Manager
 * Manages dataset versioning, immutable snapshots, rollbacks, and change logs.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DatasetManifest, DatasetSnapshot } from '../types/dataset.types';

export class DatasetSnapshotManager {
  private benchmarkRoot: string;
  private manifestPath: string;
  private snapshotsDir: string;
  private snapshotsLogPath: string;

  constructor(benchmarkRoot: string) {
    this.benchmarkRoot = benchmarkRoot;
    this.manifestPath = path.join(benchmarkRoot, 'dataset-pipeline', 'manifests', 'dataset_manifest.json');
    this.snapshotsDir = path.join(benchmarkRoot, 'dataset-pipeline', 'versions', 'snapshots');
    this.snapshotsLogPath = path.join(benchmarkRoot, 'dataset-pipeline', 'versions', 'snapshots.json');
    if (!fs.existsSync(this.snapshotsDir)) {
      fs.mkdirSync(this.snapshotsDir, { recursive: true });
    }
  }

  /** Create an immutable snapshot of the current dataset manifest and annotations */
  createSnapshot(version: string, createdBy: string, notes: string): DatasetSnapshot {
    if (!fs.existsSync(this.manifestPath)) {
      throw new Error(`Manifest not found at ${this.manifestPath}`);
    }

    const manifestContent = fs.readFileSync(this.manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent) as DatasetManifest;
    const manifestChecksum = crypto.createHash('sha256').update(manifestContent).digest('hex');

    const snapshotId = `SNAP_${version.replace(/\./g, '_')}_${Date.now()}`;
    const snapshotDir = path.join(this.snapshotsDir, snapshotId);
    fs.mkdirSync(snapshotDir, { recursive: true });

    // Copy manifest into snapshot dir
    fs.writeFileSync(path.join(snapshotDir, 'dataset_manifest.json'), manifestContent, 'utf-8');

    // Create snapshot manifest entry
    const snapshot: DatasetSnapshot = {
      snapshotId,
      datasetVersion: version,
      createdAt: new Date().toISOString(),
      createdBy,
      totalDocuments: manifest.totalDocuments,
      manifestChecksum,
      notes,
    };

    // Update snapshots history log
    const history = this.listSnapshots();
    history.push(snapshot);
    fs.writeFileSync(this.snapshotsLogPath, JSON.stringify(history, null, 2), 'utf-8');

    // Also update main manifest's datasetVersion
    manifest.datasetVersion = version;
    manifest.updatedAt = new Date().toISOString();
    fs.writeFileSync(this.manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    return snapshot;
  }

  /** List all historical snapshots */
  listSnapshots(): DatasetSnapshot[] {
    if (!fs.existsSync(this.snapshotsLogPath)) {
      return [];
    }
    try {
      return JSON.parse(fs.readFileSync(this.snapshotsLogPath, 'utf-8')) as DatasetSnapshot[];
    } catch {
      return [];
    }
  }

  /** Rollback main manifest to a specific snapshot version */
  rollback(snapshotId: string): DatasetSnapshot {
    const snapshots = this.listSnapshots();
    const target = snapshots.find((s) => s.snapshotId === snapshotId || s.datasetVersion === snapshotId);
    if (!target) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }

    const snapshotManifestPath = path.join(this.snapshotsDir, target.snapshotId, 'dataset_manifest.json');
    if (!fs.existsSync(snapshotManifestPath)) {
      throw new Error(`Snapshot files missing for ${target.snapshotId}`);
    }

    const content = fs.readFileSync(snapshotManifestPath, 'utf-8');
    fs.writeFileSync(this.manifestPath, content, 'utf-8');

    return target;
  }
}
