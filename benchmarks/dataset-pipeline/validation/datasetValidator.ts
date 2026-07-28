/**
 * Academic Universe — Dataset Validation Engine
 * Automatically validates every document in the manifest:
 *   • File existence and readability
 *   • SHA-256 checksum integrity
 *   • Ground truth availability and schema validity
 *   • Metadata completeness
 *   • Duplicate detection
 *   • Filename convention
 * Generates structured ValidationReports.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {
  DatasetManifest,
  ManifestEntry,
  ValidationIssue,
  ValidationReport,
} from '../types/dataset.types';
import { GROUND_TRUTH_JSON_SCHEMA } from '../schemas/groundTruth.schema';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validateGT = ajv.compile(GROUND_TRUTH_JSON_SCHEMA);

const VALID_ID_PATTERN = /^(MS|CERT|TT|EC)_[A-Z0-9]+_\d{3}$/;

export class DatasetValidator {
  private datasetRoot: string;
  private groundTruthDir: string;
  private metadataDir: string;
  private reportDir: string;

  constructor(benchmarkRoot: string) {
    this.datasetRoot = path.join(benchmarkRoot, 'dataset');
    this.groundTruthDir = path.join(benchmarkRoot, 'ground-truth');
    this.metadataDir = path.join(benchmarkRoot, 'dataset-pipeline', 'metadata');
    this.reportDir = path.join(benchmarkRoot, 'dataset-pipeline', 'validation');
    if (!fs.existsSync(this.reportDir)) fs.mkdirSync(this.reportDir, { recursive: true });
  }

  /** Run full validation against all manifest entries */
  async validate(manifest: DatasetManifest): Promise<ValidationReport> {
    const issues: ValidationIssue[] = [];
    const checkedIds = new Set<string>();
    const checksumSeen = new Map<string, string>();

    for (const entry of manifest.entries) {
      const docIssues = await this.validateEntry(entry, checkedIds, checksumSeen);
      issues.push(...docIssues);
      checkedIds.add(entry.documentId);
    }

    const errorCount = issues.filter((i) => i.severity === 'ERROR').length;
    const warningCount = issues.filter((i) => i.severity === 'WARNING').length;

    const report: ValidationReport = {
      generatedAt: new Date().toISOString(),
      totalChecked: manifest.entries.length,
      errorCount,
      warningCount,
      passCount: manifest.entries.length - new Set(issues.filter((i) => i.severity === 'ERROR').map((i) => i.documentId)).size,
      issues,
    };

    this.saveReport(report);
    return report;
  }

  /** Validate a single manifest entry */
  private async validateEntry(
    entry: ManifestEntry,
    checkedIds: Set<string>,
    checksumSeen: Map<string, string>
  ): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];
    const id = entry.documentId;

    // 1. Duplicate document ID
    if (checkedIds.has(id)) {
      issues.push({ documentId: id, severity: 'ERROR', code: 'DUPLICATE_ID', message: `Duplicate documentId: ${id}` });
    }

    // 2. Filename convention
    if (!VALID_ID_PATTERN.test(id)) {
      issues.push({ documentId: id, severity: 'WARNING', code: 'INVALID_ID_FORMAT', message: `documentId "${id}" does not match pattern PREFIX_ORG_NNN` });
    }

    // 3. File existence
    const filePath = path.join(this.datasetRoot, entry.relativeFilePath);
    if (!fs.existsSync(filePath)) {
      issues.push({ documentId: id, severity: 'ERROR', code: 'FILE_NOT_FOUND', message: `Document file not found: ${filePath}` });
    } else {
      // 4. Zero-byte file
      const stat = fs.statSync(filePath);
      if (stat.size === 0) {
        issues.push({ documentId: id, severity: 'ERROR', code: 'EMPTY_FILE', message: `File is 0 bytes (likely corrupt): ${filePath}` });
      }

      // 5. Checksum integrity
      const actualChecksum = await this.computeSha256(filePath);
      if (actualChecksum !== entry.checksumSha256) {
        issues.push({
          documentId: id,
          severity: 'ERROR',
          code: 'CHECKSUM_MISMATCH',
          message: `Checksum mismatch — expected: ${entry.checksumSha256}, actual: ${actualChecksum}`,
        });
      }

      // 6. Duplicate checksum (different ID, same file content)
      if (checksumSeen.has(actualChecksum)) {
        issues.push({
          documentId: id,
          severity: 'ERROR',
          code: 'DUPLICATE_CONTENT',
          message: `Duplicate file content detected — same checksum as: ${checksumSeen.get(actualChecksum)}`,
        });
      } else {
        checksumSeen.set(actualChecksum, id);
      }
    }

    // 7. Ground truth existence
    const gtPath = path.join(this.groundTruthDir, entry.groundTruthPath);
    if (!fs.existsSync(gtPath)) {
      issues.push({ documentId: id, severity: 'ERROR', code: 'GT_NOT_FOUND', message: `Ground truth not found: ${gtPath}` });
    } else {
      // 8. Ground truth JSON validity
      let gtData: unknown;
      try {
        gtData = JSON.parse(fs.readFileSync(gtPath, 'utf-8'));
      } catch (e: any) {
        issues.push({ documentId: id, severity: 'ERROR', code: 'GT_INVALID_JSON', message: `Ground truth is not valid JSON: ${e.message}` });
        gtData = null;
      }

      // 9. Ground truth schema compliance
      if (gtData !== null) {
        const valid = validateGT(gtData);
        if (!valid && validateGT.errors) {
          for (const err of validateGT.errors) {
            issues.push({
              documentId: id,
              severity: 'ERROR',
              code: 'GT_SCHEMA_VIOLATION',
              message: `GT schema error at ${err.instancePath}: ${err.message}`,
            });
          }
        }

        // 10. Annotation completeness check for non-EDGE_CASE
        const gt = gtData as any;
        if (entry.category === 'MARKSHEET') {
          if (!gt.studentName) issues.push({ documentId: id, severity: 'WARNING', code: 'GT_INCOMPLETE', message: 'studentName is null in MARKSHEET annotation' });
          if (!gt.rollNumber) issues.push({ documentId: id, severity: 'WARNING', code: 'GT_INCOMPLETE', message: 'rollNumber is null in MARKSHEET annotation' });
          if (!gt.courseMarks || gt.courseMarks.length === 0) {
            issues.push({ documentId: id, severity: 'WARNING', code: 'GT_INCOMPLETE', message: 'courseMarks is empty in MARKSHEET annotation' });
          }
          // Check marks validity
          for (const cm of (gt.courseMarks || [])) {
            if (cm.marksObtained > cm.maxMarks) {
              issues.push({ documentId: id, severity: 'ERROR', code: 'GT_MARKS_INVALID', message: `courseCode ${cm.courseCode}: marksObtained (${cm.marksObtained}) > maxMarks (${cm.maxMarks})` });
            }
          }
        }
      }
    }

    // 11. Metadata existence
    const metaPath = path.join(this.metadataDir, entry.metadataPath);
    if (!fs.existsSync(metaPath)) {
      issues.push({ documentId: id, severity: 'WARNING', code: 'METADATA_NOT_FOUND', message: `Metadata file not found: ${metaPath}` });
    }

    return issues;
  }

  /** Print a summary of the validation report to console */
  printSummary(report: ValidationReport): void {
    console.log('\n' + '═'.repeat(60));
    console.log('  DATASET VALIDATION REPORT');
    console.log('═'.repeat(60));
    console.log(`  Total checked:  ${report.totalChecked}`);
    console.log(`  ✅ Passed:      ${report.passCount}`);
    console.log(`  ❌ Errors:      ${report.errorCount}`);
    console.log(`  ⚠️  Warnings:   ${report.warningCount}`);
    console.log('─'.repeat(60));

    if (report.issues.length > 0) {
      const errors = report.issues.filter((i) => i.severity === 'ERROR');
      const warnings = report.issues.filter((i) => i.severity === 'WARNING');
      if (errors.length > 0) {
        console.log('\n  ERRORS:');
        errors.slice(0, 20).forEach((e) => console.log(`    [${e.documentId}] ${e.code}: ${e.message}`));
        if (errors.length > 20) console.log(`    ... and ${errors.length - 20} more errors`);
      }
      if (warnings.length > 0) {
        console.log('\n  WARNINGS:');
        warnings.slice(0, 10).forEach((w) => console.log(`    [${w.documentId}] ${w.code}: ${w.message}`));
        if (warnings.length > 10) console.log(`    ... and ${warnings.length - 10} more warnings`);
      }
    }
    console.log('═'.repeat(60) + '\n');
  }

  private saveReport(report: ValidationReport): void {
    const filePath = path.join(this.reportDir, `validation_report_${Date.now()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`  📄 Validation report saved: ${filePath}`);
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
}
