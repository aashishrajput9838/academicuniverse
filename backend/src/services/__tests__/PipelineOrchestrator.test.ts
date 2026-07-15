const mockSubscribe = jest.fn();
const mockFindOneAndUpdate = jest.fn();
const mockGetFile = jest.fn();
const mockClassify = jest.fn();
const mockParseDocument = jest.fn();

jest.mock('../../events/EventBus', () => ({
  eventBus: {
    subscribe: mockSubscribe,
    publish: jest.fn(),
  },
}));

jest.mock('../../models/UaipUpload', () => ({
  UaipUpload: {
    findOneAndUpdate: mockFindOneAndUpdate,
  },
}));

jest.mock('../../storage/GridFSProvider', () => ({
  GridFSProvider: jest.fn().mockImplementation(() => ({
    getFile: mockGetFile,
  })),
}));

jest.mock('../classification/DocumentClassifier', () => ({
  documentClassifier: {
    classify: mockClassify,
  },
}));

jest.mock('../parsing/ParserService', () => ({
  ParserService: {
    parseDocument: mockParseDocument,
  },
}));

jest.mock('../ocr', () => ({
  ocrService: {},
}));

import { PipelineOrchestrator } from '../pipeline-orchestrator';
import { UaipEvent } from '../../events/UaipEvents';

describe('PipelineOrchestrator', () => {
  const uploadedPayload = {
    processingId: 'proc-pipeline',
    storageId: 'gridfs-file-id',
    mimeType: 'text/plain',
    fileName: 'notes.txt',
    fileSize: 12,
    userId: 'user-1',
    organizationId: 'org-1',
  };
  const buffer = Buffer.from('hello world');

  beforeEach(() => {
    mockFindOneAndUpdate.mockReset();
    mockGetFile.mockReset();
    mockClassify.mockReset();
    mockParseDocument.mockReset();
  });

  it('subscribes to uploaded events', () => {
    expect(mockSubscribe).toHaveBeenCalledWith(UaipEvent.Uploaded, expect.any(Function));
  });

  it('fetches, classifies, parses, and marks the upload successful', async () => {
    mockFindOneAndUpdate
      .mockResolvedValueOnce({ processingId: uploadedPayload.processingId })
      .mockResolvedValueOnce({ processingId: uploadedPayload.processingId });
    mockGetFile.mockResolvedValue(buffer);
    mockClassify.mockResolvedValue({
      processingId: uploadedPayload.processingId,
      documentCategory: 'UNKNOWN',
      language: 'en',
      isScanned: false,
      parserStrategy: 'TXT_PARSER',
      confidenceScore: 0.9,
    });
    mockParseDocument.mockResolvedValue(undefined);

    const orchestrator = new PipelineOrchestrator();
    await orchestrator.processUpload(uploadedPayload);

    expect(mockFindOneAndUpdate).toHaveBeenNthCalledWith(
      1,
      { processingId: uploadedPayload.processingId, status: 'PENDING' },
      { status: 'PROCESSING', errorMessage: undefined },
      { new: true }
    );
    expect(mockGetFile).toHaveBeenCalledWith(uploadedPayload.storageId);
    expect(mockGetFile).toHaveBeenCalledTimes(1);
    expect(mockClassify).toHaveBeenCalledWith({
      processingId: uploadedPayload.processingId,
      mime: uploadedPayload.mimeType,
      originalName: uploadedPayload.fileName,
      buffer,
    });
    expect(mockClassify).toHaveBeenCalledTimes(1);
    expect(mockParseDocument).toHaveBeenCalledWith({
      processingId: uploadedPayload.processingId,
      buffer,
      parserStrategy: 'TXT_PARSER',
      mimeType: uploadedPayload.mimeType,
      fileName: uploadedPayload.fileName,
      fileSize: uploadedPayload.fileSize,
      storageId: uploadedPayload.storageId,
      isScanned: false,
    });
    expect(mockParseDocument).toHaveBeenCalledTimes(1);
    expect(mockFindOneAndUpdate).toHaveBeenNthCalledWith(
      2,
      { processingId: uploadedPayload.processingId },
      expect.objectContaining({ status: 'SUCCESS', errorMessage: undefined })
    );
  });

  it('marks the upload failed when processing throws', async () => {
    mockFindOneAndUpdate.mockResolvedValueOnce({ processingId: uploadedPayload.processingId });
    mockGetFile.mockRejectedValue(new Error('GridFS unavailable'));

    const orchestrator = new PipelineOrchestrator();
    await orchestrator.processUpload(uploadedPayload);

    expect(mockFindOneAndUpdate).toHaveBeenNthCalledWith(
      2,
      { processingId: uploadedPayload.processingId },
      expect.objectContaining({
        status: 'FAILED',
        errorMessage: 'GridFS unavailable',
      })
    );
    expect(mockClassify).not.toHaveBeenCalled();
    expect(mockParseDocument).not.toHaveBeenCalled();
  });

  it('does not process duplicate uploaded events after the upload leaves pending state', async () => {
    mockFindOneAndUpdate
      .mockResolvedValueOnce({ processingId: uploadedPayload.processingId })
      .mockResolvedValueOnce({ processingId: uploadedPayload.processingId })
      .mockResolvedValueOnce(null);
    mockGetFile.mockResolvedValue(buffer);
    mockClassify.mockResolvedValue({
      processingId: uploadedPayload.processingId,
      documentCategory: 'UNKNOWN',
      language: 'en',
      isScanned: false,
      parserStrategy: 'TXT_PARSER',
      confidenceScore: 0.9,
    });
    mockParseDocument.mockResolvedValue(undefined);

    const orchestrator = new PipelineOrchestrator();
    await orchestrator.processUpload(uploadedPayload);
    await orchestrator.processUpload(uploadedPayload);

    expect(mockGetFile).toHaveBeenCalledTimes(1);
    expect(mockClassify).toHaveBeenCalledTimes(1);
    expect(mockParseDocument).toHaveBeenCalledTimes(1);
    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(3);
    expect(mockFindOneAndUpdate).toHaveBeenNthCalledWith(
      3,
      { processingId: uploadedPayload.processingId, status: 'PENDING' },
      { status: 'PROCESSING', errorMessage: undefined },
      { new: true }
    );
  });
});
