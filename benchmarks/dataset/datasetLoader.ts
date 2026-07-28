/**
 * Academic Universe — Dataset Loader
 * Loads, validates, filters, and serves benchmark documents from the dataset directory.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  BenchmarkDocument,
  BenchmarkManifest,
  DocumentCategory,
  SupportedFileFormat,
} from '../types/benchmark.types';
import { BenchmarkConfig } from '../config/benchmark.config';

const SUPPORTED_EXTENSIONS: SupportedFileFormat[] = ['pdf', 'png', 'jpeg', 'jpg'];

export class DatasetLoader {
  private config: BenchmarkConfig;
  private manifest: BenchmarkManifest | null = null;

  constructor(config: BenchmarkConfig) {
    this.config = config;
  }

  /**
   * Load manifest from disk. If no manifest exists, scan the dataset directory
   * and build one automatically.
   */
  async loadManifest(): Promise<BenchmarkManifest> {
    if (fs.existsSync(this.config.manifestPath)) {
      const raw = fs.readFileSync(this.config.manifestPath, 'utf-8');
      this.manifest = JSON.parse(raw) as BenchmarkManifest;
    } else {
      this.manifest = await this.buildManifestFromDirectory();
      this.saveManifest(this.manifest);
    }
    return this.manifest;
  }

  /**
   * Scan dataset directory and build a manifest from the folder structure.
   * Expected layout:
   *   dataset/Category_1_Marksheets/MS_ORG01_001.pdf
   *   ground-truth/MS_ORG01_001.json
   */
  private async buildManifestFromDirectory(): Promise<BenchmarkManifest> {
    const documents: BenchmarkDocument[] = [];
    const datasetDir = this.config.datasetDir;

    if (!fs.existsSync(datasetDir)) {
      throw new Error(`Dataset directory not found: ${datasetDir}`);
    }

    const categoryDirs = fs.readdirSync(datasetDir).filter((d) => {
      const full = path.join(datasetDir, d);
      return fs.statSync(full).isDirectory() && !d.startsWith('.');
    });

    for (const catDir of categoryDirs) {
      const category = this.inferCategory(catDir);
      const catPath = path.join(datasetDir, catDir);
      const files = fs.readdirSync(catPath);

      for (const file of files) {
        const ext = path.extname(file).slice(1).toLowerCase() as SupportedFileFormat;
        if (!SUPPORTED_EXTENSIONS.includes(ext)) continue;

        const docId = path.basename(file, path.extname(file));
        const filePath = path.join(catPath, file);
        const stat = fs.statSync(filePath);
        const checksum = await this.computeSha256(filePath);
        const gtPath = path.join(this.config.groundTruthDir, `${docId}.json`);

        documents.push({
          documentId: docId,
          category,
          filePath,
          fileFormat: ext,
          fileSizeBytes: stat.size,
          checksumSha256: checksum,
          qualityLevel: this.inferQuality(catDir),
          groundTruthPath: gtPath,
        });
      }
    }

    return {
      manifestVersion: '1.0.0',
      createdAt: new Date().toISOString(),
      totalDocuments: documents.length,
      documents,
    };
  }

  private saveManifest(manifest: BenchmarkManifest): void {
    const dir = path.dirname(this.config.manifestPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.config.manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  }

  /** Filter documents by category */
  filterByCategory(category: DocumentCategory): BenchmarkDocument[] {
    if (!this.manifest) throw new Error('Manifest not loaded. Call loadManifest() first.');
    return this.manifest.documents.filter((d) => d.category === category);
  }

  /** Random sample of n documents */
  sample(n: number, seed: number = 42): BenchmarkDocument[] {
    if (!this.manifest) throw new Error('Manifest not loaded. Call loadManifest() first.');
    const docs = [...this.manifest.documents];
    // Seeded Fisher-Yates shuffle
    const rng = this.seededRng(seed);
    for (let i = docs.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [docs[i], docs[j]] = [docs[j], docs[i]];
    }
    return docs.slice(0, Math.min(n, docs.length));
  }

  /** Validate every document: file exists, checksum matches, ground truth exists */
  async validate(): Promise<{ valid: BenchmarkDocument[]; invalid: { doc: BenchmarkDocument; reason: string }[] }> {
    if (!this.manifest) throw new Error('Manifest not loaded. Call loadManifest() first.');
    const valid: BenchmarkDocument[] = [];
    const invalid: { doc: BenchmarkDocument; reason: string }[] = [];

    for (const doc of this.manifest.documents) {
      if (!fs.existsSync(doc.filePath)) {
        invalid.push({ doc, reason: `File not found: ${doc.filePath}` });
        continue;
      }
      if (!fs.existsSync(doc.groundTruthPath)) {
        invalid.push({ doc, reason: `Ground truth not found: ${doc.groundTruthPath}` });
        continue;
      }
      const checksum = await this.computeSha256(doc.filePath);
      if (checksum !== doc.checksumSha256) {
        invalid.push({ doc, reason: `Checksum mismatch (expected ${doc.checksumSha256}, got ${checksum})` });
        continue;
      }
      // Check for zero-byte / corrupt files
      const stat = fs.statSync(doc.filePath);
      if (stat.size === 0) {
        invalid.push({ doc, reason: 'File is 0 bytes (corrupt)' });
        continue;
      }
      valid.push(doc);
    }
    return { valid, invalid };
  }

  /** Detect duplicate files by checksum */
  detectDuplicates(): Map<string, BenchmarkDocument[]> {
    if (!this.manifest) throw new Error('Manifest not loaded. Call loadManifest() first.');
    const checksumMap = new Map<string, BenchmarkDocument[]>();
    for (const doc of this.manifest.documents) {
      const existing = checksumMap.get(doc.checksumSha256) || [];
      existing.push(doc);
      checksumMap.set(doc.checksumSha256, existing);
    }
    // Return only groups with duplicates
    const dupes = new Map<string, BenchmarkDocument[]>();
    for (const [hash, docs] of checksumMap) {
      if (docs.length > 1) dupes.set(hash, docs);
    }
    return dupes;
  }

  /** Load document file buffer */
  loadFileBuffer(doc: BenchmarkDocument): Buffer {
    return fs.readFileSync(doc.filePath);
  }

  /** Batch load documents for a given list */
  batchLoad(docs: BenchmarkDocument[]): Array<{ doc: BenchmarkDocument; buffer: Buffer }> {
    return docs.map((doc) => ({ doc, buffer: this.loadFileBuffer(doc) }));
  }

  // --- Helpers ---

  private async computeSha256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  private inferCategory(dirName: string): DocumentCategory {
    const lower = dirName.toLowerCase();
    if (lower.includes('marksheet')) return 'MARKSHEET';
    if (lower.includes('certificate')) return 'CERTIFICATE';
    if (lower.includes('timetable') || lower.includes('schedule')) return 'TIMETABLE';
    if (lower.includes('transcript')) return 'TRANSCRIPT';
    if (lower.includes('admit')) return 'ADMIT_CARD';
    if (lower.includes('receipt') || lower.includes('fee')) return 'FEE_RECEIPT';
    if (lower.includes('student_id') || lower.includes('id')) return 'STUDENT_ID';
    return 'EDGE_CASE';
  }

  private inferQuality(dirName: string): 'HIGH' | 'MEDIUM' | 'LOW' | 'SCANNED' {
    const lower = dirName.toLowerCase();
    if (lower.includes('edge') || lower.includes('low')) return 'LOW';
    if (lower.includes('scan')) return 'SCANNED';
    return 'HIGH';
  }

  private seededRng(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }
}
