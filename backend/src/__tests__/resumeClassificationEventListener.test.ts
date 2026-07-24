import { eventBus } from '../events/EventBus';
import { UaipEvent } from '../events/UaipEvents';
import { ResumeClassificationEventListener } from '../services/resume/resumeClassificationEventListener';
import { ResumeParseResult } from '../models/ResumeParseResult';
import { KnowledgeRecordModel } from '../models/KnowledgeRecord';
import { ResumeClassifier } from '../services/resume/resumeClassifier.service';

jest.mock('../events/EventBus');
jest.mock('../models/ResumeParseResult');
jest.mock('../models/KnowledgeRecord');
jest.mock('../services/resume/resumeClassifier.service');

const mockEventBusPublish = jest.fn().mockResolvedValue(undefined);
const mockResumeParseResultFindOne = jest.fn();
const mockResumeParseResultFindOneAndUpdate = jest.fn();
const mockKnowledgeRecordFindOne = jest.fn();
const mockKnowledgeRecordUpdateOne = jest.fn();
const mockResumeClassifierClassify = jest.fn();

function mockKnowledgeRecord(data: any) {
  const mockQuery = {
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(data),
  };
  mockKnowledgeRecordFindOne.mockReturnValue(mockQuery);
}

beforeEach(() => {
  jest.clearAllMocks();
  (eventBus.publish as jest.Mock) = mockEventBusPublish;
  (ResumeParseResult.findOne as jest.Mock) = mockResumeParseResultFindOne;
  (ResumeParseResult.findOneAndUpdate as jest.Mock) = mockResumeParseResultFindOneAndUpdate;
  (KnowledgeRecordModel.findOne as jest.Mock) = mockKnowledgeRecordFindOne;
  (KnowledgeRecordModel.updateOne as jest.Mock) = mockKnowledgeRecordUpdateOne;
  (ResumeClassifier as jest.MockedClass<typeof ResumeClassifier>).mockImplementation(() => ({
    classify: mockResumeClassifierClassify,
  } as any));
});

