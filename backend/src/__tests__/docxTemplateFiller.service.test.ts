import { DocxTemplateFiller } from '../services/docxTemplateFiller.service';

jest.mock('pizzip', () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
        file: jest.fn().mockReturnValue({ asText: () => '' }),
        generate: jest.fn().mockReturnValue(Buffer.from('filled-docx')),
    })),
}));

jest.mock('docxtemplater', () => {
    return jest.fn().mockImplementation(() => ({
        setData: jest.fn(),
        render: jest.fn(),
        getZip: () => ({
            generate: jest.fn().mockReturnValue(Buffer.from('filled-docx')),
        }),
    }));
});

jest.mock('mammoth', () => ({
    convertToHtml: jest.fn().mockResolvedValue({ value: '<html>preview</html>' }),
}));

describe('DocxTemplateFiller', () => {
  let filler: DocxTemplateFiller;

  beforeEach(() => {
    jest.clearAllMocks();
    filler = new DocxTemplateFiller();
  });

  it('fills template with valid data', async () => {
    const templateBuffer = Buffer.from('template');
    const studentData = { name: 'John Doe', email: 'john@example.com' };
    const schema = [
      {
        id: 'section1',
        title: 'Personal',
        order: 0,
        repeatable: false,
        fields: [
          { key: 'name', label: 'Name', type: 'text', required: true, aiEnhanceable: true },
          { key: 'email', label: 'Email', type: 'email', required: true, aiEnhanceable: true },
        ],
      },
    ] as any;

    const result = await filler.fill(templateBuffer, studentData, schema);
    expect(result.success).toBe(true);
    expect(result.docxBuffer).toBeInstanceOf(Buffer);
    expect(result.issues).toHaveLength(0);
  });

  it('fails with validation errors', async () => {
    const templateBuffer = Buffer.from('template');
    const studentData = { email: 'invalid' };
    const schema = [
      {
        id: 'section1',
        title: 'Personal',
        order: 0,
        repeatable: false,
        fields: [
          { key: 'email', label: 'Email', type: 'email', required: true, aiEnhanceable: true },
        ],
      },
    ] as any;

    const result = await filler.fill(templateBuffer, studentData, schema);
    expect(result.success).toBe(false);
    expect(result.issues.length).toBeGreaterThanOrEqual(1);
  });
});
