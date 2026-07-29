/**
 * Academic Universe — Synthetic Dataset Generation Orchestrator Pipeline
 * Orchestrates deterministic generation of synthetic academic documents & Ground Truth JSON records.
 *
 * DESIGN INVARIANT: Output is written to isolated `synthetic-dataset/` folder by default.
 * Datasets are ONLY imported into Dataset Manager upon explicit invocation.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ExtendedCategory } from '../../dataset-manager/types/datasetManager.types';
import { DatasetManagerService } from '../../dataset-manager/manager/datasetManagerService';
import {
  SyntheticGenerationConfig,
  SyntheticManifestEntry,
  GenerationReport,
  SyntheticDocumentData,
} from '../types/syntheticGenerator.types';
import { SeededRandom } from '../core/seededRandom';
import { DataFabricator } from '../core/dataFabricator';
import {
  TemplateEngine,
  DefaultTemplateA,
  DefaultTemplateB,
  DefaultTemplateC,
  DefaultTemplateD,
} from '../core/templateEngine';
import { QualityProfileManager } from '../core/qualityProfiles';
import { MarksheetGenerator } from '../generators/marksheetGenerator';
import { CertificateGenerator } from '../generators/certificateGenerator';
import { TranscriptGenerator } from '../generators/transcriptGenerator';
import { TimetableGenerator } from '../generators/timetableGenerator';
import { AdmitCardGenerator } from '../generators/admitCardGenerator';
import { FeeReceiptGenerator } from '../generators/feeReceiptGenerator';
import { StudentIdGenerator } from '../generators/studentIdGenerator';
import { GroundTruthBuilder } from './groundTruthBuilder';
import { ManifestBuilder } from './manifestBuilder';
import { QualityChecker } from './qualityChecker';

export class SyntheticPipeline {
  private benchmarkRoot: string;
  private templateEngine: TemplateEngine;

  constructor(benchmarkRoot: string) {
    this.benchmarkRoot = benchmarkRoot;
    this.templateEngine = new TemplateEngine();

    // Register built-in templates
    this.templateEngine.registerTemplate(new DefaultTemplateA());
    this.templateEngine.registerTemplate(new DefaultTemplateB());
    this.templateEngine.registerTemplate(new DefaultTemplateC());
    this.templateEngine.registerTemplate(new DefaultTemplateD());
  }

  /** Run end-to-end synthetic dataset generation */
  async generateDataset(config: SyntheticGenerationConfig): Promise<{
    outputDir: string;
    totalDocuments: number;
    report: GenerationReport;
  }> {
    const startTime = Date.now();
    const seed = config.seed || 42;
    const count = config.count || 25;

    const outputDir = config.outputDir || path.join(this.benchmarkRoot, 'synthetic-dataset');
    const docsDir = path.join(outputDir, 'documents');
    const gtDir = path.join(outputDir, 'ground-truth');

    [outputDir, docsDir, gtDir].forEach((d) => {
      if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    });

    const masterRng = new SeededRandom(seed);
    const categories: ExtendedCategory[] =
      config.categories && config.categories.length > 0
        ? config.categories
        : [
            'MARKSHEET',
            'TRANSCRIPT',
            'CERTIFICATE',
            'WORKSHOP_CERTIFICATE',
            'INTERNSHIP_CERTIFICATE',
            'HACKATHON_CERTIFICATE',
            'TIMETABLE',
            'EXAM_TIMETABLE',
            'ADMIT_CARD',
            'FEE_RECEIPT',
            'STUDENT_ID',
          ];

    const availableTemplates = config.templateIds && config.templateIds.length > 0
      ? config.templateIds
      : this.templateEngine.getAllTemplateIds();

    const manifestEntries: SyntheticManifestEntry[] = [];
    const categoryBreakdown: Record<string, number> = {};
    const qualityBreakdown: Record<string, number> = {};
    const templateBreakdown: Record<string, number> = {};

    console.log(`🚀 Generating ${count} synthetic documents (Seed: ${seed})...`);

    for (let i = 1; i <= count; i++) {
      // Deterministic child seed per document
      const docSeed = masterRng.childSeed();
      const docRng = new SeededRandom(docSeed);
      const fabricator = new DataFabricator(docRng);

      const category = docRng.pick(categories);
      const templateId = docRng.pick(availableTemplates);
      const template = this.templateEngine.getTemplate(templateId);

      const qualityProfile = QualityProfileManager.selectProfile(docRng, config.qualityDistributions);

      // Deterministic document ID e.g. SYNTH_MS_001
      const prefix = this.getPrefixForCategory(category);
      const documentId = `SYNTH_${prefix}_${String(i).padStart(3, '0')}`;
      const canonicalFilename = `${documentId}.pdf`;
      const originalFilename = `synthetic_${category.toLowerCase()}_${i}.pdf`;

      // Fabricate student data
      const student = fabricator.generateStudentProfile();
      const sem1 = fabricator.generateSemesterRecord(1);
      const sem2 = fabricator.generateSemesterRecord(2);
      const cgpa = parseFloat(((sem1.sgpa + sem2.sgpa) / 2).toFixed(2));
      const issueDate = docRng.nextDate(2023, 2026);

      const docData: SyntheticDocumentData = {
        documentId,
        category,
        templateId,
        seed: docSeed,
        student,
        semesterRecords: [sem1, sem2],
        cgpa,
        issueDate,
        qualityProfile,
        customData: {
          syntheticWatermark: config.syntheticWatermarkText || 'SYNTHETIC RESEARCH DATASET',
        },
      };

      // 1. Generate PDF
      const pdfBytes = await this.renderPdf(docData, template);
      const pdfPath = path.join(docsDir, canonicalFilename);
      fs.writeFileSync(pdfPath, pdfBytes);

      // 2. Optionally generate PNG for OpenRouter vision compatibility
      let pngPath: string | undefined;
      try {
        const { pdfToImg } = require('pdf-to-img');
        const pngFileName = `${documentId}.png`;
        const pngFilePath = path.join(docsDir, pngFileName);
        const pngBuffer = await pdfToImg(pdfBytes, { format: 'png', density: 200 });
        fs.writeFileSync(pngFilePath, pngBuffer);
        pngPath = pngFilePath;
      } catch {
        // pdf-to-img not available (requires poppler system libraries); PNG will not be generated
      }

      const checksumSha256 = crypto.createHash('sha256').update(pdfBytes).digest('hex');

      // 2. Build & Save Ground Truth JSON
      const gtSchema = GroundTruthBuilder.buildGroundTruth(docData);
      const gtRelPath = path.join('ground-truth', `${documentId}.json`);
      const gtAbsPath = path.join(outputDir, gtRelPath);
      fs.writeFileSync(gtAbsPath, JSON.stringify(gtSchema, null, 2), 'utf-8');

      // Record manifest entry
      const entry: SyntheticManifestEntry = {
        documentId,
        originalFilename,
        canonicalFilename,
        category,
        generationSeed: docSeed,
        templateId,
        templateName: template.config.name,
        generatorVersion: '1.1.0',
        qualityProfile: qualityProfile.name,
        synthetic: true,
        generatedTimestamp: new Date().toISOString(),
        checksumSha256,
        fileSizeBytes: pdfBytes.length,
        groundTruthFile: gtRelPath,
        relativeDocPath: path.join('documents', canonicalFilename),
        pngPath,
      };

      manifestEntries.push(entry);

      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
      qualityBreakdown[qualityProfile.name] = (qualityBreakdown[qualityProfile.name] || 0) + 1;
      templateBreakdown[templateId] = (templateBreakdown[templateId] || 0) + 1;
    }

    // 3. Save Manifest & Metadata
    const { manifestHash } = ManifestBuilder.saveManifestAndMetadata(
      outputDir,
      seed,
      '1.1.0',
      manifestEntries
    );

    // 4. Validate Generated Dataset
    const validation = QualityChecker.validateDataset(outputDir);

    const durationMs = Date.now() - startTime;

    const report: GenerationReport = {
      experimentSeed: seed,
      generatorVersion: '1.1.0',
      generatedTimestamp: new Date().toISOString(),
      totalDocuments: manifestEntries.length,
      categoryBreakdown,
      qualityProfileBreakdown: qualityBreakdown,
      templateBreakdown,
      validationStatus: validation.isValid ? 'PASSED' : 'FAILED',
      validationErrors: validation.errors,
      manifestHash,
      generationDurationMs: durationMs,
    };

    // 5. Save generation-report.md
    ManifestBuilder.saveReport(outputDir, report);

    console.log(`✅ Synthetic generation complete: ${count} documents created in ${(durationMs / 1000).toFixed(2)}s`);
    return { outputDir, totalDocuments: manifestEntries.length, report };
  }

  /**
   * Explicit action: Import generated synthetic dataset into the existing Dataset Manager
   * Copies documents to benchmarks/dataset/RAW/ and triggers DatasetManagerService
   */
  importToDatasetManager(outputDir: string): { importedCount: number } {
    const rawDir = path.join(this.benchmarkRoot, 'dataset', 'RAW');
    if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });

    const docsDir = path.join(outputDir, 'documents');
    if (!fs.existsSync(docsDir)) {
      throw new Error(`Synthetic documents directory not found at: ${docsDir}`);
    }

    const files = fs.readdirSync(docsDir).filter((f) => f.endsWith('.pdf'));
    let count = 0;

    files.forEach((file) => {
      const src = path.join(docsDir, file);
      const dest = path.join(rawDir, file);
      try {
        fs.copyFileSync(src, dest);
      } catch (err: any) {
        if (err.code !== 'EBUSY') throw err;
      }
      count++;
    });

    // Copy GT JSON files to ground-truth/ directory
    const synthGtDir = path.join(outputDir, 'ground-truth');
    const targetGtDir = path.join(this.benchmarkRoot, 'ground-truth');
    if (!fs.existsSync(targetGtDir)) fs.mkdirSync(targetGtDir, { recursive: true });

    if (fs.existsSync(synthGtDir)) {
      const gtFiles = fs.readdirSync(synthGtDir).filter((f) => f.endsWith('.json'));
      gtFiles.forEach((file) => {
        const src = path.join(synthGtDir, file);
        const dest = path.join(targetGtDir, file);
        try { fs.copyFileSync(src, dest); } catch {}
      });
    }

    // Trigger existing Dataset Manager scanning & organization
    const managerService = new DatasetManagerService(this.benchmarkRoot);
    managerService.processRawDataset();

    return { importedCount: count };
  }

  private async renderPdf(data: SyntheticDocumentData, template: any): Promise<Uint8Array> {
    switch (data.category) {
      case 'MARKSHEET':
        return MarksheetGenerator.generate(data, template);
      case 'TRANSCRIPT':
        return TranscriptGenerator.generate(data, template);
      case 'CERTIFICATE':
      case 'WORKSHOP_CERTIFICATE':
      case 'INTERNSHIP_CERTIFICATE':
      case 'HACKATHON_CERTIFICATE':
        return CertificateGenerator.generate(data, template);
      case 'TIMETABLE':
      case 'EXAM_TIMETABLE':
        return TimetableGenerator.generate(data, template);
      case 'ADMIT_CARD':
        return AdmitCardGenerator.generate(data, template);
      case 'FEE_RECEIPT':
        return FeeReceiptGenerator.generate(data, template);
      case 'STUDENT_ID':
        return StudentIdGenerator.generate(data, template);
      default:
        return MarksheetGenerator.generate(data, template);
    }
  }

  private getPrefixForCategory(cat: ExtendedCategory): string {
    const prefixes: Record<ExtendedCategory, string> = {
      MARKSHEET: 'MS',
      TRANSCRIPT: 'TR',
      CERTIFICATE: 'CERT',
      WORKSHOP_CERTIFICATE: 'CERT_WS',
      INTERNSHIP_CERTIFICATE: 'CERT_INT',
      HACKATHON_CERTIFICATE: 'CERT_HACK',
      TIMETABLE: 'TT',
      EXAM_TIMETABLE: 'TT_EXAM',
      ADMIT_CARD: 'ADMIT',
      FEE_RECEIPT: 'FEE',
      STUDENT_ID: 'ID',
      UNKNOWN: 'UNK',
    };
    return prefixes[cat] || 'DOC';
  }
}
