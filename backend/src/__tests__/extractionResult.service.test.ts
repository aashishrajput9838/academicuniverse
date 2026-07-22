import { ExtractionResultService } from '../services/extractionResult.service';
import { ExtractedDocument, ExtractedParagraph, ExtractedRun } from '../docxExtraction.service';

const createRun = (text: string, overrides: Partial<ExtractedRun> = {}): ExtractedRun => ({
  paragraphIndex: 0,
  runIndex: 0,
  textIndex: 0,
  location: {
    paragraphIndex: 0,
    runIndex: 0,
    textIndex: 0,
    pathString: 'p[0]/r[0]/t[0]',
  },
  text,
  formatting: {
    bold: false,
    italic: false,
    underline: false,
  },
  ...overrides,
});

const createParagraph = (text: string, overrides: Partial<ExtractedParagraph> = {}): ExtractedParagraph => ({
  index: 0,
  runs: [createRun(text)],
  style: 'Normal',
  isHeading: false,
  rawText: text,
  ...overrides,
});

const createDocument = (paragraphs: ExtractedParagraph[]): ExtractedDocument => ({
  runs: paragraphs.flatMap(p => p.runs),
  paragraphs,
  hasTables: false,
  hasImages: false,
  placeholderCount: 0,
});

describe('ExtractionResultService', () => {
  let service: ExtractionResultService;

  beforeEach(() => {
    service = new ExtractionResultService({ enableAiAssistance: false });
  });

  it('produces complete result from ExtractedDocument', async () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('Summary', { index: 0, runs: [createRun('Summary')] }),
      createParagraph('I am a developer', { index: 1, runs: [createRun('I am a developer')] }),
      createParagraph('Skills', { index: 2, runs: [createRun('Skills')] }),
      createParagraph('Java Python', { index: 3, runs: [createRun('Java Python')] }),
    ];
    const doc = createDocument(paras);
    const result = await service.extract(doc);

    expect(result).toBeDefined();
    expect(result.sections).toBeDefined();
    expect(result.entities).toBeDefined();
    expect(result.confidence).toBeDefined();
    expect(result.formattingMetadata).toBeDefined();
    expect(result.extractionIssues).toBeDefined();
  });

  it('aggregates extraction issues from all services', async () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('Random text without headings', { index: 0, runs: [createRun('Random text without headings')] }),
    ];
    const doc = createDocument(paras);
    const result = await service.extract(doc);

    expect(result.extractionIssues.length).toBeGreaterThanOrEqual(1);
  });

  it('handles empty document gracefully', async () => {
    const doc = createDocument([]);
    const result = await service.extract(doc);

    expect(result.sections).toBeDefined();
    expect(Array.isArray(result.sections)).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('does not throw when document has no paragraphs', async () => {
    const doc = createDocument([]);
    await expect(service.extract(doc)).resolves.toBeDefined();
  });

  it('includes formatting metadata in result', async () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('Test', { index: 0, runs: [createRun('Test')] }),
    ];
    const doc = createDocument(paras);
    const result = await service.extract(doc);

    expect(result.formattingMetadata.styles).toBeDefined();
    expect(result.formattingMetadata.headingLevels).toBeDefined();
    expect(result.formattingMetadata.bulletMarker).toBeDefined();
    expect(result.formattingMetadata.dateFormat).toBeDefined();
  });
});
