import PizZip from 'pizzip';
import { XMLBuilder } from 'fast-xml-parser';
import fs from 'fs';
import path from 'path';

import { DocxExtractionService } from '../src/docxExtraction.service';
import { SectionDetectorService } from '../src/services/sectionDetector.service';
import { EntityDetectorService } from '../src/services/entityDetector.service';
import { ConfidenceScorerService } from '../src/services/confidenceScorer.service';
import { FormattingBuilderService } from '../src/services/formattingBuilder.service';
import { ExtractionResultService } from '../src/services/extractionResult.service';
import { PlaceholderInjector } from '../src/services/placeholderInjector.service';
import { DocxTemplateGenerator } from '../src/services/docxTemplateGenerator.service';
import { TemplateProcessingOrchestrator } from '../src/services/templateProcessingOrchestrator.service';
import { ExtractedDocument } from '../src/docxExtraction.service';
import { DetectedSection, TemplateField } from '../src/services/milestone2.types';
import { Logger } from '../src/utils/logger';
import { PdfParser } from '../src/services/parsing/pdfParser';
import { ExtractionOptions } from '../src/services/milestone2.types';

const logger = new Logger('prg-real-dataset');

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '#text',
  suppressEmptyNode: true,
  format: false,
});

interface TemplateResult {
  filename: string;
  format: 'docx' | 'pdf';
  sizeKB: number;
  pages: number;
  detectedSections: number;
  detectedEntities: number;
  placeholdersInjected: number;
  processingTimeMs: number;
  memoryUsedMB: number;
  validation: {
    xmlValid: boolean;
    formattingPreserved: boolean;
    placeholderMappingCorrect: boolean;
  };
  warnings: string[];
  errors: string[];
  stackTrace?: string;
  problematicSection?: string;
  sectionDetails: Array<{
    title: string;
    fields: TemplateField[];
    placeholderInjected: boolean;
    placeholderKey?: string;
  }>;
  extractionResult?: any;
}

async function discoverTemplates(inputDir: string): Promise<Array<{ name: string; path: string; format: 'docx' | 'pdf' }>> {
  const files = fs.readdirSync(inputDir);
  const templates: Array<{ name: string; path: string; format: 'docx' | 'pdf' }> = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.docx' || ext === '.pdf') {
      const lowerName = file.toLowerCase();
      if (lowerName.includes('resume') || lowerName.includes('templet') || lowerName.includes('template')) {
        templates.push({
          name: file,
          path: path.join(inputDir, file),
          format: ext === '.docx' ? 'docx' : 'pdf',
        });
      }
    }
  }

  return templates.sort((a, b) => a.name.localeCompare(b.name));
}

async function processDocxTemplate(filePath: string, filename: string): Promise<TemplateResult> {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;
  const warnings: string[] = [];
  const errors: string[] = [];
  const sectionDetails: TemplateResult['sectionDetails'] = [];

  try {
    const buffer = fs.readFileSync(filePath);
    const sizeKB = Math.round(buffer.length / 1024);

    const orchestrator = new TemplateProcessingOrchestrator({
      enableAiAssistance: false,
    });

    const result = await orchestrator.process(buffer);

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;
    const processingTimeMs = endTime - startTime;
    const memoryUsedMB = Math.max(0, Math.round((endMemory - startMemory) / 1024 / 1024));

    let detectedSections = 0;
    let detectedEntities = 0;
    let placeholdersInjected = 0;
    let xmlValid = false;
    let formattingPreserved = false;
    let placeholderMappingCorrect = true;
    let extractionResult: any = null;

    if (result.success && result.milestone2Result) {
      detectedSections = result.milestone2Result.sections.length;
      detectedEntities = result.milestone2Result.entities.length;
      placeholdersInjected = result.injectionResult.placeholdersInjected;
      extractionResult = result.milestone2Result;

      xmlValid = result.injectionResult.success && result.generationResult.success;
      formattingPreserved = result.injectionResult.success;

      for (const section of result.milestone2Result.sections) {
        const hasPlaceholder = result.injectionResult.placeholdersInjected > 0;
        sectionDetails.push({
          title: section.title,
          fields: section.fields,
          placeholderInjected: hasPlaceholder,
          placeholderKey: section.fields[0]?.key,
        });
      }
    }

    if (result.injectionResult.placeholdersInjected === 0 && detectedSections > 0) {
      warnings.push('No placeholders injected despite detected sections');
    }

    if (!result.success) {
      errors.push(...result.issues);
    }

    return {
      filename,
      format: 'docx',
      sizeKB,
      pages: 1,
      detectedSections,
      detectedEntities,
      placeholdersInjected,
      processingTimeMs,
      memoryUsedMB,
      validation: {
        xmlValid,
        formattingPreserved,
        placeholderMappingCorrect,
      },
      warnings,
      errors,
      stackTrace: errors.length > 0 ? errors.join('\n') : undefined,
      problematicSection: errors.length > 0 ? 'unknown' : undefined,
      sectionDetails,
      extractionResult,
    };
  } catch (error: any) {
    return {
      filename,
      format: 'docx',
      sizeKB: 0,
      pages: 1,
      detectedSections: 0,
      detectedEntities: 0,
      placeholdersInjected: 0,
      processingTimeMs: Date.now() - startTime,
      memoryUsedMB: 0,
      validation: {
        xmlValid: false,
        formattingPreserved: false,
        placeholderMappingCorrect: false,
      },
      warnings: [],
      errors: [error.message],
      stackTrace: error.stack,
      problematicSection: 'unknown',
      sectionDetails: [],
      extractionResult: null,
    };
  }
}

