import { HeadingDetector } from '../services/headingDetector.service';
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

describe('HeadingDetector', () => {
  let detector: HeadingDetector;

  beforeEach(() => {
    detector = new HeadingDetector({ enableAiAssistance: false });
  });

  describe('findHeadingCandidates', () => {
    it('detects Heading1 paragraph style via keyword match (no bold/fontSize)', () => {
      const paras: ExtractedParagraph[] = [
        createParagraph('Education', { index: 0, runs: [createRun('Education', { formatting: { bold: false, italic: false, underline: false } })] }),
        createParagraph('B.Tech CSE from IIT', { index: 1 }),
        createParagraph('Skills', { index: 2, runs: [createRun('Skills', { formatting: { bold: false, italic: false, underline: false } })] }),
        createParagraph('Java Python', { index: 3 }),
      ];
      const doc = createDocument(paras);
      const candidates = detector.findHeadingCandidates(doc);

      expect(candidates.length).toBeGreaterThanOrEqual(2);
      const titles = candidates.map(c => c.title.toLowerCase());
      expect(titles).toContain('education');
      expect(titles).toContain('skills');
    });

    it('detects bold headings with fontSize >= 14', () => {
      const paras: ExtractedParagraph[] = [
        createParagraph('ProfessionalSummary', { index: 0, runs: [createRun('ProfessionalSummary', { formatting: { bold: true, italic: false, underline: false, fontSize: 16 } })] }),
        createParagraph('Summary content', { index: 1 }),
      ];
      const doc = createDocument(paras);
      const candidates = detector.findHeadingCandidates(doc);

      expect(candidates.length).toBeGreaterThanOrEqual(1);
      const boldCandidate = candidates.find(c => c.rawConfidence >= 0.8);
      expect(boldCandidate).toBeDefined();
      expect(boldCandidate!.title.toLowerCase()).toContain('professionalsummary');
    });

    it('detects Title Case keywords as headings', () => {
      const paras: ExtractedParagraph[] = [
        createParagraph('Work Experience', { index: 0 }),
        createParagraph('Company A - Developer', { index: 1 }),
      ];
      const doc = createDocument(paras);
      const candidates = detector.findHeadingCandidates(doc);

      expect(candidates.length).toBe(1);
      expect(candidates[0].title.toLowerCase()).toContain('work experience');
    });

    it('ignores bullet points', () => {
      const paras: ExtractedParagraph[] = [
        createParagraph('- Java', { index: 0 }),
        createParagraph('• Python', { index: 1 }),
        createParagraph('1. JavaScript', { index: 2 }),
      ];
      const doc = createDocument(paras);
      const candidates = detector.findHeadingCandidates(doc);

      expect(candidates.length).toBe(0);
    });

    it('ignores lines with trailing punctuation', () => {
      const paras: ExtractedParagraph[] = [
        createParagraph('Skills:', { index: 0 }),
        createParagraph('Education.', { index: 1 }),
      ];
      const doc = createDocument(paras);
      const candidates = detector.findHeadingCandidates(doc);

      expect(candidates.length).toBe(0);
    });

    it('skips empty paragraphs', () => {
      const paras: ExtractedParagraph[] = [
        createParagraph('', { index: 0, runs: [] }),
        createParagraph('Education', { index: 1 }),
        createParagraph('Content', { index: 2 }),
      ];
      const doc = createDocument(paras);
      const candidates = detector.findHeadingCandidates(doc);

      expect(candidates.length).toBe(1);
      expect(candidates[0].paragraphIndex).toBe(1);
    });
  });

  describe('isHeading', () => {
    it('returns true for keyword heading without formatting', () => {
      const doc = createDocument([
        createParagraph('Education'),
        createParagraph('Content'),
      ]);
      expect(detector.isHeading(doc.paragraphs[0], doc)).toBe(true);
    });

    it('returns true for bold+large heading', () => {
      const doc = createDocument([
        createParagraph('My Heading', { runs: [createRun('My Heading', { formatting: { bold: true, fontSize: 16 } })] }),
      ]);
      expect(detector.isHeading(doc.paragraphs[0], doc)).toBe(true);
    });

    it('returns false for normal body text', () => {
      const doc = createDocument([
        createParagraph('This is normal body text with no special formatting.'),
      ]);
      expect(detector.isHeading(doc.paragraphs[0], doc)).toBe(false);
    });

    it('returns false for bullet points', () => {
      const doc = createDocument([
        createParagraph('- Java Programming'),
      ]);
      expect(detector.isHeading(doc.paragraphs[0], doc)).toBe(false);
    });
  });

  describe('section detection integration', () => {
    it('detects all common section headings from a typical resume', () => {
      const paras: ExtractedParagraph[] = [
        createParagraph('Professional Summary', { index: 0 }),
        createParagraph('Experienced developer with 5 years', { index: 1 }),
        createParagraph('Skills', { index: 2 }),
        createParagraph('Java, Python, TypeScript', { index: 3 }),
        createParagraph('Education', { index: 4 }),
        createParagraph('B.Tech Computer Science', { index: 5 }),
        createParagraph('Work Experience', { index: 6 }),
        createParagraph('Senior Developer at Acme Corp', { index: 7 }),
      ];
      const doc = createDocument(paras);
      const candidates = detector.findHeadingCandidates(doc);

      const titles = candidates.map(c => c.title.toLowerCase());
      expect(titles).toContain('professional summary');
      expect(titles).toContain('skills');
      expect(titles).toContain('education');
      expect(titles).toContain('work experience');
    });
  });
});
