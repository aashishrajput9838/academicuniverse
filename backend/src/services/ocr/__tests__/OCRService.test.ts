import { OCRService } from '../OCRService';
import { OCRFactory } from '../OCRFactory';
import { IOcrProvider } from '../IOcrProvider';
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
  },
}));

describe('OCRService', () => {
  let mockProvider: jest.Mocked<IOcrProvider>;
  let ocrService: OCRService;
  let eventListeners: ((payload: UaipEventPayload) => Promise<void>)[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    eventListeners = [];

    // Capture the subscription callbacks when OCRService is instantiated
    (eventBus.subscribe as jest.Mock).mockImplementation((event, listener) => {
      if (event === UaipEvent.Parsed) {
        eventListeners.push(listener);
      }
    });

    mockProvider = {
      process: jest.fn().mockResolvedValue('Extracted text from mock provider'),
    };
    OCRFactory.registerProvider('TESSERACT', mockProvider);

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

    expect(mockProvider.process).toHaveBeenCalledWith('store-123', 'image/png');
    expect(eventBus.publish).toHaveBeenCalledWith(
      UaipEvent.OCR_COMPLETED,
      expect.objectContaining({
        processingId: 'proc-123',
        ocrText: 'Extracted text from mock provider',
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

    expect(mockProvider.process).toHaveBeenCalledWith('store-456', 'application/pdf');
    expect(eventBus.publish).toHaveBeenCalledWith(
      UaipEvent.OCR_COMPLETED,
      expect.objectContaining({
        processingId: 'proc-456',
        ocrText: 'Extracted text from mock provider',
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

    expect(mockProvider.process).not.toHaveBeenCalled();
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

    expect(mockProvider.process).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('should enforce idempotency by never executing OCR twice for the same processingId', async () => {
    const payload: UaipEventPayload = {
      processingId: 'proc-idempotency',
      storageId: 'store-idempotency',
      mimeType: 'image/jpeg',
      isScanned: false,
    };

    // First call
    await eventListeners[0](payload);
    expect(mockProvider.process).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledTimes(1);

    // Reset calls on mocks to isolate second invocation check
    jest.clearAllMocks();

    // Second call with same processingId
    await eventListeners[0](payload);
    expect(mockProvider.process).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('should handle provider errors by publishing OCR_FAILED and resetting idempotency cache', async () => {
    mockProvider.process.mockRejectedValue(new Error('Tesseract failed'));

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

    // Verify idempotency cache was reset on failure so we can retry
    jest.clearAllMocks();
    mockProvider.process.mockResolvedValue('Success on retry');

    await eventListeners[0](payload);
    expect(mockProvider.process).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledWith(
      UaipEvent.OCR_COMPLETED,
      expect.objectContaining({
        processingId: 'proc-error',
        ocrText: 'Success on retry',
      })
    );
  });
});
