import { TemplateProcessingOrchestrator, ProcessedTemplate } from '../services/templateProcessingOrchestrator.service';

const SAMPLE_DOCX_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="28"/></w:rPr>
        <w:t>Summary</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Calibri"/></w:rPr>
        <w:t>This is a summary text.</w:t>
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
        generate: jest.fn().mockImplementation(() => Buffer.from(files['word/document.xml'] || '')),
    }));
}

describe('TemplateProcessingOrchestrator', () => {
  let orchestrator: TemplateProcessingOrchestrator;

  beforeEach(() => {
    orchestrator = new TemplateProcessingOrchestrator({
      enableAiAssistance: false,
    });
    jest.clearAllMocks();
  });

  it('returns result for empty buffer', async () => {
    mockPizZip('');
    const result = await orchestrator.process(Buffer.from(''));
    expect(result).toBeDefined();
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it('returns result for unsupported input', async () => {
    mockPizZip('invalid');
    const result = await orchestrator.process(Buffer.from('invalid'));
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });

  it('processes valid DOCX and returns result structure', async () => {
    mockPizZip(SAMPLE_DOCX_XML);
    const validDocx = createMinimalDocx();
    const result = await orchestrator.process(validDocx);

    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
    expect(result.milestone2Result).toBeDefined();
    expect(result.injectionResult).toBeDefined();
    expect(result.generationResult).toBeDefined();
    expect(result.processedBuffer).toBeInstanceOf(Buffer);
    expect(Array.isArray(result.issues)).toBe(true);
  });
});

function createMinimalDocx(): Buffer {
  return Buffer.from(SAMPLE_DOCX_XML);
}
