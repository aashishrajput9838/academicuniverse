/**
 * Academic Universe — Dataset Importer
 * Imports documents into the dataset pipeline:
 *   • Assigns canonical documentId
 *   • Computes SHA-256 checksum
 *   • Extracts metadata (size, format, resolution hints)
 *   • Creates blank ground-truth annotation template
 *   • Updates dataset manifest
 *   • Logs audit trail
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  DocumentCategory,
  FileFormat,
  QualityLevel,
  ConsentStatus,
  DocumentMetadata,
  ManifestEntry,
  DatasetManifest,
  AnnotationStatus,
} from '../types/dataset.types';
import { createBlankAnnotation, GROUND_TRUTH_SCHEMA_VERSION } from '../schemas/groundTruth.schema';

const SUPPORTED_FORMATS: FileFormat[] = ['pdf', 'png', 'jpeg', 'jpg'];
const CATEGORY_PREFIX_MAP: Record<DocumentCategory, string> = {
  MARKSHEET: 'MS',
  CERTIFICATE: 'CERT',
  TIMETABLE: 'TT',
  EDGE_CASE: 'EC',
};

export interface ImportOptions {
  /** Path to the source document file */
  sourcePath: string;
  category: DocumentCategory;
  qualityLevel: QualityLevel;
  universityOrigin: string;
  consentStatus: ConsentStatus;
  annotatorId: string;
  layoutVariant?: string;
  scanMethod?: string;
  academicYear?: string;
  language?: string;
  notes?: string;
}

export interface ImportResult {
  documentId: string;
  success: boolean;
  destinationPath: string;
  groundTruthPath: string;
  metadataPath: string;
  errorMessage?: string;
}

export class DatasetImporter {
  private datasetRoot: string;
  private groundTruthDir: string;
  private metadataDir: string;
  private manifestPath: string;
  private auditLogPath: string;

  constructor(benchmarkRoot: string) {
    this.datasetRoot = path.join(benchmarkRoot, 'dataset');
    this.groundTruthDir = path.join(benchmarkRoot, 'ground-truth');
    this.metadataDir = path.join(benchmarkRoot, 'dataset-pipeline', 'metadata');
    this.manifestPath = path.join(benchmarkRoot, 'dataset-pipeline', 'manifests', 'dataset_manifest.json');
    this.auditLogPath = path.join(benchmarkRoot, 'dataset-pipeline', 'validation', 'import_audit.jsonl');
    this.ensureDirs();
  }

