/**
 * Academic Universe — HITL Annotation Platform Unit Tests
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { ContentClassifier } from '../classifier/contentClassifier';
import { GTVersionManager } from '../versioning/gtVersionManager';
import { ReviewQueueManager } from '../queue/reviewQueueManager';
import { AnnotationPlatformService } from '../manager/annotationPlatformService';
import { DatasetManagerService } from '../manager/datasetManagerService';

describe('HITL Annotation Platform Suite', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'au_hitl_test_'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {}
  });

  // ─── ContentClassifier Tests ──────────────────────────────────────────────

  describe('ContentClassifier', () => {
    const classifier = new ContentClassifier();

    test('extracts structured candidate fields from text content', () => {
      const text = 'STATEMENT OF MARKS\nStudent Name: Aashish Rajput\nRoll No: 21CS001\nSemester: 5\nSGPA: 8.50\nCGPA: 8.40\nDate of Issue: 2024-12-15';
      const result = classifier.analyzeContent('sem 5 marks.pdf', text);

      expect(result.category).toBe('MARKSHEET');
      expect(result.categoryConfidence).toBeGreaterThan(0.9);

      const nameField = result.extractedFields.find((f) => f.fieldName === 'studentName');
      expect(nameField?.extractedValue).toBe('Aashish Rajput');
      expect(nameField?.confidence).toBeGreaterThan(0.9);

      const sgpaField = result.extractedFields.find((f) => f.fieldName === 'sgpa');
      expect(sgpaField?.extractedValue).toBe(8.5);
    });
  });

  // ─── GTVersionManager Tests ────────────────────────────────────────────────

  describe('GTVersionManager', () => {
    test('creates v1 and v2 version snapshots and maintains audit log', () => {
      const vm = new GTVersionManager(tmpRoot);
      const docId = 'MS_001';

      const v1 = vm.createVersion(docId, { sgpa: 8.0 }, 'Annotator1', 'Initial draft');
      expect(v1.version).toBe(1);

      const v2 = vm.createVersion(docId, { sgpa: 8.5 }, 'Annotator2', 'Corrected SGPA');
      expect(v2.version).toBe(2);

      const history = vm.getVersionHistory(docId);
      expect(history.length).toBe(2);

      // Restore v1
      const restored = vm.restoreVersion(docId, 1, 'Admin');
      expect(restored.sgpa).toBe(8.0);
    });
  });

  // ─── ReviewQueueManager Tests ─────────────────────────────────────────────

  describe('ReviewQueueManager', () => {
    const qm = new ReviewQueueManager();

    test('prioritizes UNKNOWN and low confidence documents at top of queue', () => {
      const docs: any[] = [
        { documentId: 'MS_001', category: 'MARKSHEET', classificationConfidence: 0.95, groundTruthStatus: 'DRAFT', importedAt: '2026-07-28T00:00:00Z' },
        { documentId: 'UNK_001', category: 'UNKNOWN', classificationConfidence: 0.40, groundTruthStatus: 'DRAFT', importedAt: '2026-07-28T00:00:00Z' },
        { documentId: 'CERT_001', category: 'CERTIFICATE', classificationConfidence: 0.70, groundTruthStatus: 'REJECTED', importedAt: '2026-07-28T00:00:00Z' },
      ];

      const queue = qm.buildPriorityQueue(docs, 'PRIORITY');
      expect(queue[0].documentId).toBe('UNK_001'); // UNKNOWN has highest priority score
    });
  });

  // ─── AnnotationPlatformService Tests ──────────────────────────────────────

  describe('AnnotationPlatformService', () => {
    test('enforces benchmark readiness: false when unverified documents exist', () => {
      const rawDir = path.join(tmpRoot, 'dataset', 'RAW');
      fs.mkdirSync(rawDir, { recursive: true });
      fs.writeFileSync(path.join(rawDir, 'sem1.pdf'), 'CONTENT');

      const mgrService = new DatasetManagerService(tmpRoot);
      mgrService.processRawDataset();

      const platform = new AnnotationPlatformService(tmpRoot);
      const readiness = platform.validateBenchmarkReadiness();

      expect(readiness.ready).toBe(false);
      expect(readiness.reason).toContain('still pending review');

      // Verify the document
      platform.verifyDocument('MS_001', 'Verifier1');
      const updatedReadiness = platform.validateBenchmarkReadiness();
      expect(updatedReadiness.ready).toBe(true);
    });
  });
});