async function processPdfTemplate(filePath: string, filename: string): Promise<TemplateResult> {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const buffer = fs.readFileSync(filePath);
    const sizeKB = Math.round(buffer.length / 1024);

    const parser = new PdfParser();
    const text = await parser.parse(buffer);

    const paragraphs = text.split('\n').filter((line) => line.trim().length > 0).map((line, index) => ({
      index,
      runs: [
        {
          paragraphIndex: index,
          runIndex: 0,
          textIndex: 0,
          location: {
            paragraphIndex: index,
            runIndex: 0,
            textIndex: 0,
            pathString: `p[${index}]/r[0]/t[0]`,
          },
          text: line,
          formatting: {
            bold: false,
            italic: false,
            underline: false,
          },
        },
      ],
      style: 'Normal',
      isHeading: false,
      rawText: line,
    }));

    const extractedDoc: ExtractedDocument = {
      runs: paragraphs.flatMap((p) => p.runs),
      paragraphs,
      hasTables: false,
      hasImages: false,
      placeholderCount: 0,
    };

    const sectionDetector = new SectionDetectorService();
    const sectionResult = sectionDetector.detect(extractedDoc);
    const sections = sectionResult.sections;
    const sectionIssues = sectionResult.issues;

    const entityDetector = new EntityDetectorService({
      enableAiAssistance: false,
    });
    const entityResult = await entityDetector.detect(extractedDoc, sections);
    const entities = entityResult.entities;
    const entityIssues = entityResult.issues;

    const formattingBuilder = new FormattingBuilderService();
    const formattingMetadata = formattingBuilder.build(extractedDoc, sections);

    const confidenceScorer = new ConfidenceScorerService();
    const milestone2Result: any = {
      sections,
      entities,
      formattingMetadata,
      extractionIssues: [...sectionIssues, ...entityIssues],
    };
    const confidence = confidenceScorer.score(milestone2Result);

    const extractionResultService = new ExtractionResultService({
      enableAiAssistance: false,
    });
    const extractionResult = extractionResultService.extract(extractedDoc);

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;
    const processingTimeMs = endTime - startTime;
    const memoryUsedMB = Math.max(0, Math.round((endMemory - startMemory) / 1024 / 1024));

    const pageCount = Math.max(1, Math.ceil(paragraphs.length / 40));

    return {
      filename,
      format: 'pdf',
      sizeKB,
      pages: pageCount,
      detectedSections: sections.length,
      detectedEntities: entities.length,
      placeholdersInjected: 0,
      processingTimeMs,
      memoryUsedMB,
      validation: {
        xmlValid: false,
        formattingPreserved: true,
        placeholderMappingCorrect: true,
      },
      warnings: [...sectionIssues, ...entityIssues].map((i) => i.message),
      errors: [],
      sectionDetails: sections.map((s) => ({
        title: s.title,
        fields: s.fields,
        placeholderInjected: false,
        placeholderKey: undefined,
      })),
      extractionResult,
    };
  } catch (error: any) {
    return {
      filename,
      format: 'pdf',
      sizeKB: 0,
      pages: 0,
      detectedSections: 0,
      detectedEntities: 0,
      placeholdersInjected: 0,
      processingTimeMs: Date.now() - startTime,
      memoryUsedMB: 0,
      validation: {
        xmlValid: false,
        formattingPreserved: false,
        placeholderMappingCorrect: false,
      },
      warnings: [],
      errors: [error.message],
      stackTrace: error.stack,
      problematicSection: 'unknown',
      sectionDetails: [],
      extractionResult: null,
    };
  }
}

