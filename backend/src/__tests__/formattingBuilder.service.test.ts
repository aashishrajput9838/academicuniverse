import { FormattingBuilderService } from '../services/formattingBuilder.service';
import { ExtractedDocument, ExtractedParagraph, ExtractedRun, DocxLocation } from '../docxExtraction.service';
import { DetectedSection } from '../services/milestone2.types';

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

const createSection = (title: string): DetectedSection => ({
  id: 'test-id',
  title,
  order: 0,
  repeatable: false,
  fields: [],
});

describe('FormattingBuilderService', () => {
  let service: FormattingBuilderService;

  beforeEach(() => {
    service = new FormattingBuilderService();
  });

  it('builds styles from formatting signatures', () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('Bold text', { runs: [createRun('Bold', { formatting: { bold: true, italic: false, underline: false, fontSize: 12 } }), createRun(' text', { formatting: { bold: true, italic: false, underline: false, fontSize: 12 } })] }),
      createParagraph('Regular text', { runs: [createRun('Regular', { formatting: { bold: false, italic: false, underline: false, fontSize: 11 } }), createRun(' text', { formatting: { bold: false, italic: false, underline: false, fontSize: 11 } })] }),
    ];
    const doc = createDocument(paras);
    const result = service.build(doc, []);

    const styleKeys = Object.keys(result.styles);
    expect(styleKeys.length).toBeGreaterThanOrEqual(1);
    expect(result.styles).toBeDefined();
  });

  it('detects bullet markers', () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('• Java', { runs: [createRun('• Java')] }),
      createParagraph('• Python', { runs: [createRun('• Python')] }),
    ];
    const doc = createDocument(paras);
    const result = service.build(doc, []);

    expect(result.bulletMarker).toBe('•');
  });

  it('detects numbered bullet markers', () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('1. First item', { runs: [createRun('1. First item')] }),
      createParagraph('2. Second item', { runs: [createRun('2. Second item')] }),
    ];
    const doc = createDocument(paras);
    const result = service.build(doc, []);

    expect(result.bulletMarker).toBe('numbered');
  });

  it('detects date formats', () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('Jan 2023 - Dec 2023', { runs: [createRun('Jan 2023 - Dec 2023')] }),
    ];
    const doc = createDocument(paras);
    const result = service.build(doc, [createSection('Experience')]);

    expect(result.dateFormat).toBe('MMM YYYY');
  });

  it('returns unknown date format for blank sections', () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('Random text', { runs: [createRun('Random text')] }),
    ];
    const doc = createDocument(paras);
    const result = service.build(doc, [createSection('Skills')]);

    expect(result.dateFormat).toBe('unknown');
  });

  it('assigns heading levels based on section type', () => {
    const doc = createDocument([]);
    const sections = [
      createSection('Professional Summary'),
      createSection('Experience'),
      createSection('Skills'),
    ];
    const result = service.build(doc, sections);

    expect(result.headingLevels).toBeDefined();
    expect(Object.keys(result.headingLevels).length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty bullet marker for document without bullets', () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('Plain text without bullets', { runs: [createRun('Plain text without bullets')] }),
    ];
    const doc = createDocument(paras);
    const result = service.build(doc, []);

    expect(result.bulletMarker).toBe('');
  });
});
