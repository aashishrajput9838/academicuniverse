/**
 * Academic Universe — Pilot Dataset Generator
 * Generates 25 synthetic benchmark sample documents (text/PDF/image representations)
 * and matching v1.0.0 Ground Truth JSON annotation files across 4 document categories:
 *   • 10 Marksheets
 *   • 5 Certificates
 *   • 5 Timetables
 *   • 5 Edge Cases (Low-quality)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { GROUND_TRUTH_SCHEMA_VERSION } from '../dataset-pipeline/schemas/groundTruth.schema';
import { ManifestEntry, DatasetManifest } from '../dataset-pipeline/types/dataset.types';

const BENCHMARK_ROOT = path.resolve(__dirname, '../');

const DIRS = {
  MARKSHEET: path.join(BENCHMARK_ROOT, 'dataset', 'Category_1_Marksheets'),
  CERTIFICATE: path.join(BENCHMARK_ROOT, 'dataset', 'Category_2_Certificates'),
  TIMETABLE: path.join(BENCHMARK_ROOT, 'dataset', 'Category_3_Timetables'),
  EDGE_CASE: path.join(BENCHMARK_ROOT, 'dataset', 'Category_4_EdgeCases'),
  GROUND_TRUTH: path.join(BENCHMARK_ROOT, 'ground-truth'),
  METADATA: path.join(BENCHMARK_ROOT, 'dataset-pipeline', 'metadata'),
  MANIFEST_DIR: path.join(BENCHMARK_ROOT, 'dataset-pipeline', 'manifests'),
};

export async function preparePilotDataset() {
  console.log('📦 Preparing 25 Pilot Benchmark Documents and Ground Truth files...');

  // Ensure directories
  Object.values(DIRS).forEach((d) => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  const manifestEntries: ManifestEntry[] = [];

  // Helper to write doc file and GT JSON
  const createSampleDoc = (
    id: string,
    category: 'MARKSHEET' | 'CERTIFICATE' | 'TIMETABLE' | 'EDGE_CASE',
    qualityLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'SCANNED',
    gtData: any,
    content: string
  ) => {
    const categoryDir = DIRS[category];
    const relCatDir = path.basename(categoryDir);
    const fileName = `${id}.png`; // Text-based image placeholder for test execution
    const filePath = path.join(categoryDir, fileName);
    const gtPath = path.join(DIRS.GROUND_TRUTH, `${id}.json`);
    const metaPath = path.join(DIRS.METADATA, `${id}.json`);

    // Write file content
    fs.writeFileSync(filePath, content, 'utf-8');

    // Compute sha256 checksum
    const checksum = crypto.createHash('sha256').update(content).digest('hex');

    // Complete Ground Truth object matching schema
    const fullGT = {
      schemaVersion: GROUND_TRUTH_SCHEMA_VERSION,
      documentId: id,
      category,
      annotatedBy: 'A1',
      annotatedAt: new Date().toISOString(),
      annotationStatus: 'VERIFIED',
      verifiedBy: 'V1',
      verifiedAt: new Date().toISOString(),
      ...gtData,
    };
    fs.writeFileSync(gtPath, JSON.stringify(fullGT, null, 2), 'utf-8');

    // Write Metadata object
    const meta = {
      documentId: id,
      originalFilename: fileName,
      category,
      fileFormat: 'png',
      fileSizeBytes: Buffer.byteLength(content),
      checksumSha256: checksum,
      qualityLevel,
      universityOrigin: 'Pilot University',
      language: 'en',
      layoutVariant: category === 'TIMETABLE' ? 'grid' : 'standard',
      consentStatus: 'SYNTHETIC',
      piiMasked: true,
      importedAt: new Date().toISOString(),
      importedBy: 'system',
    };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

    // Add entry to manifest
    manifestEntries.push({
      documentId: id,
      category,
      relativeFilePath: `${relCatDir}/${fileName}`,
      groundTruthPath: `${id}.json`,
      metadataPath: `${id}.json`,
      checksumSha256: checksum,
      annotationStatus: 'VERIFIED',
      qualityLevel,
      importedAt: new Date().toISOString(),
    });
  };

  // 1. Marksheets (10 documents)
  for (let i = 1; i <= 10; i++) {
    const id = `MS_PILOT_${i.toString().padStart(3, '0')}`;
    const sgpa = parseFloat((7.5 + (i * 0.2)).toFixed(2));
    const cgpa = parseFloat((7.4 + (i * 0.18)).toFixed(2));
    const gt = {
      studentName: `Pilot Student ${i}`,
      rollNumber: `21CS0${i.toString().padStart(2, '0')}`,
      semester: `${(i % 8) + 1}`,
      academicYear: '2024-2025',
      institutionName: 'Pilot Institute of Technology',
      sgpa,
      cgpa,
      issueDate: '2024-12-15',
      courseMarks: [
        { courseCode: 'CS501', courseName: 'Machine Learning', marksObtained: 80 + i, maxMarks: 100 },
        { courseCode: 'CS502', courseName: 'Database Systems', marksObtained: 85 + i, maxMarks: 100 },
        { courseCode: 'CS503', courseName: 'Operating Systems', marksObtained: 75 + i, maxMarks: 100 },
        { courseCode: 'CS504', courseName: 'Computer Networks', marksObtained: 78 + i, maxMarks: 100 },
      ],
    };
    const content = `PILOT MARKSHEET RECORD\nStudent Name: ${gt.studentName}\nRoll No: ${gt.rollNumber}\nSemester: ${gt.semester}\nSGPA: ${gt.sgpa}\nCGPA: ${gt.cgpa}\nIssue Date: ${gt.issueDate}\nCourses: CS501(8${i}/100), CS502(8${i + 5}/100)`;
    createSampleDoc(id, 'MARKSHEET', i % 2 === 0 ? 'HIGH' : 'MEDIUM', gt, content);
  }

  // 2. Certificates (5 documents)
  for (let i = 1; i <= 5; i++) {
    const id = `CERT_PILOT_${i.toString().padStart(3, '0')}`;
    const gt = {
      studentName: `Pilot Scholar ${i}`,
      rollNumber: `CERT-2024-${i}`,
      courseName: `Advanced Data Science Certification ${i}`,
      institutionName: 'Global AI Academy',
      issueDate: '2024-11-20',
      sgpa: null,
      cgpa: null,
      courseMarks: [],
    };
    const content = `CERTIFICATE OF COMPLETION\nThis is to certify that ${gt.studentName} has successfully completed ${gt.courseName} issued on ${gt.issueDate} by ${gt.institutionName}.`;
    createSampleDoc(id, 'CERTIFICATE', 'HIGH', gt, content);
  }

  // 3. Timetables (5 documents)
  for (let i = 1; i <= 5; i++) {
    const id = `TT_PILOT_${i.toString().padStart(3, '0')}`;
    const gt = {
      semester: `Semester ${i}`,
      institutionName: 'Faculty of Engineering',
      academicYear: '2024-2025',
      studentName: null,
      rollNumber: null,
      sgpa: null,
      cgpa: null,
      issueDate: '2024-08-01',
      courseMarks: [],
    };
    const content = `ACADEMIC TIMETABLE GRID\nDepartment of Computer Science - Semester ${i}\nMon: CS501 (9-10AM) | Tue: CS502 (10-11AM)\nWed: CS503 (11-12PM) | Thu: CS504 (2-3PM)`;
    createSampleDoc(id, 'TIMETABLE', 'MEDIUM', gt, content);
  }

  // 4. Edge Cases / Low Quality (5 documents)
  for (let i = 1; i <= 5; i++) {
    const id = `EC_PILOT_${i.toString().padStart(3, '0')}`;
    const gt = {
      studentName: `Edge Case Student ${i}`,
      rollNumber: `EC99${i}`,
      semester: '3',
      sgpa: 6.5,
      cgpa: 6.4,
      issueDate: '2023-05-10',
      courseMarks: [
        { courseCode: 'EC101', courseName: 'Basic Electronics', marksObtained: 55, maxMarks: 100 },
      ],
    };
    const content = `LOW QUALITY ROTATED SCAN\n[BLURRY TEXT]\nName: ${gt.studentName}\nRoll: ${gt.rollNumber}\nSGPA: ${gt.sgpa}\nDate: ${gt.issueDate}`;
    createSampleDoc(id, 'EDGE_CASE', 'LOW', gt, content);
  }

  // Save manifests
  const manifest: DatasetManifest = {
    manifestVersion: '1.0.0',
    datasetVersion: '1.0.0-pilot',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalDocuments: manifestEntries.length,
    entries: manifestEntries,
  };

  fs.writeFileSync(
    path.join(DIRS.MANIFEST_DIR, 'dataset_manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );

  // Also write to benchmarks/dataset/manifest.json for Phase 4A loader compatibility
  const benchmarkManifest = {
    manifestVersion: '1.0.0',
    createdAt: new Date().toISOString(),
    totalDocuments: manifestEntries.length,
    documents: manifestEntries.map((e) => ({
      documentId: e.documentId,
      category: e.category,
      filePath: path.join(BENCHMARK_ROOT, 'dataset', e.relativeFilePath),
      fileFormat: 'png' as const,
      fileSizeBytes: 200,
      checksumSha256: e.checksumSha256,
      qualityLevel: e.qualityLevel,
      universityOrigin: 'Pilot University',
      groundTruthPath: path.join(DIRS.GROUND_TRUTH, e.groundTruthPath),
    })),
  };

  fs.writeFileSync(
    path.join(BENCHMARK_ROOT, 'dataset', 'manifest.json'),
    JSON.stringify(benchmarkManifest, null, 2),
    'utf-8'
  );

  console.log(`✅ Successfully prepared 25 Pilot Benchmark Documents!`);
  console.log(`   - 10 Marksheets`);
  console.log(`   - 5 Certificates`);
  console.log(`   - 5 Timetables`);
  console.log(`   - 5 Edge-Case / Low Quality Documents`);
  console.log(`   - Manifests saved to dataset-pipeline/manifests/ and dataset/manifest.json\n`);
}

if (require.main === module) {
  preparePilotDataset();
}
