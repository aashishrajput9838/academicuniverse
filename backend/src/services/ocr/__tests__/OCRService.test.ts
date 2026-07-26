import { OCRService } from '../OCRService';
import { OCRFactory } from '../OCRFactory';
import { IOcrEngine } from '../engines/IOcrEngine';
import { DocumentExtractionEngine } from '../DocumentExtractionEngine';
import { IPdfTextExtractor, PdfTextResult } from '../extractors/IPdfTextExtractor';
import { IImagePreprocessor, PreprocessedImage } from '../preprocessing/IImagePreprocessor';
import { IOcrQualityScorer } from '../quality/IOcrQualityScorer';
import { eventBus } from '../../../events/EventBus';
import { UaipEvent, UaipEventPayload } from '../../../events/UaipEvents';

jest.mock('uuid', () => ({
  v4: () => 'mock-uuid-12345',
}));

jest.mock('../../../events/EventBus', () => {
  return {
    eventBus: {
      publish: jest.fn(),
      subscribe: jest.fn(),
    },
  };
});

jest.mock('../repositories/MongoOcrIdempotencyRepository', () => {
  const inMemoryStore = new Set<string>();
  const mockInstance = {
    has: jest.fn().mockImplementation(async (id: string) => inMemoryStore.has(id)),
    record: jest.fn().mockImplementation(async (id: string) => { inMemoryStore.add(id); }),
    delete: jest.fn().mockImplementation(async (id: string) => { inMemoryStore.delete(id); }),
  };
  const MockClass = jest.fn().mockImplementation(() => mockInstance);
  (MockClass as any).clearAll = jest.fn().mockImplementation(async () => { inMemoryStore.clear(); });
  return {
    MongoOcrIdempotencyRepository: MockClass,
  };
});

