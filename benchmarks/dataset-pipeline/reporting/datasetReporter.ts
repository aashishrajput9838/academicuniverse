/**
 * Academic Universe — Dataset Reporter
 * Generates publication-ready dataset statistics, QA reports, progress metrics, and markdown tables.
 */

import fs from 'fs';
import path from 'path';
import {
  DatasetManifest,
  DatasetQAReport,
  DocumentCategory,
  QualityLevel,
} from '../types/dataset.types';
import { AnnotationManager } from '../annotations/annotationManager';
import { DatasetValidator } from '../validation/datasetValidator';

export class DatasetReporter {
  private benchmarkRoot: string;
  private annotationManager: AnnotationManager;
  private validator: DatasetValidator;
  private reportsDir: string;

  constructor(benchmarkRoot: string) {
    this.benchmarkRoot = benchmarkRoot;
    this.annotationManager = new AnnotationManager(benchmarkRoot);
    this.validator = new DatasetValidator(benchmarkRoot);
    this.reportsDir = path.join(benchmarkRoot, 'dataset-pipeline', 'reports');
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /** Generate comprehensive QA & Dataset report */
  async generateQAReport(manifest: DatasetManifest): Promise<DatasetQAReport> {
    const valReport = await this.validator.validate(manifest);
    const progress = this.annotationManager.computeProgress(manifest);

    // Distribution by category
    const catDist: Record<DocumentCategory, number> = {
      MARKSHEET: 0,
      CERTIFICATE: 0,
      TIMETABLE: 0,
      EDGE_CASE: 0,
    };

    // Distribution by quality
    const qualDist: Record<QualityLevel, number> = {
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      SCANNED: 0,
    };

    for (const entry of manifest.entries) {
      if (entry.category in catDist) catDist[entry.category]++;
      if (entry.qualityLevel in qualDist) qualDist[entry.qualityLevel]++;
    }

    const dupes = valReport.issues.filter((i) => i.code === 'DUPLICATE_CONTENT' || i.code === 'DUPLICATE_ID').length;
    const schemaErrors = valReport.issues.filter((i) => i.code === 'GT_SCHEMA_VIOLATION').length;
    const incomplete = valReport.issues.filter((i) => i.code === 'GT_INCOMPLETE').length;

    const report: DatasetQAReport = {
      generatedAt: new Date().toISOString(),
      datasetVersion: manifest.datasetVersion || '1.0.0',
      totalDocuments: manifest.totalDocuments,
      categoryDistribution: catDist,
      qualityDistribution: qualDist,
      annotationProgress: progress,
      duplicateGroups: dupes,
      piiRisks: 0,
      schemaViolations: schemaErrors,
      incompleteAnnotations: incomplete,
    };

    // Save JSON report
    fs.writeFileSync(
      path.join(this.reportsDir, `dataset_qa_report_${Date.now()}.json`),
      JSON.stringify(report, null, 2),
      'utf-8'
    );

    return report;
  }

  /** Export publication-ready Markdown table summarizing dataset distribution (Table III in paper) */
  exportPublicationMarkdown(manifest: DatasetManifest): string {
    const reportSync = this.generateSummarySync(manifest);

    const mdLines = [
      '# Dataset Breakdown & Benchmark Characteristics',
      `**Dataset Version:** ${manifest.datasetVersion} | **Total Samples ($N$):** ${manifest.totalDocuments}`,
      '',
      '| Document Category | Count ($n$) | Percentage (%) | Formats | Quality Levels | Target Benchmark Focus |',
      '| :--- | :---: | :---: | :--- | :--- | :--- |',
      `| **Semester Marksheets** | ${reportSync.categoryDist.MARKSHEET} | ${((reportSync.categoryDist.MARKSHEET / (manifest.totalDocuments || 1)) * 100).toFixed(1)}% | PDF, PNG, JPG | High, Medium, Scanned | Field Extraction, SGPA/CGPA, Course Marks Array |`,
      `| **Degree Certificates** | ${reportSync.categoryDist.CERTIFICATE} | ${((reportSync.categoryDist.CERTIFICATE / (manifest.totalDocuments || 1)) * 100).toFixed(1)}% | PDF, JPG | High, Scanned | Student Name, Degree, Institution, Date |`,
      `| **Section Timetables** | ${reportSync.categoryDist.TIMETABLE} | ${((reportSync.categoryDist.TIMETABLE / (manifest.totalDocuments || 1)) * 100).toFixed(1)}% | PDF, PNG | Medium, High | Complex Grid Layouts, Multi-Column Extraction |`,
      `| **Edge-Case Captures** | ${reportSync.categoryDist.EDGE_CASE} | ${((reportSync.categoryDist.EDGE_CASE / (manifest.totalDocuments || 1)) * 100).toFixed(1)}% | JPG | Low, Blurry, Rotated | Robustness, Fallback Recovery Rate |`,
      `| **TOTAL** | **${manifest.totalDocuments}** | **100.0%** | — | — | — |`,
      '',
      '## Annotation & QA Summary',
      `- **Completion Progress:** ${reportSync.progress.completionPct.toFixed(1)}% (${reportSync.progress.verified + reportSync.progress.annotated} / ${manifest.totalDocuments})`,
      `- **Verified Samples:** ${reportSync.progress.verified}`,
      `- **Pending Review:** ${reportSync.progress.pending + reportSync.progress.inProgress}`,
      `- **Conflicts Needing Tie-Break:** ${reportSync.progress.conflict}`,
    ];

    const md = mdLines.join('\n');
    fs.writeFileSync(path.join(this.reportsDir, 'dataset_summary_publication.md'), md, 'utf-8');
    return md;
  }

  private generateSummarySync(manifest: DatasetManifest) {
    const catDist: Record<DocumentCategory, number> = { MARKSHEET: 0, CERTIFICATE: 0, TIMETABLE: 0, EDGE_CASE: 0 };
    for (const entry of manifest.entries) {
      if (entry.category in catDist) catDist[entry.category]++;
    }
    const progress = this.annotationManager.computeProgress(manifest);
    return { categoryDist: catDist, progress };
  }
}