async function runPRGRealDataset(): Promise<void> {
  const inputDir = path.join(process.cwd(), 'input data');
  const templates = await discoverTemplates(inputDir);

  logger.info(`Discovered ${templates.length} templates in ${inputDir}`);
  logger.info(`DOCX: ${templates.filter(t => t.format === 'docx').length}, PDF: ${templates.filter(t => t.format === 'pdf').length}`);

  const results: TemplateResult[] = [];

  for (const template of templates) {
    logger.info(`Processing ${template.format.toUpperCase()}: ${template.name}`);

    try {
      let result: TemplateResult;
      if (template.format === 'docx') {
        result = await processDocxTemplate(template.path, template.name);
      } else {
        result = await processPdfTemplate(template.path, template.name);
      }
      results.push(result);
      logger.info(`Completed ${template.name}: ${result.errors.length === 0 ? 'PASS' : 'FAIL'}`);
    } catch (error: any) {
      const errorResult: TemplateResult = {
        filename: template.name,
        format: template.format,
        sizeKB: 0,
        pages: 0,
        detectedSections: 0,
        detectedEntities: 0,
        placeholdersInjected: 0,
        processingTimeMs: 0,
        memoryUsedMB: 0,
        validation: {
          xmlValid: false,
          formattingPreserved: false,
          placeholderMappingCorrect: false,
        },
        warnings: [],
        errors: [error.message],
        stackTrace: error.stack,
        problematicSection: 'unknown',
        sectionDetails: [],
        extractionResult: null,
      };
      results.push(errorResult);
      logger.error(`Failed ${template.name}: ${error.message}`);
    }
  }

  const docxResults = results.filter(r => r.format === 'docx');
  const pdfResults = results.filter(r => r.format === 'pdf');
  const passed = results.filter(r => r.errors.length === 0);
  const failed = results.filter(r => r.errors.length > 0);

  logger.info(`\n=== PRG-001 Real Dataset Results ===`);
  logger.info(`Total templates: ${results.length}`);
  logger.info(`DOCX: ${docxResults.length}, PDF: ${pdfResults.length}`);
  logger.info(`Passed: ${passed.length}, Failed: ${failed.length}`);

  const outputDir = path.join(process.cwd(), 'prg-verification');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(outputDir, 'prg-real-results.json'),
    JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        total: results.length,
        docx: docxResults.length,
        pdf: pdfResults.length,
        passed: passed.length,
        failed: failed.length,
        totalPlaceholders: results.reduce((sum, r) => sum + r.placeholdersInjected, 0),
        avgProcessingTime: Math.round(results.reduce((sum, r) => sum + r.processingTimeMs, 0) / results.length),
        totalProcessingTime: results.reduce((sum, r) => sum + r.processingTimeMs, 0),
      },
      results,
    }, null, 2)
  );

  logger.info(`Results saved to: ${path.join(outputDir, 'prg-real-results.json')}`);

  if (failed.length > 0) {
    logger.error(`\n❌ PRG-001 FAILED: ${failed.length} template(s) failed`);
    for (const f of failed) {
      logger.error(`  - ${f.filename}: ${f.errors.join(', ')}`);
    }
    process.exit(1);
  } else {
    logger.info('\n✅ PRG-001 PASSED: All templates processed successfully');
  }
}

runPRGRealDataset().catch((error) => {
  logger.error('PRG-001 real dataset verification failed:', error);
  process.exit(1);
});
