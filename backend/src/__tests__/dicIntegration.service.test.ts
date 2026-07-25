import { DicIntegrationService } from '../services/resume/dicIntegration.service';
import { UaipEvent } from '../events/UaipEvents';
import { ResumeParseResult } from '../models/ResumeParseResult';
import { KnowledgeJobRepository } from '../shared/repositories/knowledgeJob.repository';

jest.mock('../events/EventBus');
jest.mock('../models/ResumeParseResult');
jest.mock('../shared/repositories/knowledgeJob.repository');

const mockEventBusPublish = jest.fn().mockResolvedValue(undefined);
const mockResumeParseResultFindOne = jest.fn();
const mockResumeParseResultFindOneAndUpdate = jest.fn();
const mockJobRepoCreate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (require('../events/EventBus').eventBus.publish as jest.Mock) = mockEventBusPublish;
  (ResumeParseResult.findOne as jest.Mock) = mockResumeParseResultFindOne;
  (ResumeParseResult.findOneAndUpdate as jest.Mock) = mockResumeParseResultFindOneAndUpdate;
  (KnowledgeJobRepository as jest.MockedClass<typeof KnowledgeJobRepository>).mockImplementation(() => ({
    create: mockJobRepoCreate,
  } as any));
});

const mockFindOneQuery = (doc: any) => {
  const mockQuery: any = {
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(doc),
  };
  return mockQuery;
};