jest.mock('../../../models/KnowledgeRecord', () => ({
  KnowledgeRecordModel: {
    updateOne: jest.fn().mockResolvedValue({}),
    findOne: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('../../../storage/GridFSProvider', () => ({
  GridFSProvider: jest.fn().mockImplementation(() => ({
    getFile: jest.fn().mockResolvedValue(Buffer.from('mock-image-data')),
  })),
}));

jest.mock('pdf-to-img', () => ({
  pdf: jest.fn().mockImplementation(async function* () {
    yield Buffer.from('rendered-page-1');
  }),
}));

class TestableDocumentExtractionEngine extends DocumentExtractionEngine {
  async *renderPdfPages(buffer: Buffer): AsyncGenerator<{ buffer: Buffer; pageNumber: number; width: number; height: number }> {
    yield { buffer: Buffer.from('mock-pdf-image'), pageNumber: 1, width: 2481, height: 3508 };
  }
}

describe('OCRService', () => {
  let mockEngine: jest.Mocked<IOcrEngine>;
  let mockPdfExtractor: jest.Mocked<IPdfTextExtractor>;
  let mockPreprocessor: jest.Mocked<IImagePreprocessor>;
  let mockQualityScorer: jest.Mocked<IOcrQualityScorer>;
  let extractionEngine: DocumentExtractionEngine;
  let ocrService: OCRService;
  let eventListeners: ((payload: UaipEventPayload) => Promise<void>)[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    eventListeners = [];

    (eventBus.subscribe as jest.Mock).mockImplementation((event, listener) => {
      if (event === UaipEvent.Parsed) {
        eventListeners.push(listener);
      }
    });

    mockEngine = {
      name: 'tesseract',
      process: jest.fn().mockResolvedValue({
        text: 'Extracted text from mock engine',
        confidence: 95,
        pagesProcessed: 1,
        engine: 'tesseract',
        pageDetails: [
          {
            pageNumber: 1,
            text: 'Extracted text from mock engine',
            confidence: 95,
          },
        ],
      }),
    };

    mockPdfExtractor = {
      extractText: jest.fn().mockResolvedValue({
        text: '',
        method: 'pdf-parse',
        hasText: false,
      }),
    };

    mockPreprocessor = {
      preprocess: jest.fn().mockResolvedValue({
        buffer: Buffer.from('preprocessed-image'),
        format: 'png',
        width: 1000,
        height: 1000,
      } as PreprocessedImage),
      enhanceContrast: jest.fn().mockResolvedValue(Buffer.from('contrast')),
      resizeForOcr: jest.fn().mockResolvedValue(Buffer.from('resized')),
      deskew: jest.fn().mockResolvedValue(Buffer.from('deskewed')),
      autoRotate: jest.fn().mockResolvedValue(Buffer.from('rotated')),
      adaptiveThreshold: jest.fn().mockResolvedValue(Buffer.from('thresholded')),
    };

    mockQualityScorer = {
      score: jest.fn().mockReturnValue({
        score: 0.8,
        isSufficient: true,
        reason: undefined,
      }),
    };

    OCRFactory.registerEngine('TESSERACT', mockEngine);
    OCRFactory.registerEngine('PADDLEOCR', {
      name: 'paddleocr',
      process: jest.fn().mockResolvedValue({
        text: 'Fallback OCR text from PaddleOCR',
        confidence: 85,
        pagesProcessed: 1,
        engine: 'paddleocr',
        pageDetails: [],
      }),
    } as any);

    const paddleOcrEngine = OCRFactory.getEngine('PADDLEOCR') as jest.Mocked<IOcrEngine>;

    extractionEngine = new TestableDocumentExtractionEngine(
      mockPdfExtractor,
      mockPreprocessor,
      mockEngine,
      paddleOcrEngine,
      mockQualityScorer,
    );

    OCRService.setExtractionEngine(extractionEngine);
    OCRService.clearCache();
    ocrService = new OCRService();
  });

  it('should register for UaipEvent.Parsed on initialization', () => {
    expect(eventBus.subscribe).toHaveBeenCalledWith(UaipEvent.Parsed, expect.any(Function));
    expect(eventListeners.length).toBe(1);
  });

  it('should run OCR for images and emit OCR_COMPLETED', async () => {
    const payload: UaipEventPayload = {
      processingId: 'proc-123',
      storageId: 'store-123',
      mimeType: 'image/png',
      isScanned: false,
    };

    await eventListeners[0](payload);

    expect(mockEngine.process).toHaveBeenCalledWith(expect.any(Buffer));
    expect(eventBus.publish).toHaveBeenCalledWith(
      UaipEvent.OCR_COMPLETED,
      expect.objectContaining({
        processingId: 'proc-123',
        ocrText: 'Extracted text from mock engine',
      })
    );
  });

  it('should run OCR for scanned PDFs and emit OCR_COMPLETED', async () => {
    const payload: UaipEventPayload = {
      processingId: 'proc-456',
      storageId: 'store-456',
      mimeType: 'application/pdf',
      isScanned: true,
    };

    await eventListeners[0](payload);

    expect(mockEngine.process).toHaveBeenCalledWith(expect.any(Buffer));
    expect(eventBus.publish).toHaveBeenCalledWith(
      UaipEvent.OCR_COMPLETED,
      expect.objectContaining({
        processingId: 'proc-456',
        ocrText: 'Extracted text from mock engine',
      })
    );
  });

  it('should not emit OCR_COMPLETED and not run OCR for digital PDFs', async () => {
    const payload: UaipEventPayload = {
      processingId: 'proc-789',
      storageId: 'store-789',
      mimeType: 'application/pdf',
      isScanned: false,
    };

    await eventListeners[0](payload);

    expect(mockEngine.process).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('should not emit OCR_COMPLETED and not run OCR for TXT, CSV, EXCEL', async () => {
    const cases: UaipEventPayload[] = [
      {
        processingId: 'proc-txt',
        storageId: 'store-txt',
        mimeType: 'text/plain',
        isScanned: false,
      },
      {
        processingId: 'proc-csv',
        storageId: 'store-csv',
        mimeType: 'text/csv',
        isScanned: false,
      },
      {
        processingId: 'proc-xlsx',
        storageId: 'store-xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        isScanned: false,
      },
    ];

    for (const payload of cases) {
      await eventListeners[0](payload);
    }

    expect(mockEngine.process).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('should enforce idempotency by never executing OCR twice for the same processingId', async () => {
    const payload: UaipEventPayload = {
      processingId: 'proc-idempotency',
      storageId: 'store-idempotency',
      mimeType: 'image/jpeg',
      isScanned: false,
    };

    await eventListeners[0](payload);
    expect(mockEngine.process).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();

    await eventListeners[0](payload);
    expect(mockEngine.process).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('should handle engine errors by publishing OCR_FAILED and resetting idempotency cache', async () => {
    mockEngine.process.mockRejectedValue(new Error('Tesseract failed'));

    const payload: UaipEventPayload = {
      processingId: 'proc-error',
      storageId: 'store-error',
      mimeType: 'image/jpeg',
      isScanned: false,
    };

    await eventListeners[0](payload);

    expect(eventBus.publish).toHaveBeenCalledWith(
      UaipEvent.OCR_FAILED,
      expect.objectContaining({
        processingId: 'proc-error',
        ocrErrorMessage: 'Tesseract failed',
      })
    );

    jest.clearAllMocks();
    mockEngine.process.mockResolvedValue({
      text: 'Success on retry',
      confidence: 90,
      pagesProcessed: 1,
      engine: 'tesseract',
      pageDetails: [],
    });

    await eventListeners[0](payload);
    expect(mockEngine.process).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledWith(
      UaipEvent.OCR_COMPLETED,
      expect.objectContaining({
        processingId: 'proc-error',
        ocrText: 'Success on retry',
      })
    );
  });

  it('should fallback to PaddleOCR when Tesseract returns low quality', async () => {
    mockEngine.process.mockResolvedValue({
      text: 'Low quality text',
      confidence: 5,
      pagesProcessed: 1,
      engine: 'tesseract',
      pageDetails: [],
    });

    mockQualityScorer.score
      .mockReturnValueOnce({ score: 0.1, isSufficient: false, reason: 'OCR text too short' })
      .mockReturnValueOnce({ score: 0.9, isSufficient: true, reason: undefined });

    const payload: UaipEventPayload = {
      processingId: 'proc-fallback',
      storageId: 'store-fallback',
      mimeType: 'application/pdf',
      isScanned: true,
    };

    await eventListeners[0](payload);

    expect(mockEngine.process).toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalledWith(
      UaipEvent.OCR_COMPLETED,
      expect.objectContaining({
        processingId: 'proc-fallback',
        ocrText: 'Fallback OCR text from PaddleOCR',
      })
    );
  });
});
