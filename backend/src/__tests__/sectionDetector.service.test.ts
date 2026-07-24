import { SectionDetectorService } from '../services/sectionDetector.service';
import { ExtractedDocument, ExtractedParagraph, ExtractedRun, DocxLocation } from '../docxExtraction.service';

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

describe('SectionDetectorService', () => {
  let service: SectionDetectorService;

  beforeEach(() => {
    service = new SectionDetectorService({ enableAiAssistance: false });
  });

  it('detects section headings from bold formatting', () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('Name Email', { index: 0, runs: [createRun('Name Email', { formatting: { bold: true, italic: false, underline: false, fontSize: 16 } })] }),
      createParagraph('Experience content here', { index: 1, runs: [createRun('Experience content here', { formatting: { bold: true, italic: false, underline: false, fontSize: 16 } })] }),
      createParagraph('More experience text', { index: 2, runs: [createRun('More experience text')] }),
      createParagraph('Education details', { index: 3, runs: [createRun('Education details', { formatting: { bold: true, italic: false, underline: false, fontSize: 16 } })] }),
      createParagraph('Degree info', { index: 4, runs: [createRun('Degree info')] }),
    ];
    const doc = createDocument(paras);
    const { sections } = service.detect(doc);

    expect(sections.length).toBeGreaterThanOrEqual(1);
    const titles = sections.map(s => s.title.toLowerCase());
    expect(titles).toContain('name email');
  });

  it('detects section headings from known keywords', () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('Professional Summary', { index: 0, runs: [createRun('Professional Summary')] }),
      createParagraph('Summary text', { index: 1, runs: [createRun('Summary text')] }),
      createParagraph('Skills', { index: 2, runs: [createRun('Skills')] }),
      createParagraph('Java Python', { index: 3, runs: [createRun('Java Python')] }),
      createParagraph('Education', { index: 4, runs: [createRun('Education')] }),
      createParagraph('B.Tech CSE', { index: 5, runs: [createRun('B.Tech CSE')] }),
    ];
    const doc = createDocument(paras);
    const { sections } = service.detect(doc);

    expect(sections.some(s => s.title.toLowerCase().includes('summary'))).toBe(true);
    expect(sections.some(s => s.title.toLowerCase().includes('skills'))).toBe(true);
    expect(sections.some(s => s.title.toLowerCase().includes('education'))).toBe(true);
  });

  it('returns single Content section when no headings found', () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('hello world', { index: 0 }),
      createParagraph('just some text', { index: 1 }),
    ];
    const doc = createDocument(paras);
    const { sections, issues } = service.detect(doc);

    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('Content');
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues.some(i => i.message.includes('No clear section headings'))).toBe(true);
  });

  it('skips duplicate sections', () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('Skills', { index: 0, runs: [createRun('Skills')] }),
      createParagraph('Java', { index: 1, runs: [createRun('Java')] }),
      createParagraph('Skills', { index: 2, runs: [createRun('Skills')] }),
      createParagraph('More skills', { index: 3, runs: [createRun('More skills')] }),
    ];
    const doc = createDocument(paras);
    const { sections, issues } = service.detect(doc);

    const skillsSections = sections.filter(s => s.title.toLowerCase() === 'skills');
    expect(skillsSections.length).toBeLessThanOrEqual(1);
    expect(issues.some(i => i.message.includes('Duplicate section'))).toBe(true);
  });

  it('infers fields for Education section', () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('Education', { index: 0, runs: [createRun('Education')] }),
      createParagraph('B.Tech CSE', { index: 1, runs: [createRun('B.Tech CSE')] }),
    ];
    const doc = createDocument(paras);
    const { sections } = service.detect(doc);

    const eduSection = sections.find(s => s.title.toLowerCase().includes('education'));
    expect(eduSection).toBeDefined();
    expect(eduSection!.fields.length).toBeGreaterThan(0);
    expect(eduSection!.fields.map(f => f.key)).toContain('degree');
    expect(eduSection!.fields.map(f => f.key)).toContain('institution');
  });

  it('marks Experience as repeatable', () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('Experience', { index: 0, runs: [createRun('Experience')] }),
      createParagraph('Company A', { index: 1, runs: [createRun('Company A')] }),
    ];
    const doc = createDocument(paras);
    const { sections } = service.detect(doc);

    const expSection = sections.find(s => s.title.toLowerCase().includes('experience'));
    expect(expSection).toBeDefined();
    expect(expSection!.repeatable).toBe(true);
    expect(expSection!.minEntries).toBe(1);
  });

  it('marks Skills as non-repeatable with minEntries', () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('Skills', { index: 0, runs: [createRun('Skills')] }),
      createParagraph('Java', { index: 1, runs: [createRun('Java')] }),
    ];
    const doc = createDocument(paras);
    const { sections } = service.detect(doc);

    const skillsSection = sections.find(s => s.title.toLowerCase().includes('skills'));
    expect(skillsSection).toBeDefined();
    expect(skillsSection!.repeatable).toBe(false);
    expect(skillsSection!.minEntries).toBe(1);
  });

  it('handles empty section body gracefully', () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('Summary', { index: 0, runs: [createRun('Summary')] }),
      createParagraph('', { index: 1, runs: [] }),
      createParagraph('Skills', { index: 2, runs: [createRun('Skills')] }),
    ];
    const doc = createDocument(paras);
    const { sections } = service.detect(doc);

    const summarySection = sections.find(s => s.title.toLowerCase().includes('summary'));
    expect(summarySection).toBeDefined();
    expect(summarySection!.fields.length).toBeGreaterThan(0);
  });

  it('detects Heading1 paragraphs via keyword match without bold/fontSize', () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('Education', { index: 0, runs: [createRun('Education', { formatting: { bold: false, italic: false, underline: false } })] }),
      createParagraph('B.Tech Computer Science', { index: 1 }),
      createParagraph('Skills', { index: 2, runs: [createRun('Skills', { formatting: { bold: false, italic: false, underline: false } })] }),
      createParagraph('Java, Python, TypeScript', { index: 3 }),
      createParagraph('Work Experience', { index: 4 }),
      createParagraph('Senior Developer at Acme', { index: 5 }),
    ];
    const doc = createDocument(paras);
    const { sections } = service.detect(doc);

    const titles = sections.map(s => s.title.toLowerCase());
    expect(titles).toContain('education');
    expect(titles).toContain('skills');
    expect(titles).toContain('work experience');
  });

  it('sets headingParagraphIndex on detected sections', () => {
    const paras: ExtractedParagraph[] = [
      createParagraph('Education', { index: 0 }),
      createParagraph('B.Tech', { index: 1 }),
    ];
    const doc = createDocument(paras);
    const { sections } = service.detect(doc);

    const eduSection = sections.find(s => s.title.toLowerCase().includes('education'));
    expect(eduSection).toBeDefined();
    expect(eduSection!.headingParagraphIndex).toBe(0);
  });
});