describe('DicIntegrationService', () => {
  const baseParams = {
    processingId: 'proc1',
    organizationId: 'org1',
    userId: 'user1',
  };

  it('routes AUTO_APPROVED to DIC and enqueues canonical_write', async () => {
    const service = new DicIntegrationService();
    const doc = {
      processingId: 'proc1',
      reviewStatus: 'AUTO_APPROVED',
      dicRoutedAt: undefined,
      dicDocumentId: undefined,
    };
    mockResumeParseResultFindOne.mockReturnValue(mockFindOneQuery(doc));
    mockResumeParseResultFindOneAndUpdate.mockResolvedValue({});
    mockJobRepoCreate.mockResolvedValue({});

    const output = await service.route(baseParams);

    expect(output.routedToDIC).toBe(true);
    expect(output.action).toBe('auto_approved');
    expect(output.dicDocumentId).toBe('dic-proc1');
    expect(mockResumeParseResultFindOneAndUpdate).toHaveBeenCalledWith(
      { processingId: 'proc1' },
      expect.objectContaining({
        $set: expect.objectContaining({
          dicRoutedAt: expect.any(Date),
          dicDocumentId: 'dic-proc1',
        }),
      })
    );
    expect(mockEventBusPublish).toHaveBeenCalledWith(
      UaipEvent.ResumeDICRouted,
      expect.objectContaining({
        processingId: 'proc1',
        action: 'auto_approved',
        dicDocumentId: 'dic-proc1',
      })
    );
    expect(mockJobRepoCreate).toHaveBeenCalledWith({
      personId: 'user1',
      sourceDocumentId: 'proc1',
      domain: 'resume',
      payload: {
        processingId: 'proc1',
        organizationId: 'org1',
        userId: 'user1',
        stage: 'canonical_write',
      },
      maxRetries: 3,
    });
  });

  it('routes PENDING_REVIEW without enqueuing canonical_write', async () => {
    const service = new DicIntegrationService();
    const doc = {
      processingId: 'proc1',
      reviewStatus: 'PENDING_REVIEW',
      dicRoutedAt: undefined,
      dicDocumentId: undefined,
    };
    mockResumeParseResultFindOne.mockReturnValue(mockFindOneQuery(doc));
    mockResumeParseResultFindOneAndUpdate.mockResolvedValue({});

    const output = await service.route(baseParams);

    expect(output.routedToDIC).toBe(true);
    expect(output.action).toBe('queued_review');
    expect(mockJobRepoCreate).not.toHaveBeenCalled();
  });

  it('routes NEEDS_REINDEX', async () => {
    const service = new DicIntegrationService();
    const doc = {
      processingId: 'proc1',
      reviewStatus: 'NEEDS_REINDEX',
      dicRoutedAt: undefined,
      dicDocumentId: undefined,
    };
    mockResumeParseResultFindOne.mockReturnValue(mockFindOneQuery(doc));
    mockResumeParseResultFindOneAndUpdate.mockResolvedValue({});

    const output = await service.route(baseParams);

    expect(output.routedToDIC).toBe(true);
    expect(output.action).toBe('needs_reindex');
  });

  it('skips routing if already routed', async () => {
    const service = new DicIntegrationService();
    const doc = {
      processingId: 'proc1',
      reviewStatus: 'PENDING_REVIEW',
      dicRoutedAt: new Date(),
      dicDocumentId: 'dic-proc1',
    };
    mockResumeParseResultFindOne.mockReturnValue(mockFindOneQuery(doc));

    const output = await service.route(baseParams);

    expect(output.routedToDIC).toBe(true);
    expect(output.action).toBe('queued_review');
    expect(mockResumeParseResultFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('publishes ResumeDICRoutingFailed on error', async () => {
    const service = new DicIntegrationService();
    mockResumeParseResultFindOne.mockReturnValue(mockFindOneQuery(null));

    await expect(service.route(baseParams)).rejects.toThrow('ResumeParseResult not found');
    expect(mockEventBusPublish).toHaveBeenCalledWith(
      UaipEvent.ResumeDICRoutingFailed,
      expect.objectContaining({
        processingId: 'proc1',
        reason: 'unknown',
      })
    );
  });

  it('handles APPROVED review action', async () => {
    const service = new DicIntegrationService();
    const doc = {
      processingId: 'proc1',
      reviewStatus: 'PENDING_REVIEW',
      dicDocumentId: 'dic-proc1',
    };
    mockResumeParseResultFindOne.mockReturnValue(mockFindOneQuery(doc));
    mockResumeParseResultFindOneAndUpdate.mockResolvedValue({});
    mockJobRepoCreate.mockResolvedValue({});

    await service.handleReviewAction({
      processingId: 'proc1',
      organizationId: 'org1',
      userId: 'user1',
      action: 'APPROVED',
    });

    expect(mockResumeParseResultFindOneAndUpdate).toHaveBeenCalledWith(
      { processingId: 'proc1' },
      { $set: { reviewStatus: 'AUTO_APPROVED' } }
    );
    expect(mockEventBusPublish).toHaveBeenCalledWith(
      UaipEvent.ResumeDICRouted,
      expect.objectContaining({ action: 'approved' })
    );
    expect(mockJobRepoCreate).toHaveBeenCalled();
  });

  it('handles REJECTED review action', async () => {
    const service = new DicIntegrationService();
    const doc = {
      processingId: 'proc1',
      reviewStatus: 'PENDING_REVIEW',
      dicDocumentId: 'dic-proc1',
    };
    mockResumeParseResultFindOne.mockReturnValue(mockFindOneQuery(doc));
    mockResumeParseResultFindOneAndUpdate.mockResolvedValue({});

    await service.handleReviewAction({
      processingId: 'proc1',
      organizationId: 'org1',
      userId: 'user1',
      action: 'REJECTED',
    });

    expect(mockResumeParseResultFindOneAndUpdate).toHaveBeenCalledWith(
      { processingId: 'proc1' },
      { $set: { reviewStatus: 'NEEDS_REINDEX' } }
    );
    expect(mockEventBusPublish).toHaveBeenCalledWith(
      UaipEvent.ResumeDICRoutingFailed,
      expect.objectContaining({ errorMessage: 'Rejected by DIC reviewer' })
    );
  });

  it('handles ROLLBACK review action', async () => {
    const service = new DicIntegrationService();
    const doc = {
      processingId: 'proc1',
      reviewStatus: 'PENDING_REVIEW',
      dicDocumentId: 'dic-proc1',
    };
    mockResumeParseResultFindOne.mockReturnValue(mockFindOneQuery(doc));
    mockResumeParseResultFindOneAndUpdate.mockResolvedValue({});

    await service.handleReviewAction({
      processingId: 'proc1',
      organizationId: 'org1',
      userId: 'user1',
      action: 'ROLLBACK',
    });

    expect(mockResumeParseResultFindOneAndUpdate).toHaveBeenCalledWith(
      { processingId: 'proc1' },
      { $set: { reviewStatus: 'PENDING_REVIEW' } }
    );
    expect(mockEventBusPublish).toHaveBeenCalledWith(
      UaipEvent.ResumeDICRouted,
      expect.objectContaining({ action: 'rollback' })
    );
  });
});
