import { KnowledgeDispatcher } from '../shared/services/knowledgeDispatcher.service';
import { UaipEvent } from '../events/UaipEvents';
import { ResumeParseResult } from '../models/ResumeParseResult';
import { eventBus } from '../events/EventBus';
import { AuditEntry } from '../models/AuditEntry';
import { DicIntegrationService } from '../services/resume/dicIntegration.service';
import { CanonicalWriteService } from '../services/resume/canonicalWrite.service';

jest.mock('../events/EventBus');
jest.mock('../models/ResumeParseResult');
jest.mock('../models/AuditEntry');
jest.mock('../services/resume/dicIntegration.service');
jest.mock('../services/resume/canonicalWrite.service');

const mockEventBusPublish = jest.fn().mockResolvedValue(undefined);
const mockResumeParseResultFindOne = jest.fn();
const mockResumeParseResultFindOneAndUpdate = jest.fn();
const mockAuditEntryCreate = jest.fn();
const mockDicIntegrationRoute = jest.fn();
const mockCanonicalWriteWrite = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (eventBus.publish as jest.Mock) = mockEventBusPublish;
  (ResumeParseResult.findOne as jest.Mock) = mockResumeParseResultFindOne;
  (ResumeParseResult.findOneAndUpdate as jest.Mock) = mockResumeParseResultFindOneAndUpdate;
  (AuditEntry.create as jest.Mock) = mockAuditEntryCreate;
  (DicIntegrationService as jest.MockedClass<typeof DicIntegrationService>).mockImplementation(() => ({
    route: mockDicIntegrationRoute,
    handleReviewAction: jest.fn(),
  } as any));
  (CanonicalWriteService as jest.MockedClass<typeof CanonicalWriteService>).mockImplementation(() => ({
    write: mockCanonicalWriteWrite,
  } as any));
});

const mockFindOneQuery = (doc: any) => {
  const mockQuery: any = {
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(doc),
  };
  return mockQuery;
};

describe('Sprint 7 Integration Tests', () => {
  test('end-to-end: confidence_scoring publishes ResumeParseCompleted', async () => {
    mockResumeParseResultFindOne.mockReturnValue(
      mockFindOneQuery({
        confidenceScore: 0,
        reviewStatus: 'PENDING_REVIEW',
        sectionDetectionStrategy: 'heuristic',
        entityExtractionStrategy: 'heuristic',
        aiProviderUsed: 'none',
        failedOver: false,
        extractionIssues: [],
        rawCandidateFields: {},
      })
    );
    mockResumeParseResultFindOneAndUpdate.mockResolvedValue({});

    const dispatcher = new KnowledgeDispatcher();
    await (dispatcher as any).handleResumeConfidenceScoring({
      organizationId: 'org1',
      personId: 'person1',
      sourceDocumentId: 'proc1',
      rawConfidence: 0.9,
      data: {
        payload: {
          processingId: 'proc1',
          stage: 'confidence_scoring',
        },
      },
    });

    expect(mockEventBusPublish).toHaveBeenCalledWith(
      UaipEvent.ResumeParseCompleted,
      expect.objectContaining({
        processingId: 'proc1',
        documentCategory: 'RESUME',
      })
    );
  });

  test('dispatcher routes dic_integration stage', async () => {
    mockResumeParseResultFindOne.mockReturnValue(
      mockFindOneQuery({
        processingId: 'proc1',
        reviewStatus: 'AUTO_APPROVED',
        dicRoutedAt: undefined,
        dicDocumentId: undefined,
        rawCandidateFields: {},
        confidenceScore: 0.9,
      })
    );
    mockResumeParseResultFindOneAndUpdate.mockResolvedValue({});
    mockDicIntegrationRoute.mockResolvedValue({
      routedToDIC: true,
      dicDocumentId: 'dic-proc1',
      action: 'auto_approved',
    });

    const dispatcher = new KnowledgeDispatcher();

    await expect(
      (dispatcher as any).handleResumeDicIntegration({
        organizationId: 'org1',
        personId: 'person1',
        sourceDocumentId: 'proc1',
        rawConfidence: 0.9,
        data: {
          payload: {
            processingId: 'proc1',
            stage: 'dic_integration',
          },
        },
      })
    ).resolves.toBeUndefined();

    expect(mockEventBusPublish).toHaveBeenCalledWith(
      UaipEvent.ResumeDICRouted,
      expect.objectContaining({
        action: 'auto_approved',
      })
    );
  });

  test('dispatcher routes canonical_write stage', async () => {
    mockResumeParseResultFindOne.mockReturnValue(
      mockFindOneQuery({
        processingId: 'proc1',
        canonicalWrittenAt: undefined,
        rawCandidateFields: {},
        confidenceScore: 0.9,
      })
    );
    mockResumeParseResultFindOneAndUpdate.mockResolvedValue({});
    mockCanonicalWriteWrite.mockRejectedValue(new Error('write failed'));

    const dispatcher = new KnowledgeDispatcher();

    await expect(
      (dispatcher as any).handleResumeCanonicalWrite({
        organizationId: 'org1',
        personId: 'person1',
        sourceDocumentId: 'proc1',
        rawConfidence: 0.9,
        data: {
          payload: {
            processingId: 'proc1',
            stage: 'canonical_write',
          },
        },
      })
    ).rejects.toThrow('write failed');

    expect(mockEventBusPublish).toHaveBeenCalledWith(
      UaipEvent.ResumeCanonicalWriteFailed,
      expect.objectContaining({
        processingId: 'proc1',
        reason: 'unknown',
      })
    );
  });
});
