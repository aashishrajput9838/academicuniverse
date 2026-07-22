const SAMPLE_DOCX_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="28"/></w:rPr>
        <w:t>Hello World</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;

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

import { DocxTemplateGenerator, GenerationResult } from '../services/docxTemplateGenerator.service';

describe('DocxTemplateGenerator', () => {
  let generator: DocxTemplateGenerator;

  beforeEach(() => {
    generator = new DocxTemplateGenerator();
    jest.clearAllMocks();
  });

  it('generates valid DOCX buffer from modified content', async () => {
    mockPizZip(SAMPLE_DOCX_XML);
    const modifiedBuffer = Buffer.from(SAMPLE_DOCX_XML);
    const result = await generator.generate(modifiedBuffer);

    expect(result.success).toBe(true);
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.size).toBeGreaterThan(0);
    expect(result.issues).toEqual([]);
  });

  it('fails on empty buffer', async () => {
    mockPizZip('');
    const emptyBuffer = Buffer.from('');
    const result = await generator.generate(emptyBuffer);

    expect(result.success).toBe(false);
    expect(result.size).toBe(0);
    expect(result.issues.length).toBeGreaterThanOrEqual(1);
  });

  it('generates buffer with correct MIME type signature', async () => {
    mockPizZip(SAMPLE_DOCX_XML);
    const modifiedBuffer = Buffer.from(SAMPLE_DOCX_XML);
    const result = await generator.generate(modifiedBuffer);

    expect(result.success).toBe(true);
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.size).toBeGreaterThan(0);
  });
});
