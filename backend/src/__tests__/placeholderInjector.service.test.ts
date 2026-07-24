import { PlaceholderInjector, InjectionResult } from '../services/placeholderInjector.service';
import { ExtractedDocument, ExtractedParagraph, ExtractedRun } from '../docxExtraction.service';
import { DetectedSection, TemplateField } from '../services/milestone2.types';

jest.mock('pizzip', () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
        file: jest.fn().mockReturnValue(''),
    })),
}));

const PizZipMock = require('pizzip').default as jest.MockedFunction<any>;

function mockPizZip(xml: string): void {
    const files: Record<string, string> = { 'word/document.xml': xml };
    PizZipMock.mockImplementation(() => ({
        file: jest.fn().mockImplementation((name: string, content?: string) => {
          if (content !== undefined) {
            files[name] = content;
            return { asText: () => files[name] };
          }
          return { asText: () => files[name] || '' };
        }),
        files,
        generate: jest.fn().mockImplementation(() => {
          const content = Buffer.from(files['word/document.xml'] || '');
          const zipHeader = Buffer.from('504b03041400080000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000');
          if (content.length === 0) return content;
          return Buffer.concat([zipHeader, content]);
        }),
    }));
}

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

const createSection = (title: string, fields: TemplateField[]): DetectedSection => ({
  id: 'test-section',
  title,
  order: 0,
  repeatable: false,
  fields,
});

const SAMPLE_DOCX_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="28"/></w:rPr>
        <w:t>ProfessionalSummary</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Calibri"/></w:rPr>
        <w:t>This is a summary text.</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="28"/></w:rPr>
        <w:t>Skills</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Calibri"/></w:rPr>
        <w:t>Java Python JavaScript</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;

