import {
  Milestone2Result,
  ExtractedEntity,
  ExtractionIssue,
  ExtractionOptions,
} from './milestone2.types';
import { ExtractedDocument } from '../docxExtraction.service';
import { SectionDetectorService } from './sectionDetector.service';
import { EntityDetectorService } from './entityDetector.service';
import { ConfidenceScorerService } from './confidenceScorer.service';
import { FormattingBuilderService } from './formattingBuilder.service';

export class ExtractionResultService {
  private sectionDetector: SectionDetectorService;
  private entityDetector: EntityDetectorService;
  private confidenceScorer: ConfidenceScorerService;
  private formattingBuilder: FormattingBuilderService;

  constructor(private options: ExtractionOptions = { enableAiAssistance: false }) {
    this.sectionDetector = new SectionDetectorService(options);
    this.entityDetector = new EntityDetectorService({
      enableAiAssistance: options.enableAiAssistance,
      googleAiApiKey: process.env.GOOGLE_AI_API_KEY,
    });
    this.confidenceScorer = new ConfidenceScorerService();
    this.formattingBuilder = new FormattingBuilderService();
  }

  async extract(document: ExtractedDocument): Promise<Milestone2Result> {
    const allIssues: ExtractionIssue[] = [];

    const { sections, issues: sectionIssues } = this.sectionDetector.detect(document);
    allIssues.push(...sectionIssues);

    let entities: ExtractedEntity[] = [];
    try {
      const { entities: detectedEntities, issues: entityIssues } = await this.entityDetector.detect(document, sections);
      entities = detectedEntities;
      allIssues.push(...entityIssues);
    } catch (error: any) {
      allIssues.push({
        severity: 'error',
        message: `Entity detection failed: ${error.message}. Continuing with regex-only results.`,
      });
    }

    const formattingMetadata = this.formattingBuilder.build(document, sections);

    const result: Milestone2Result = {
      sections,
      entities,
      confidence: 0,
      formattingMetadata,
      extractionIssues: allIssues,
    };

    result.confidence = this.confidenceScorer.score(result);

    return result;
  }
}