  /** Import a single document into the dataset pipeline */
  async importDocument(opts: ImportOptions): Promise<ImportResult> {
    const startTime = Date.now();

    // 1. Validate source file
    if (!fs.existsSync(opts.sourcePath)) {
      return this.failResult('', `Source file not found: ${opts.sourcePath}`);
    }

    const ext = path.extname(opts.sourcePath).slice(1).toLowerCase() as FileFormat;
    if (!SUPPORTED_FORMATS.includes(ext)) {
      return this.failResult('', `Unsupported format: ${ext}. Allowed: ${SUPPORTED_FORMATS.join(', ')}`);
    }

    // 2. Compute SHA-256 checksum
    const checksum = await this.computeSha256(opts.sourcePath);

    // 3. Check for duplicates
    const manifest = this.loadManifest();
    const duplicate = manifest.entries.find((e) => e.checksumSha256 === checksum);
    if (duplicate) {
      return this.failResult('', `Duplicate document detected — matches existing: ${duplicate.documentId}`);
    }

    // 4. Generate canonical documentId
    const docIndex = (manifest.totalDocuments + 1).toString().padStart(3, '0');
    const orgCode = opts.universityOrigin.replace(/\s+/g, '').slice(0, 6).toUpperCase();
    const prefix = CATEGORY_PREFIX_MAP[opts.category];
    const documentId = `${prefix}_${orgCode}_${docIndex}`;

    // 5. Define destination paths
    const categoryDir = this.categoryDirName(opts.category);
    const destFilename = `${documentId}.${ext}`;
    const destDir = path.join(this.datasetRoot, categoryDir);
    const destPath = path.join(destDir, destFilename);
    const gtPath = path.join(this.groundTruthDir, `${documentId}.json`);
    const metaPath = path.join(this.metadataDir, `${documentId}.json`);

    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

    // 6. Copy file to destination
    fs.copyFileSync(opts.sourcePath, destPath);
    const stat = fs.statSync(destPath);

    // 7. Write metadata
    const metadata: DocumentMetadata = {
      documentId,
      originalFilename: path.basename(opts.sourcePath),
      category: opts.category,
      fileFormat: ext,
      fileSizeBytes: stat.size,
      checksumSha256: checksum,
      qualityLevel: opts.qualityLevel,
      universityOrigin: opts.universityOrigin,
      language: opts.language || 'en',
      layoutVariant: opts.layoutVariant || 'unknown',
      scanMethod: opts.scanMethod,
      academicYear: opts.academicYear,
      consentStatus: opts.consentStatus,
      consentRef: opts.consentStatus === 'SYNTHETIC' ? 'SYNTHETIC' : undefined,
      piiMasked: opts.consentStatus === 'ANONYMIZED',
      importedAt: new Date().toISOString(),
      importedBy: opts.annotatorId,
      notes: opts.notes,
    };
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');

    // 8. Create blank ground truth annotation template
    const blankGT = createBlankAnnotation(documentId, opts.category, opts.annotatorId);
    fs.writeFileSync(gtPath, JSON.stringify(blankGT, null, 2), 'utf-8');

    // 9. Update manifest
    const entry: ManifestEntry = {
      documentId,
      category: opts.category,
      relativeFilePath: path.join(categoryDir, destFilename),
      groundTruthPath: `${documentId}.json`,
      metadataPath: `${documentId}.json`,
      checksumSha256: checksum,
      annotationStatus: 'PENDING',
      qualityLevel: opts.qualityLevel,
      importedAt: new Date().toISOString(),
    };
    manifest.entries.push(entry);
    manifest.totalDocuments = manifest.entries.length;
    manifest.updatedAt = new Date().toISOString();
    this.saveManifest(manifest);

    // 10. Write audit log
    this.writeAudit({
      action: 'IMPORT',
      documentId,
      sourcePath: opts.sourcePath,
      destPath,
      checksum,
      durationMs: Date.now() - startTime,
      operator: opts.annotatorId,
      timestamp: new Date().toISOString(),
    });

    return {
      documentId,
      success: true,
      destinationPath: destPath,
      groundTruthPath: gtPath,
      metadataPath: metaPath,
    };
  }

  /** Batch import all files from a source directory */
  async importDirectory(
    sourceDir: string,
    category: DocumentCategory,
    opts: Omit<ImportOptions, 'sourcePath' | 'category'>
  ): Promise<ImportResult[]> {
    if (!fs.existsSync(sourceDir)) {
      throw new Error(`Source directory not found: ${sourceDir}`);
    }
    const files = fs.readdirSync(sourceDir).filter((f) => {
      const ext = path.extname(f).slice(1).toLowerCase();
      return SUPPORTED_FORMATS.includes(ext as FileFormat);
    });

    const results: ImportResult[] = [];
    for (const file of files) {
      const result = await this.importDocument({
        sourcePath: path.join(sourceDir, file),
        category,
        ...opts,
      });
      results.push(result);
      const icon = result.success ? '✅' : '❌';
      console.log(`  ${icon} ${file} → ${result.documentId || result.errorMessage}`);
    }
    return results;
  }

  // --- Private Helpers ---

  private loadManifest(): DatasetManifest {
    if (fs.existsSync(this.manifestPath)) {
      return JSON.parse(fs.readFileSync(this.manifestPath, 'utf-8')) as DatasetManifest;
    }
    return {
      manifestVersion: '1.0.0',
      datasetVersion: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalDocuments: 0,
      entries: [],
    };
  }

  private saveManifest(manifest: DatasetManifest): void {
    const dir = path.dirname(this.manifestPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  }

  private async computeSha256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  private categoryDirName(cat: DocumentCategory): string {
    const map: Record<DocumentCategory, string> = {
      MARKSHEET: 'Category_1_Marksheets',
      CERTIFICATE: 'Category_2_Certificates',
      TIMETABLE: 'Category_3_Timetables',
      EDGE_CASE: 'Category_4_EdgeCases',
    };
    return map[cat];
  }

  private ensureDirs(): void {
    [
      this.datasetRoot,
      this.groundTruthDir,
      this.metadataDir,
      path.dirname(this.manifestPath),
      path.dirname(this.auditLogPath),
    ].forEach((d) => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });
  }

  private writeAudit(entry: Record<string, unknown>): void {
    fs.appendFileSync(this.auditLogPath, JSON.stringify(entry) + '\n', 'utf-8');
  }

  private failResult(documentId: string, errorMessage: string): ImportResult {
    return { documentId, success: false, destinationPath: '', groundTruthPath: '', metadataPath: '', errorMessage };
  }
}
