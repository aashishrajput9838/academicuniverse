/**
 * Academic Universe — AI Research Dataset Manager Unit Tests
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { DocumentClassifier } from '../classifier/documentClassifier';
import { DatasetOrganizer } from '../organizer/datasetOrganizer';
import { DuplicateDetector } from '../duplicates/duplicateDetector';
import { DatasetManagerService } from '../manager/datasetManagerService';

describe('AI Research Dataset Manager Suite', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'au_ds_mgr_test_'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {}
  });

  // ─── Classifier Tests ──────────────────────────────────────────────────────

  describe('DocumentClassifier', () => {
    const classifier = new DocumentClassifier();

    test('classifies semester marksheets correctly', () => {
      const res = classifier.classify('sem 1 marks.pdf');
      expect(res.category).toBe('MARKSHEET');
      expect(res.suggestedPrefix).toBe('MS');
      expect(res.confidence).toBeGreaterThan(0.9);
    });

    test('classifies intermediate marksheet correctly', () => {
      const res = classifier.classify('intermeadiet marksheet.pdf');
      expect(res.category).toBe('MARKSHEET');
      expect(res.suggestedPrefix).toBe('MS');
    });

    test('classifies certificates correctly', () => {
      const res1 = classifier.classify('oracle-clmsCertificate.pdf');
      expect(res1.category).toBe('CERTIFICATE');

      const res2 = classifier.classify('OWASP Web Development Bootcamp Completion & Certificate.png');
      expect(res2.category).toBe('CERTIFICATE');

      const res3 = classifier.classify('Ethics in Engineering Practice.pdf');
      expect(res3.category).toBe('CERTIFICATE');
    });

    test('classifies unknown filenames gracefully', () => {
      const res = classifier.classify('15.png');
      expect(res.category).toBe('UNKNOWN');
      expect(res.confidence).toBeLessThan(0.5);
    });

    test('classifies admit cards, fee receipts, timetables, and student IDs', () => {
      expect(classifier.classify('admit card.pdf').category).toBe('ADMIT_CARD');
      expect(classifier.classify('fee receipt.pdf').category).toBe('FEE_RECEIPT');
      expect(classifier.classify('class timetable.pdf').category).toBe('TIMETABLE');
      expect(classifier.classify('student id card.jpg').category).toBe('STUDENT_ID');
    });
  });

  // ─── Dataset Organizer Tests ───────────────────────────────────────────────

  describe('DatasetOrganizer', () => {
    test('scans RAW folder and organizes files safely without modifying RAW', () => {
      const rawDir = path.join(tmpRoot, 'dataset', 'RAW');
      fs.mkdirSync(rawDir, { recursive: true });

      const rawFile = path.join(rawDir, 'sem 1 marks.pdf');
      const rawContent = 'PDF CONTENT MARKSHEET';
      fs.writeFileSync(rawFile, rawContent);

      const organizer = new DatasetOrganizer(tmpRoot);
      const rawInfo = organizer.scanRawFolder();
      expect(rawInfo.length).toBe(1);
      expect(rawInfo[0].originalFilename).toBe('sem 1 marks.pdf');

      const organized = organizer.organizeDocument(rawInfo[0]);
      expect(organized.documentId).toMatch(/^MS_\d{3}$/);
      expect(organized.canonicalFilename).toMatch(/^MS_\d{3}\.pdf$/);
      expect(fs.existsSync(organized.organizedPath)).toBe(true);

      // INVARIANT CHECK: RAW file MUST NOT be deleted or altered
      expect(fs.existsSync(rawFile)).toBe(true);
      expect(fs.readFileSync(rawFile, 'utf-8')).toBe(rawContent);
    });
  });

  // ─── Duplicate Detector Tests ─────────────────────────────────────────────

  describe('DuplicateDetector', () => {
    const detector = new DuplicateDetector();

    test('detects exact SHA-256 hash duplicates', () => {
      const docs: any[] = [
        { documentId: 'MS_001', originalFilename: 'sem1.pdf', organizedPath: '/a', checksumSha256: 'HASH123' },
        { documentId: 'MS_002', originalFilename: 'sem1_copy.pdf', organizedPath: '/b', checksumSha256: 'HASH123' },
        { documentId: 'CERT_001', originalFilename: 'cert.pdf', organizedPath: '/c', checksumSha256: 'HASH456' },
      ];

      const dupes = detector.detectSha256Duplicates(docs);
      expect(dupes.length).toBe(1);
      expect(dupes[0].documents.length).toBe(2);
    });

    test('detects filename similarity ratio', () => {
      const docs: any[] = [
        { documentId: 'MS_001', originalFilename: 'sem 1 marksheet.pdf', checksumSha256: 'HASH1' },
        { documentId: 'MS_002', originalFilename: 'sem 1 marksheet copy.pdf', checksumSha256: 'HASH2' },
      ];

      const similar = detector.detectFilenameSimilarities(docs);
      expect(similar.length).toBe(1);
      expect(similar[0].similarity).toBeGreaterThan(70);
    });
  });

  // ─── DatasetManagerService Tests ──────────────────────────────────────────

  describe('DatasetManagerService', () => {
    test('processRawDataset runs end-to-end and updates manifest and stats', () => {
      const rawDir = path.join(tmpRoot, 'dataset', 'RAW');
      fs.mkdirSync(rawDir, { recursive: true });

      fs.writeFileSync(path.join(rawDir, 'sem 1 marks.pdf'), 'MARKS CONTENT 1');
      fs.writeFileSync(path.join(rawDir, 'oracle cert.pdf'), 'CERT CONTENT 1');

      const service = new DatasetManagerService(tmpRoot);
      const res = service.processRawDataset();

      expect(res.processedCount).toBe(2);
      expect(res.manifest.totalOrganizedDocuments).toBe(2);
      expect(res.stats.totalImported).toBe(2);
      expect(res.stats.pendingReviewCount).toBe(2);

      // Verify reviewing a document
      const docId = res.manifest.documents[0].documentId;
      const updated = service.reviewDocument(docId, 'APPROVE');
      expect(updated.groundTruthStatus).toBe('VERIFIED');
    });
  });
});
