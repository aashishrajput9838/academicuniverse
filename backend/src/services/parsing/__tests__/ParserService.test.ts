// src/services/parsing/__tests__/ParserService.test.ts
import { ParserService } from '../ParserService';
import { ParserFactory } from '../ParserFactory';
import { IParser } from '../ParserInterface';
import { eventBus } from '../../../events/EventBus';
import { UaipEvent } from '../../../events/UaipEvents';
import { logger } from '../../../utils/logger';

jest.mock('../../../events/EventBus');
jest.mock('../../../utils/logger');
jest.mock('../../../models/KnowledgeRecord', () => ({
  KnowledgeRecordModel: {
    updateOne: jest.fn().mockResolvedValue({}),
  },
}));

const mockedPublish = jest.fn();
// @ts-ignore
(eventBus as any).publish = mockedPublish;

describe('ParserService', () => {
  const sampleBuffer = Buffer.from('sample content', 'utf-8');
  const params = {
    processingId: 'proc-123',
    buffer: sampleBuffer,
    parserStrategy: 'TEST_PARSER',
    mimeType: 'text/plain',
    fileName: 'sample.txt',
    fileSize: sampleBuffer.length,
  };

  afterEach(() => {
    mockedPublish.mockClear();
    // reset factory registrations to avoid cross‑test contamination
    // we re‑register built‑in parsers (they are already registered on import)
  });

  it('should publish Parsed event on successful parse', async () => {
    // Register a simple parser that returns upper‑cased content
    const mockParser: IParser = {
      async parse(buf: Buffer) {
        return buf.toString('utf-8').toUpperCase();
      },
      getStrategyName() {
        return 'TEST_PARSER';
      },
    };
    ParserFactory.registerParser('TEST_PARSER', mockParser);

    await ParserService.parseDocument(params);

    expect(mockedPublish).toHaveBeenCalledTimes(1);
    expect(mockedPublish).toHaveBeenCalledWith(UaipEvent.Parsed, expect.objectContaining({
      processingId: params.processingId,
      parserStrategy: params.parserStrategy,
      rawContent: 'SAMPLE CONTENT',
      mimeType: params.mimeType,
      fileName: params.fileName,
      fileSize: params.fileSize,
    }));
  });

  it('should publish ParseFailed event when parser throws', async () => {
    const failingParser: IParser = {
      async parse() {
        throw new Error('Parsing error');
      },
      getStrategyName() {
        return 'FAIL_PARSER';
      },
    };
    ParserFactory.registerParser('FAIL_PARSER', failingParser);

    const failParams = { ...params, parserStrategy: 'FAIL_PARSER' };

    await ParserService.parseDocument(failParams);

    expect(mockedPublish).toHaveBeenCalledTimes(1);
    expect(mockedPublish).toHaveBeenCalledWith(UaipEvent.ParseFailed, expect.objectContaining({
      processingId: failParams.processingId,
      parserStrategy: failParams.parserStrategy,
      errorMessage: 'Parsing error',
    }));
  });
});
