/**
 * Academic Universe — Dataset Organizer
 * Safely copies documents from RAW to organized subfolders with smart canonical renaming.
 * INVARIANT: RAW files are NEVER modified or deleted. RAW remains 100% read-only.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  ExtendedCategory,
  OrganizedDocumentRecord,
  RawDocumentInfo,
  DocumentClassification,
} from '../types/datasetManager.types';
import { DocumentClassifier } from '../classifier/documentClassifier';

export class DatasetOrganizer {
  private benchmarkRoot: string;
  private rawDir: string;
  private datasetDir: string;
  private groundTruthDir: string;
  private classifier: DocumentClassifier;
  private categoryCounters: Map<string, number> = new Map();

  constructor(benchmarkRoot: string) {
    this.benchmarkRoot = benchmarkRoot;
    this.rawDir = path.join(benchmarkRoot, 'dataset', 'RAW');
    this.datasetDir = path.join(benchmarkRoot, 'dataset');
    this.groundTruthDir = path.join(benchmarkRoot, 'ground-truth');
    this.classifier = new DocumentClassifier();
    this.ensureDirs();
    this.initializeCounters();
  }

  /** Scan the RAW folder for files */
  scanRawFolder(): RawDocumentInfo[] {
    if (!fs.existsSync(this.rawDir)) {
      return [];
    }

    const files = fs.readdirSync(this.rawDir).filter((f) => {
      const full = path.join(this.rawDir, f);
      return fs.statSync(full).isFile() && !f.startsWith('.');
    });

    return files.map((file) => {
      const fullPath = path.join(this.rawDir, file);
      const stat = fs.statSync(fullPath);
      const ext = path.extname(file).slice(1).toLowerCase() as RawDocumentInfo['fileFormat'];
      const checksum = this.computeSha256Sync(fullPath);

      return {
        originalFilename: file,
        rawPath: fullPath,
        fileFormat: ext,
        fileSizeBytes: stat.size,
        checksumSha256: checksum,
        createdAt: stat.birthtime.toISOString(),
        modifiedAt: stat.mtime.toISOString(),
      };
    });
  }

  /** Organize raw document: Classify → Copy → Assign Canonical ID → Generate Draft GT */
  organizeDocument(rawDoc: RawDocumentInfo): OrganizedDocumentRecord {
    const classification = this.classifier.classify(rawDoc.originalFilename);
    const subfolder = this.classifier.getDestinationSubfolder(classification.category);

    // Increment counter for prefix
    const prefix = classification.suggestedPrefix;
    const currentCount = (this.categoryCounters.get(prefix) || 0) + 1;
    this.categoryCounters.set(prefix, currentCount);

    const documentId = `${prefix}_${currentCount.toString().padStart(3, '0')}`;
    const canonicalFilename = `${documentId}.${rawDoc.fileFormat}`;

    const destDir = path.join(this.datasetDir, subfolder);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

    const organizedPath = path.join(destDir, canonicalFilename);
    const gtPath = path.join(this.groundTruthDir, `${documentId}.json`);

    // SAFE COPY: RAW file is read, never modified
    fs.copyFileSync(rawDoc.rawPath, organizedPath);

    // Create Draft Ground Truth JSON
    const draftGT = this.createDraftGroundTruth(documentId, classification.category, rawDoc.originalFilename);
    fs.writeFileSync(gtPath, JSON.stringify(draftGT, null, 2), 'utf-8');

    return {
      documentId,
      originalFilename: rawDoc.originalFilename,
      canonicalFilename,
      rawPath: rawDoc.rawPath,
      organizedPath,
      category: classification.category,
      fileFormat: rawDoc.fileFormat,
      fileSizeBytes: rawDoc.fileSizeBytes,
      checksumSha256: rawDoc.checksumSha256,
      qualityLevel: this.inferQuality(rawDoc.originalFilename),
      classificationConfidence: classification.confidence,
      importedAt: new Date().toISOString(),
      groundTruthPath: gtPath,
      groundTruthStatus: 'DRAFT',
    };
  }

  // --- Helpers ---

  private initializeCounters(): void {
    // Scan existing files in dataset/ subfolders to avoid ID collision
    const prefixes = ['MS', 'TR', 'CERT', 'CERT_WS', 'CERT_INT', 'CERT_HACK', 'TT', 'TT_EXAM', 'ADMIT', 'FEE', 'ID', 'UNK'];
    for (const prefix of prefixes) {
      this.categoryCounters.set(prefix, 0);
    }

    if (fs.existsSync(this.datasetDir)) {
      const subdirs = fs.readdirSync(this.datasetDir);
      for (const sub of subdirs) {
        const subPath = path.join(this.datasetDir, sub);
        if (fs.statSync(subPath).isDirectory() && sub !== 'RAW') {
          const files = fs.readdirSync(subPath);
          for (const f of files) {
            const match = f.match(/^([A-Z_]+)_(\d{3})\./);
            if (match) {
              const prefix = match[1];
              const num = parseInt(match[2], 10);
              const current = this.categoryCounters.get(prefix) || 0;
              if (num > current) this.categoryCounters.set(prefix, num);
            }
          }
        }
      }
    }
  }

  private createDraftGroundTruth(documentId: string, category: ExtendedCategory, originalName: string) {
    const isMarksheet = category === 'MARKSHEET' || category === 'TRANSCRIPT';
    const isCert = category.includes('CERTIFICATE');

    // Parse potential semester number from filename e.g., "sem 1 marks.pdf"
    const semMatch = originalName.match(/sem(?:ester)?[\s\-_]*(\d+)/i);
    const semesterStr = semMatch ? semMatch[1] : null;

    return {
      schemaVersion: '1.0.0',
      documentId,
      category,
      studentName: null,
      rollNumber: null,
      semester: semesterStr,
      academicYear: null,
      institutionName: isCert ? this.inferInstitution(originalName) : null,
      courseName: isCert ? originalName.replace(/\.[^/.]+$/, '') : null,
      sgpa: null,
      cgpa: null,
      issueDate: null,
      courseMarks: [],
      annotatedBy: 'AI_ASSISTANT_DRAFT',
      annotatedAt: new Date().toISOString(),
      annotationStatus: 'DRAFT',
      annotationNotes: `Auto-generated draft GT for raw file "${originalName}"`,
      lowConfidenceFields: ['studentName', 'rollNumber', 'sgpa', 'cgpa'],
    };
  }

  private inferInstitution(name: string): string | null {
    const lower = name.toLowerCase();
    if (lower.includes('oracle')) return 'Oracle';
    if (lower.includes('owasp')) return 'OWASP Foundation';
    if (lower.includes('udemy')) return 'Udemy';
    if (lower.includes('nptel')) return 'NPTEL';
    return null;
  }

  private inferQuality(filename: string): 'HIGH' | 'MEDIUM' | 'LOW' | 'SCANNED' {
    const lower = filename.toLowerCase();
    if (lower.includes('scan') || lower.includes('blurry')) return 'SCANNED';
    if (lower.includes('low') || lower.endsWith('.png')) return 'MEDIUM';
    return 'HIGH';
  }

  private computeSha256Sync(filePath: string): string {
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private ensureDirs(): void {
    [
      this.datasetDir,
      path.join(this.datasetDir, 'marksheets'),
      path.join(this.datasetDir, 'certificates'),
      path.join(this.datasetDir, 'timetables'),
      path.join(this.datasetDir, 'admit_cards'),
      path.join(this.datasetDir, 'fee_receipts'),
      path.join(this.datasetDir, 'student_id'),
      path.join(this.datasetDir, 'unknown'),
      this.groundTruthDir,
    ].forEach((d) => {
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    });
  }
}