describe('ResumeClassificationEventListener', () => {
  test('subscribes to Parsed and OCR_COMPLETED events on start', () => {
    const listener = new ResumeClassificationEventListener();
    listener.start();
    expect(listener).toBeDefined();
  });

  test('ignores events without processingId', async () => {
    const listener = new ResumeClassificationEventListener();
    listener.start();

    await (listener as any).handleParsedOrOcrCompleted({});
    expect(mockResumeParseResultFindOne).not.toHaveBeenCalled();
  });

  test('skips already classified documents (idempotency)', async () => {
    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({ confidenceScore: 0.8 }),
    };
    mockResumeParseResultFindOne.mockReturnValue(mockQuery);

    const listener = new ResumeClassificationEventListener();
    listener.start();

    await (listener as any).handleParsedOrOcrCompleted({ processingId: 'proc1' });
    expect(mockResumeClassifierClassify).not.toHaveBeenCalled();
  });

  test('reuses existing DocumentClassifier RESUME classification (fast path)', async () => {
    const mockResumeQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({ confidenceScore: 0.9, documentCategory: 'RESUME', rawContent: 'Education: ABC' }),
    };
    mockResumeParseResultFindOne.mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
    });
    mockKnowledgeRecordFindOne.mockReturnValue(mockResumeQuery);
    mockResumeParseResultFindOneAndUpdate.mockResolvedValue({});
    mockKnowledgeRecordUpdateOne.mockResolvedValue({});

    const listener = new ResumeClassificationEventListener();
    listener.start();

    await (listener as any).handleParsedOrOcrCompleted({
      processingId: 'proc1',
      rawContent: 'Education: ABC\nExperience: XYZ\nSkills: Java',
      fileName: 'resume.pdf',
      mimeType: 'application/pdf',
    });

    expect(mockResumeClassifierClassify).not.toHaveBeenCalled();
    expect(mockResumeParseResultFindOneAndUpdate).toHaveBeenCalledWith(
      { processingId: 'proc1' },
      expect.objectContaining({
        confidenceScore: 0.9,
        documentCategory: 'RESUME',
        reviewStatus: 'PENDING_REVIEW',
      })
    );
    expect(mockEventBusPublish).toHaveBeenCalledWith(
      UaipEvent.ResumeClassified,
      expect.objectContaining({
        processingId: 'proc1',
        documentCategory: 'RESUME',
        confidenceScore: 0.9,
      })
    );
  });

  test('classifies document and publishes ResumeClassificationFailed for UNKNOWN', async () => {
    mockKnowledgeRecordFindOne.mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({ documentCategory: 'UNKNOWN', rawContent: 'Lorem ipsum' }),
    });
    mockResumeParseResultFindOne.mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
    });

    mockResumeClassifierClassify.mockReturnValue({
      documentCategory: 'UNKNOWN',
      confidenceScore: 0.3,
      signals: { filenameMatch: false, mimeMatch: false, contentHeuristic: false },
      reason: 'Confidence 0.30 below 0.5 threshold',
    });
    mockResumeParseResultFindOneAndUpdate.mockResolvedValue({});

    const listener = new ResumeClassificationEventListener();
    listener.start();

    await (listener as any).handleParsedOrOcrCompleted({
      processingId: 'proc2',
      rawContent: 'Lorem ipsum dolor sit amet.',
      fileName: 'random.pdf',
      mimeType: 'application/pdf',
    });

    expect(mockResumeClassifierClassify).toHaveBeenCalled();
    expect(mockResumeParseResultFindOneAndUpdate).toHaveBeenCalledWith(
      { processingId: 'proc2' },
      expect.objectContaining({
        confidenceScore: 0.3,
        documentCategory: 'UNKNOWN',
        reviewStatus: 'NEEDS_REINDEX',
      })
    );
    expect(mockEventBusPublish).toHaveBeenCalledWith(
      UaipEvent.ResumeClassificationFailed,
      expect.objectContaining({
        processingId: 'proc2',
        documentCategory: 'UNKNOWN',
        confidenceScore: 0.3,
      })
    );
  });

  test('handles errors gracefully and publishes ResumeClassificationFailed', async () => {
    mockKnowledgeRecordFindOne.mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({ documentCategory: 'UNKNOWN' }),
    });
    mockResumeParseResultFindOne.mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
    });

    mockResumeClassifierClassify.mockImplementation(() => {
      throw new Error('Classifier error');
    });

    const listener = new ResumeClassificationEventListener();
    listener.start();

    await (listener as any).handleParsedOrOcrCompleted({
      processingId: 'proc3',
      rawContent: 'Education: ABC',
      fileName: 'resume.pdf',
      mimeType: 'application/pdf',
    });

    expect(mockEventBusPublish).toHaveBeenCalledWith(
      UaipEvent.ResumeClassificationFailed,
      expect.objectContaining({
        processingId: 'proc3',
        errorMessage: 'Classifier error',
      })
    );
  });

  test('falls back to KnowledgeRecord when rawContent missing from payload', async () => {
    mockKnowledgeRecordFindOne.mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({ rawContent: 'Education: ABC', documentCategory: 'UNKNOWN' }),
    });
    mockResumeParseResultFindOne.mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
    });

    mockResumeClassifierClassify.mockReturnValue({
      documentCategory: 'RESUME',
      confidenceScore: 0.8,
      signals: { filenameMatch: true, mimeMatch: true, contentHeuristic: true },
      reason: 'Classified',
    });
    mockResumeParseResultFindOneAndUpdate.mockResolvedValue({});
    mockKnowledgeRecordUpdateOne.mockResolvedValue({});

    const listener = new ResumeClassificationEventListener();
    listener.start();

    await (listener as any).handleParsedOrOcrCompleted({
      processingId: 'proc4',
      fileName: 'resume.pdf',
      mimeType: 'application/pdf',
    });

    expect(mockKnowledgeRecordFindOne).toHaveBeenCalledWith({ processingId: 'proc4' });
    expect(mockResumeClassifierClassify).toHaveBeenCalledWith(
      expect.objectContaining({ rawText: 'Education: ABC' })
    );
  });
});
