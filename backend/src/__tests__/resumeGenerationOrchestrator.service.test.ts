import { ResumeGenerationOrchestrator } from '../services/resumeGenerationOrchestrator.service';

jest.mock('pizzip', () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
        file: jest.fn().mockReturnValue(''),
    })),
}));

const PizZipMock = require('pizzip').default as jest.MockedFunction<any>;

function mockPizZip(): void {
    PizZipMock.mockImplementation(() => ({
        file: jest.fn().mockReturnValue({ asText: () => '' }),
        files: {},
        generate: jest.fn().mockReturnValue(Buffer.from('')),
    }));
}

describe('ResumeGenerationOrchestrator', () => {
  let orchestrator: ResumeGenerationOrchestrator;

  beforeEach(() => {
    mockPizZip();
    orchestrator = new ResumeGenerationOrchestrator({
      enableAiAssistance: false,
    });
    jest.clearAllMocks();
  });

  it('returns failure for empty buffer', async () => {
    const result = await orchestrator.generate(Buffer.from(''), {});
    expect(result.success).toBe(false);
    expect(result.docxBuffer.length).toBe(0);
  });

  it('returns result structure for valid input', async () => {
    const result = await orchestrator.generate(Buffer.from('template'), { name: 'John Doe' });
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
    expect(result.milestone2Result).toBeDefined();
    expect(result.injectionResult).toBeDefined();
    expect(result.fillerResult).toBeDefined();
    expect(Array.isArray(result.issues)).toBe(true);
  });
});
