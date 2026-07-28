/**
 * Academic Universe — Synthetic Generator Unit & Integration Tests
 * Tests: Seed Reproducibility, PRNG, Data Fabricator, Template Engine,
 * Ground Truth Builder, Manifest Builder, Quality Checker, and Pipeline.
 */

import fs from 'fs';
import path from 'path';
import { SeededRandom } from '../core/seededRandom';
import { DataFabricator } from '../core/dataFabricator';
import { TemplateEngine, DefaultTemplateA } from '../core/templateEngine';
import { GroundTruthBuilder } from '../pipeline/groundTruthBuilder';
import { QualityChecker } from '../pipeline/qualityChecker';
import { SyntheticPipeline } from '../pipeline/syntheticPipeline';
import { QUALITY_PROFILES, QualityProfileManager } from '../core/qualityProfiles';

const benchmarkRoot = path.resolve(__dirname, '../..');
const testOutputDir = path.join(benchmarkRoot, 'test-synthetic-output');

afterAll(() => {
  if (fs.existsSync(testOutputDir)) {
    try {
      fs.rmSync(testOutputDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
    } catch {}
  }
});

describe('SeededRandom (Mulberry32 PRNG)', () => {
  test('same seed produces identical sequence', () => {
    const rng1 = new SeededRandom(42);
    const rng2 = new SeededRandom(42);

    const seq1 = [rng1.nextFloat(), rng1.nextInt(1, 100), rng1.nextDate()];
    const seq2 = [rng2.nextFloat(), rng2.nextInt(1, 100), rng2.nextDate()];

    expect(seq1).toEqual(seq2);
  });

  test('different seed produces different sequence', () => {
    const rng1 = new SeededRandom(42);
    const rng2 = new SeededRandom(99);

    expect(rng1.nextFloat()).not.toEqual(rng2.nextFloat());
  });

  test('pick picks element within array', () => {
    const rng = new SeededRandom(10);
    const item = rng.pick(['A', 'B', 'C']);
    expect(['A', 'B', 'C']).toContain(item);
  });
});

describe('DataFabricator', () => {
  test('generates valid student profile', () => {
    const rng = new SeededRandom(42);
    const fab = new DataFabricator(rng);
    const student = fab.generateStudentProfile();

    expect(student.studentName).toBeTruthy();
    expect(student.rollNumber).toMatch(/^\d{10}$/);
    expect(student.email).toContain('@example.ac.in');
  });

  test('generates semester course records with valid SGPA', () => {
    const rng = new SeededRandom(42);
    const fab = new DataFabricator(rng);
    const sem = fab.generateSemesterRecord(1);

    expect(sem.courseMarks.length).toBe(5);
    expect(sem.sgpa).toBeGreaterThanOrEqual(5.0);
    expect(sem.sgpa).toBeLessThanOrEqual(10.0);
  });
});

describe('QualityProfileManager', () => {
  test('selects clean profile when default', () => {
    const rng = new SeededRandom(42);
    const profile = QualityProfileManager.selectProfile(rng);
    expect(QUALITY_PROFILES[profile.name]).toBeDefined();
  });
});

describe('GroundTruthBuilder', () => {
  test('builds 100% consistent ground truth matching synthetic document data', () => {
    const data: any = {
      documentId: 'SYNTH_MS_001',
      category: 'MARKSHEET',
      templateId: 'TEMPLATE_A',
      seed: 42,
      student: { studentName: 'Aashish Rajput', rollNumber: '2023329421' },
      semesterRecords: [
        {
          semesterName: 'Semester 1',
          sgpa: 8.5,
          courseMarks: [{ courseCode: 'CS101', courseName: 'Algorithms', marksObtained: 85, maxMarks: 100 }],
        },
      ],
      cgpa: 8.5,
      issueDate: '2025-06-01',
      qualityProfile: QUALITY_PROFILES.CLEAN_PDF,
      customData: {},
    };

    const gt = GroundTruthBuilder.buildGroundTruth(data);

    expect(gt.documentId).toBe('SYNTH_MS_001');
    expect(gt.studentName).toBe('Aashish Rajput');
    expect(gt.sgpa).toBe(8.5);
    expect(gt.courseMarks?.length).toBe(1);
    expect(gt.customFields?.synthetic).toBe(true);
  });
});

describe('SyntheticPipeline (Integration)', () => {
  test('generates full dataset with manifest, metadata, and report', async () => {
    const pipeline = new SyntheticPipeline(benchmarkRoot);
    const result = await pipeline.generateDataset({
      seed: 42,
      count: 5,
      outputDir: testOutputDir,
    });

    expect(result.totalDocuments).toBe(5);
    expect(fs.existsSync(path.join(testOutputDir, 'manifest.json'))).toBe(true);
    expect(fs.existsSync(path.join(testOutputDir, 'metadata.json'))).toBe(true);
    expect(fs.existsSync(path.join(testOutputDir, 'generation-report.md'))).toBe(true);

    const validation = QualityChecker.validateDataset(testOutputDir);
    expect(validation.isValid).toBe(true);
    expect(validation.errors.length).toBe(0);
  });

  test('deterministic seed reproducibility - seed 42 twice yields identical manifest hash', async () => {
    const pipeline = new SyntheticPipeline(benchmarkRoot);
    const dir1 = path.join(testOutputDir, 'run1');
    const dir2 = path.join(testOutputDir, 'run2');

    const res1 = await pipeline.generateDataset({ seed: 42, count: 3, outputDir: dir1 });
    const res2 = await pipeline.generateDataset({ seed: 42, count: 3, outputDir: dir2 });

    expect(res1.report.manifestHash).toBe(res2.report.manifestHash);
  });

  test('different seeds yield different manifest hashes', async () => {
    const pipeline = new SyntheticPipeline(benchmarkRoot);
    const dir1 = path.join(testOutputDir, 'runA');
    const dir2 = path.join(testOutputDir, 'runB');

    const res1 = await pipeline.generateDataset({ seed: 42, count: 3, outputDir: dir1 });
    const res2 = await pipeline.generateDataset({ seed: 99, count: 3, outputDir: dir2 });

    expect(res1.report.manifestHash).not.toBe(res2.report.manifestHash);
  });
});
