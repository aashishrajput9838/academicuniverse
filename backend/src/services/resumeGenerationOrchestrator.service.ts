import PizZip from 'pizzip';
import { Logger } from '../utils/logger';
import { DocxExtractionService } from '../docxExtraction.service';
import { ExtractionResultService } from './extractionResult.service';
import { PlaceholderInjector } from './placeholderInjector.service';
import { DocxTemplateGenerator } from './docxTemplateGenerator.service';
import { DocxTemplateFiller, FillerResult } from './docxTemplateFiller.service';
import { ExtractionOptions, Milestone2Result } from './milestone2.types';

const logger = new Logger('ResumeGenerationOrchestrator');

export interface GenerationOrchestratorResult {
  success: boolean;
  docxBuffer: Buffer;
  htmlPreview: string;
  validationResult: any;
  milestone2Result: Milestone2Result;
  injectionResult: any;
  fillerResult: FillerResult;
  issues: string[];
}

export class ResumeGenerationOrchestrator {
  private docxService: DocxExtractionService;
  private extractionResultService: ExtractionResultService;
  private placeholderInjector: PlaceholderInjector;
  private docxGenerator: DocxTemplateGenerator;
  private templateFiller: DocxTemplateFiller;

  constructor(private options: ExtractionOptions = { enableAiAssistance: false }) {
    this.docxService = new DocxExtractionService();
    this.extractionResultService = new ExtractionResultService(options);
    this.placeholderInjector = new PlaceholderInjector();
    this.docxGenerator = new DocxTemplateGenerator();
    this.templateFiller = new DocxTemplateFiller();
  }

  async generate(originalBuffer: Buffer, studentData: Record<string, any>): Promise<GenerationOrchestratorResult> {
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

      const fillerResult = await this.templateFiller.fill(
        generationResult.buffer,
        studentData,
        milestone2Result.sections,
        injectionResult.dataKeyMapping
      );

      if (!fillerResult.success) {
        issues.push(...fillerResult.issues);
      }

      return {
        success: fillerResult.success,
        docxBuffer: fillerResult.docxBuffer,
        htmlPreview: fillerResult.htmlPreview,
        validationResult: fillerResult.validation,
        milestone2Result,
        injectionResult,
        fillerResult,
        issues,
      };
    } catch (error: any) {
      logger.error('Resume generation failed:', error);
      return {
        success: false,
        docxBuffer: Buffer.alloc(0),
        htmlPreview: '',
        validationResult: null,
        milestone2Result: null,
        injectionResult: null,
        fillerResult: {
          success: false,
          docxBuffer: Buffer.alloc(0),
          htmlPreview: '',
          validation: { valid: false, issues: [], data: {} },
          issues: [error.message],
        },
        issues: [error.message],
      };
    }
  }
}
