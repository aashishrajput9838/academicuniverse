import { Buffer } from 'buffer';
import { Logger } from '../utils/logger';
import { DocxExtractionService } from '../docxExtraction.service';
import { SectionDetectorService } from './sectionDetector.service';
import { EntityDetectorService } from './entityDetector.service';
import { ConfidenceScorerService } from './confidenceScorer.service';
import { FormattingBuilderService } from './formattingBuilder.service';
import { ExtractionResultService } from './extractionResult.service';
import { PlaceholderInjector, InjectionResult } from './placeholderInjector.service';
import { DocxTemplateGenerator, GenerationResult } from './docxTemplateGenerator.service';
import { ExtractionOptions, Milestone2Result } from './milestone2.types';

const logger = new Logger('TemplateProcessingOrchestrator');

export interface ProcessedTemplate {
  success: boolean;
  originalBuffer: Buffer;
  extractedDoc: any;
  milestone2Result: Milestone2Result;
  injectionResult: InjectionResult;
  generationResult: GenerationResult;
  processedBuffer: Buffer;
  issues: string[];
}

export class TemplateProcessingOrchestrator {
  private docxService: DocxExtractionService;
  private extractionResultService: ExtractionResultService;
  private placeholderInjector: PlaceholderInjector;
  private docxGenerator: DocxTemplateGenerator;

  constructor(private options: ExtractionOptions = { enableAiAssistance: false }) {
    this.docxService = new DocxExtractionService();
    this.extractionResultService = new ExtractionResultService(options);
    this.placeholderInjector = new PlaceholderInjector();
    this.docxGenerator = new DocxTemplateGenerator();
  }

  async process(originalBuffer: Buffer): Promise<ProcessedTemplate> {
    const issues: string[] = [];

    try {
      const extractedDoc = await this.docxService.extract(originalBuffer);
      const milestone2Result = await this.extractionResultService.extract(extractedDoc);

      const injectionResult = await this.placeholderInjector.inject(
        originalBuffer,
        extractedDoc,
        milestone2Result.sections
      );

      if (!injectionResult.success) {
        issues.push(...injectionResult.issues);
      }

      const generationResult = await this.docxGenerator.generate(injectionResult.buffer);

      if (!generationResult.success) {
        issues.push(...generationResult.issues);
      }

      return {
        success: injectionResult.success && generationResult.success,
        originalBuffer,
        extractedDoc,
        milestone2Result,
        injectionResult,
        generationResult,
        processedBuffer: generationResult.buffer,
        issues,
      };
    } catch (error: any) {
      logger.error('Template processing failed:', error);
      return {
        success: false,
        originalBuffer,
        extractedDoc: null,
        milestone2Result: null,
        injectionResult: {
          success: false,
          placeholdersInjected: 0,
          issues: [error.message],
          buffer: Buffer.alloc(0),
        },
        generationResult: {
          success: false,
          buffer: Buffer.alloc(0),
          size: 0,
          issues: [error.message],
        },
        processedBuffer: Buffer.alloc(0),
        issues: [error.message],
      };
    }
  }
}
