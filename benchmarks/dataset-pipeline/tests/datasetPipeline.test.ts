/**
 * Academic Universe — Dataset Pipeline Unit & Integration Tests
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { DatasetImporter } from '../importer/datasetImporter';
import { DatasetValidator } from '../validation/datasetValidator';
import { AnnotationManager } from '../annotations/annotationManager';
import { PIIManager } from '../privacy/piiManager';
import { DatasetSnapshotManager } from '../versioning/datasetSnapshotManager';
import { DatasetReporter } from '../reporting/datasetReporter';
import { GROUND_TRUTH_SCHEMA_VERSION, createBlankAnnotation } from '../schemas/groundTruth.schema';
import { DatasetManifest } from '../types/dataset.types';

describe('Dataset Pipeline Suite', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'au_dataset_test_'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {}
  });

  // ─── Ground Truth Schema Tests ─────────────────────────────────────────────

  describe('Ground Truth Schema & Blank Template', () => {
    test('createBlankAnnotation returns valid schema structure', () => {
      const blank = createBlankAnnotation('MS_TEST_001', 'MARKSHEET', 'A1') as any;
      expect(blank.schemaVersion).toBe(GROUND_TRUTH_SCHEMA_VERSION);
      expect(blank.documentId).toBe('MS_TEST_001');
      expect(blank.category).toBe('MARKSHEET');
      expect(blank.annotationStatus).toBe('IN_PROGRESS');
      expect(blank.courseMarks).toEqual([]);
    });
  });

  // ─── Dataset Importer Tests ───────────────────────────────────────────────

  describe('DatasetImporter', () => {
    test('importDocument copies file, generates metadata, and updates manifest', async () => {
      const importer = new DatasetImporter(tmpRoot);

      // Create dummy source pdf
      const sourcePdf = path.join(tmpRoot, 'sample_marksheet.pdf');
      fs.writeFileSync(sourcePdf, '%PDF-1.4 Mock PDF Content');

      const result = await importer.importDocument({
        sourcePath: sourcePdf,
        category: 'MARKSHEET',
        qualityLevel: 'HIGH',
        universityOrigin: 'Test University',
        consentStatus: 'SYNTHETIC',
        annotatorId: 'A1',
      });

      expect(result.success).toBe(true);
      expect(result.documentId).toMatch(/^MS_TESTUN_\d{3}$/);
      expect(fs.existsSync(result.destinationPath)).toBe(true);
      expect(fs.existsSync(result.groundTruthPath)).toBe(true);
      expect(fs.existsSync(result.metadataPath)).toBe(true);

      // Verify manifest was updated
      const manifestPath = path.join(tmpRoot, 'dataset-pipeline', 'manifests', 'dataset_manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as DatasetManifest;
      expect(manifest.totalDocuments).toBe(1);
      expect(manifest.entries[0].documentId).toBe(result.documentId);
    });

    test('importDocument detects duplicate content checksum', async () => {
      const importer = new DatasetImporter(tmpRoot);
      const sourcePdf = path.join(tmpRoot, 'sample_dup.pdf');
      fs.writeFileSync(sourcePdf, 'IDENTICAL CONTENT');

      const res1 = await importer.importDocument({
        sourcePath: sourcePdf,
        category: 'MARKSHEET',
        qualityLevel: 'HIGH',
        universityOrigin: 'UniA',
        consentStatus: 'SYNTHETIC',
        annotatorId: 'A1',
      });
      expect(res1.success).toBe(true);

      // Attempt second import of exact same content
      const res2 = await importer.importDocument({
        sourcePath: sourcePdf,
        category: 'MARKSHEET',
        qualityLevel: 'HIGH',
        universityOrigin: 'UniA',
        consentStatus: 'SYNTHETIC',
        annotatorId: 'A1',
      });
      expect(res2.success).toBe(false);
      expect(res2.errorMessage).toContain('Duplicate document detected');
    });
  });

  // ─── PII Manager Tests ───────────────────────────────────────────────────

  describe('PIIManager', () => {
    test('detect identifies Aadhaar and Mobile numbers', () => {
      const pii = new PIIManager(tmpRoot);
      const text = 'Student Aadhaar: 1234 5678 9012 and phone +91 9876543210';
      const result = pii.detect('DOC_001', text);

      expect(result.hasPII).toBe(true);
      expect(result.detectedPatterns.some((p) => p.type === 'AADHAAR_NUMBER')).toBe(true);
      expect(result.detectedPatterns.some((p) => p.type === 'MOBILE_NUMBER')).toBe(true);
      expect(result.riskLevel).toBe('LOW');
    });

    test('maskText redacts PII strings correctly', () => {
      const pii = new PIIManager(tmpRoot);
      const text = 'Email us at test@example.com';
      const masked = pii.maskText(text);
      expect(masked).toContain('[EMAIL_REDACTED]');
      expect(masked).not.toContain('test@example.com');
    });

    test('validateConsent verifies synthetic documents', () => {
      const pii = new PIIManager(tmpRoot);
      const res = pii.validateConsent({ consentStatus: 'SYNTHETIC', piiMasked: false });
      expect(res.cleared).toBe(true);
    });
  });

  // ─── Annotation Manager Tests ──────────────────────────────────────────────

  describe('AnnotationManager', () => {
    test('submitAnnotation updates status to ANNOTATED and validates schema', async () => {
      const importer = new DatasetImporter(tmpRoot);
      const sourcePdf = path.join(tmpRoot, 'sample.pdf');
      fs.writeFileSync(sourcePdf, 'PDF Data');

      const impRes = await importer.importDocument({
        sourcePath: sourcePdf,
        category: 'MARKSHEET',
        qualityLevel: 'HIGH',
        universityOrigin: 'UniB',
        consentStatus: 'SYNTHETIC',
        annotatorId: 'A1',
      });

      const annotMgr = new AnnotationManager(tmpRoot);
      const gt = annotMgr.loadAnnotation(impRes.documentId)!;
      gt.studentName = 'Test Student';
      gt.rollNumber = '12345';
      gt.sgpa = 8.5;

      const submitRes = annotMgr.submitAnnotation(gt);
      expect(submitRes.success).toBe(true);

      const reloaded = annotMgr.loadAnnotation(impRes.documentId)!;
      expect(reloaded.annotationStatus).toBe('ANNOTATED');
      expect(reloaded.studentName).toBe('Test Student');
    });

    test('verifyAnnotation changes status to VERIFIED', async () => {
      const importer = new DatasetImporter(tmpRoot);
      const sourcePdf = path.join(tmpRoot, 'sample.pdf');
      fs.writeFileSync(sourcePdf, 'PDF Data 2');

      const impRes = await importer.importDocument({
        sourcePath: sourcePdf,
        category: 'CERTIFICATE',
        qualityLevel: 'HIGH',
        universityOrigin: 'UniB',
        consentStatus: 'SYNTHETIC',
        annotatorId: 'A1',
      });

      const annotMgr = new AnnotationManager(tmpRoot);
      const gt = annotMgr.loadAnnotation(impRes.documentId)!;
      annotMgr.submitAnnotation(gt);

      const verifyRes = annotMgr.verifyAnnotation(impRes.documentId, 'V1');
      expect(verifyRes.success).toBe(true);

      const verifiedGT = annotMgr.loadAnnotation(impRes.documentId)!;
      expect(verifiedGT.annotationStatus).toBe('VERIFIED');
      expect(verifiedGT.verifiedBy).toBe('V1');
    });
  });

  // ─── Snapshot & Versioning Tests ──────────────────────────────────────────

  describe('DatasetSnapshotManager', () => {
    test('createSnapshot records snapshot and rollback restores it', async () => {
      const importer = new DatasetImporter(tmpRoot);
      const sourcePdf = path.join(tmpRoot, 'sample.pdf');
      fs.writeFileSync(sourcePdf, 'PDF Data Snap');

      await importer.importDocument({
        sourcePath: sourcePdf,
        category: 'TIMETABLE',
        qualityLevel: 'HIGH',
        universityOrigin: 'UniC',
        consentStatus: 'SYNTHETIC',
        annotatorId: 'A1',
      });

      const snapMgr = new DatasetSnapshotManager(tmpRoot);
      const snap = snapMgr.createSnapshot('1.0.0', 'admin', 'Initial snapshot');
      expect(snap.datasetVersion).toBe('1.0.0');

      const snapshots = snapMgr.listSnapshots();
      expect(snapshots.length).toBe(1);
      expect(snapshots[0].snapshotId).toBe(snap.snapshotId);
    });
  });
});