describe('PlaceholderInjector', () => {
  let injector: PlaceholderInjector;

  beforeEach(() => {
    injector = new PlaceholderInjector();
    jest.clearAllMocks();
  });

  it('returns failure for empty XML', async () => {
    mockPizZip('');
    const doc = createDocument([]);
    const sections: DetectedSection[] = [];
    const result = await injector.inject(Buffer.from('test'), doc, sections);
    expect(result.success).toBe(false);
    expect(result.issues.length).toBeGreaterThanOrEqual(1);
  });

  it('injects placeholders into section body runs', async () => {
    mockPizZip(SAMPLE_DOCX_XML);
    const buffer = Buffer.from(SAMPLE_DOCX_XML);
    const doc = createDocument([
      createParagraph('ProfessionalSummary', { index: 0, runs: [createRun('ProfessionalSummary', {
        formatting: { bold: true, italic: false, underline: false, fontSize: 14 }
      })] }),
      createParagraph('This is a summary text.', { index: 1, runs: [createRun('This is a summary text.', {
        formatting: { bold: false, italic: false, underline: false, fontSize: 11 }
      })] }),
      createParagraph('Skills', { index: 2, runs: [createRun('Skills', {
        formatting: { bold: true, italic: false, underline: false, fontSize: 14 }
      })] }),
      createParagraph('Java Python JavaScript', { index: 3, runs: [createRun('Java Python JavaScript', {
        formatting: { bold: false, italic: false, underline: false, fontSize: 11 }
      })] }),
    ]);

    const sections = [
      createSection('ProfessionalSummary', [
        { key: 'summary', label: 'Summary', type: 'textarea', required: true, aiEnhanceable: true },
      ]),
      createSection('Skills', [
        { key: 'skills_list', label: 'Skills', type: 'list', required: true, aiEnhanceable: true },
      ]),
    ];

    const result = await injector.inject(buffer, doc, sections);
    expect(result.success).toBe(true);
    expect(result.placeholdersInjected).toBeGreaterThanOrEqual(1);
  });

  it('preserves existing formatting in XML', async () => {
    mockPizZip(SAMPLE_DOCX_XML);
    const buffer = Buffer.from(SAMPLE_DOCX_XML);
    const doc = createDocument([
      createParagraph('Bold Heading', { index: 0, runs: [createRun('Bold Heading', {
        formatting: { bold: true, italic: false, underline: false, fontSize: 16 }
      })] }),
      createParagraph('Body text', { index: 1, runs: [createRun('Body text', {
        formatting: { bold: false, italic: false, underline: false, fontSize: 11 }
      })] }),
    ]);

    const sections = [
      createSection('Bold Heading', [
        { key: 'content', label: 'Content', type: 'textarea', required: false, aiEnhanceable: true },
      ]),
    ];

    const result = await injector.inject(buffer, doc, sections);
    expect(result.success).toBe(true);
    const xmlString = result.buffer.toString();
    expect(xmlString).toContain('{{content}}');
    expect(xmlString).toContain('<w:rPr>');
  });

  it('does not modify input buffer', async () => {
    mockPizZip(SAMPLE_DOCX_XML);
    const originalBuffer = Buffer.from(SAMPLE_DOCX_XML);
    const doc = createDocument([
      createParagraph('Test', { index: 0, runs: [createRun('Test')] }),
    ]);
    const sections = [createSection('Test', [{ key: 'field', label: 'Field', type: 'text', required: true, aiEnhanceable: true }])];

    await injector.inject(originalBuffer, doc, sections);
    expect(originalBuffer.toString()).toBe(SAMPLE_DOCX_XML);
  });

  it('handles empty sections array', async () => {
    mockPizZip(SAMPLE_DOCX_XML);
    const buffer = Buffer.from(SAMPLE_DOCX_XML);
    const doc = createDocument([createParagraph('Test')]);
    const sections: DetectedSection[] = [];

    const result = await injector.inject(buffer, doc, sections);
    expect(result.success).toBe(true);
    expect(result.placeholdersInjected).toBe(0);
  });

  it('returns result for unsupported XML format', async () => {
    mockPizZip('not valid xml');
    const doc = createDocument([]);
    const sections: DetectedSection[] = [];
    const result = await injector.inject(Buffer.from('test'), doc, sections);
    expect(Array.isArray(result.issues)).toBe(true);
    expect(typeof result.success).toBe('boolean');
  });

  it('injects placeholders when heading formatting is on non-first run', async () => {
    mockPizZip(SAMPLE_DOCX_XML);
    const buffer = Buffer.from(SAMPLE_DOCX_XML);
    const doc = createDocument([
      createParagraph('TECHNICALSKILLS', {
        index: 0,
        runs: [
          createRun('', { formatting: { bold: false, fontSize: undefined } }),
          createRun('TEC', { formatting: { bold: true, fontSize: 14 } }),
          createRun('H', { formatting: { bold: true, fontSize: 14 } }),
        ],
      }),
      createParagraph('Body content here', { index: 1, runs: [createRun('Body content here')] }),
    ]);

    const sections = [
      createSection('TECHNICALSKILLS', [
        { key: 'skills', label: 'Skills', type: 'list', required: true, aiEnhanceable: true },
      ]),
    ];

    const result = await injector.inject(buffer, doc, sections);
    expect(result.success).toBe(true);
    expect(result.placeholdersInjected).toBeGreaterThanOrEqual(1);
  });

  it('injects placeholders when headingParagraphIndex is set (no fallback search)', async () => {
    mockPizZip(SAMPLE_DOCX_XML);
    const buffer = Buffer.from(SAMPLE_DOCX_XML);
    const doc = createDocument([
      createParagraph('Education', { index: 0, runs: [createRun('Education', {
        formatting: { bold: false, italic: false, underline: false }
      })] }),
      createParagraph('B.Tech CSE', { index: 1, runs: [createRun('B.Tech CSE', {
        formatting: { bold: false, italic: false, underline: false }
      })] }),
    ]);

    const sections: DetectedSection[] = [
      {
        id: 'edu-section',
        title: 'Education',
        order: 0,
        repeatable: false,
        headingParagraphIndex: 0,
        fields: [
          { key: 'degree', label: 'Degree', type: 'text', required: true, aiEnhanceable: true },
        ],
      },
    ];

    const result = await injector.inject(buffer, doc, sections);
    expect(result.success).toBe(true);
    expect(result.placeholdersInjected).toBe(1);
  });

  it('injects placeholders for Heading1 keyword paragraphs without bold/fontSize', async () => {
    mockPizZip(SAMPLE_DOCX_XML);
    const buffer = Buffer.from(SAMPLE_DOCX_XML);
    const doc = createDocument([
      createParagraph('Skills', { index: 0, runs: [createRun('Skills', {
        formatting: { bold: false, italic: false, underline: false }
      })] }),
      createParagraph('Java Python TypeScript', { index: 1, runs: [createRun('Java Python TypeScript', {
        formatting: { bold: false, italic: false, underline: false }
      })] }),
    ]);

    const sections: DetectedSection[] = [
      {
        id: 'skills-section',
        title: 'Skills',
        order: 0,
        repeatable: false,
        headingParagraphIndex: 0,
        fields: [
          { key: 'items', label: 'Skills', type: 'list', required: true, aiEnhanceable: true },
        ],
      },
    ];

    const result = await injector.inject(buffer, doc, sections);
    expect(result.success).toBe(true);
    expect(result.placeholdersInjected).toBe(1);
    const xmlString = result.buffer.toString();
    expect(xmlString).toContain('{{items}}');
  });
});
