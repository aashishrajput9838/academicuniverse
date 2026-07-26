import { ReviewService } from '../shared/services/review.service';
import { UaipEvent } from '../events/UaipEvents';
import { ResumePersonSuggestion } from '../models/ResumePersonSuggestion';
import { ReviewAuditLog } from '../models/ReviewAuditLog';
import { UaipUpload } from '../models/UaipUpload';
import { Person } from '../models/Person';
import { Types } from 'mongoose';

jest.mock('../events/EventBus');
jest.mock('../models/ResumePersonSuggestion');
jest.mock('../models/ReviewAuditLog');
jest.mock('../models/UaipUpload');
jest.mock('../models/Person');

const mockEventBusPublish = jest.fn().mockResolvedValue(undefined);
const mockResumePersonSuggestionFindOne = jest.fn();
const mockResumePersonSuggestionFindOneAndUpdate = jest.fn();
const mockReviewAuditLogCreate = jest.fn();
const mockUaipUploadFindOne = jest.fn();
const mockPersonFindOne = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (require('../events/EventBus').eventBus.publish as jest.Mock) = mockEventBusPublish;
  (ResumePersonSuggestion.findOne as jest.Mock) = mockResumePersonSuggestionFindOne;
  (ResumePersonSuggestion.findOneAndUpdate as jest.Mock) = mockResumePersonSuggestionFindOneAndUpdate;
  (ReviewAuditLog.create as jest.Mock) = mockReviewAuditLogCreate;
  (UaipUpload.findOne as jest.Mock) = mockUaipUploadFindOne;
  (Person.findOne as jest.Mock) = mockPersonFindOne;
});

const mockFindOneQuery = (doc: any) => {
  return {
    lean: jest.fn().mockReturnValue(doc),
    exec: jest.fn().mockResolvedValue(doc),
  };
};

describe('ReviewService.applyPersonOverride', () => {
  const service = new ReviewService();
  const reviewer = {
    userId: '507f1f77bcf86cd799439013',
    role: 'FACULTY',
    organizationId: '507f1f77bcf86cd799439014',
  };
  const oldPersonId = '507f1f77bcf86cd799439011';
  const newPersonId = '507f1f77bcf86cd799439012';
  const orgId = reviewer.organizationId;

  it('should override person match and record manual in matchBasis', async () => {
    mockUaipUploadFindOne.mockReturnValue(
      mockFindOneQuery({ processingId: 'proc1', organizationId: orgId, status: 'PROCESSING' })
    );
    mockPersonFindOne.mockReturnValue(
      mockFindOneQuery({ _id: newPersonId, organizationId: orgId })
    );
    mockResumePersonSuggestionFindOne
      .mockReturnValueOnce(
        mockFindOneQuery({
          processingId: 'proc1',
          organizationId: orgId,
          suggestedPersonId: oldPersonId,
          matchBasis: ['email'],
          version: 1,
          status: 'PENDING',
        })
      )
      .mockReturnValueOnce(
        mockFindOneQuery({
          processingId: 'proc1',
          organizationId: orgId,
          suggestedPersonId: newPersonId,
          matchBasis: ['email', 'manual'],
          version: 2,
          status: 'ACCEPTED',
        })
      );
    mockResumePersonSuggestionFindOneAndUpdate.mockReturnValue(
      mockFindOneQuery({ processingId: 'proc1', version: 1 })
    );

    const result = await service.applyPersonOverride({
      processingId: 'proc1',
      organizationId: orgId,
      reviewer,
      suggestedPersonId: newPersonId,
      expectedVersion: 1,
    });

    expect(result.version).toBe(2);
    expect(mockResumePersonSuggestionFindOneAndUpdate).toHaveBeenCalledWith(
      { processingId: 'proc1', version: 1 },
      expect.objectContaining({
        $set: expect.objectContaining({
          suggestedPersonId: expect.any(Types.ObjectId),
          matchBasis: ['email', 'manual'],
          status: 'ACCEPTED',
          version: 2,
        }),
      })
    );
    expect(Person.findOne).toHaveBeenCalledWith(
      { _id: expect.any(Types.ObjectId), organizationId: expect.any(Types.ObjectId) }
    );
    expect(ReviewAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        processingId: 'proc1',
        organizationId: expect.any(Types.ObjectId),
        action: 'PERSON_OVERRIDE',
        actorId: reviewer.userId,
        actorRole: 'FACULTY',
        previousSuggestedPersonId: expect.any(Types.ObjectId),
        newSuggestedPersonId: expect.any(Types.ObjectId),
        previousMatchBasis: ['email'],
        newMatchBasis: ['email', 'manual'],
        previousVersion: 1,
        newVersion: 2,
        previousStatus: 'PENDING',
        newStatus: 'ACCEPTED',
      })
    );
    expect(mockEventBusPublish).toHaveBeenCalledWith(
      UaipEvent.ResumePersonSuggestionUpdated,
      expect.objectContaining({
        processingId: 'proc1',
        organizationId: orgId,
        userId: reviewer.userId,
        reviewerId: reviewer.userId,
        suggestedPersonId: newPersonId,
        previousSuggestedPersonId: oldPersonId,
        matchBasis: ['email', 'manual'],
        version: 2,
      })
    );
  });

  it('should reject cross-org suggestedPersonId', async () => {
    mockUaipUploadFindOne.mockReturnValue(
      mockFindOneQuery({ processingId: 'proc1', organizationId: orgId, status: 'PROCESSING' })
    );
    mockResumePersonSuggestionFindOne.mockReturnValue(
      mockFindOneQuery({
        processingId: 'proc1',
        suggestedPersonId: oldPersonId,
        matchBasis: ['email'],
        version: 1,
        status: 'PENDING',
      })
    );
    mockPersonFindOne.mockReturnValue(
      mockFindOneQuery(null)
    );

    await expect(
      service.applyPersonOverride({
        processingId: 'proc1',
        organizationId: orgId,
        reviewer,
        suggestedPersonId: newPersonId,
        expectedVersion: 1,
      })
    ).rejects.toThrow('Forbidden: target person not found in organization');
  });

  it('should throw ConflictError when version mismatches', async () => {
    mockUaipUploadFindOne.mockReturnValue(
      mockFindOneQuery({ processingId: 'proc1', organizationId: orgId, status: 'PROCESSING' })
    );
    mockPersonFindOne.mockReturnValue(
      mockFindOneQuery({ _id: newPersonId, organizationId: orgId })
    );
    mockResumePersonSuggestionFindOne.mockReturnValue(
      mockFindOneQuery({
        processingId: 'proc1',
        version: 2,
      })
    );

    await expect(
      service.applyPersonOverride({
        processingId: 'proc1',
        organizationId: orgId,
        reviewer,
        suggestedPersonId: newPersonId,
        expectedVersion: 1,
      })
    ).rejects.toThrow('Conflict: version mismatch');
  });

  it('should return cached result for duplicate idempotency key within 24h', async () => {
    mockUaipUploadFindOne.mockReturnValue(
      mockFindOneQuery({ processingId: 'proc1', organizationId: orgId, status: 'PROCESSING' })
    );
    mockPersonFindOne.mockReturnValue(
      mockFindOneQuery({ _id: newPersonId, organizationId: orgId })
    );
    mockResumePersonSuggestionFindOne.mockReturnValue(
      mockFindOneQuery({
        processingId: 'proc1',
        suggestedPersonId: newPersonId,
        version: 1,
      })
    );

    const existingLog = {
      _id: 'log1',
      processingId: 'proc1',
      action: 'PERSON_OVERRIDE',
      idempotencyKey: 'idem-1',
      timestamp: new Date(),
    };
    (ReviewAuditLog.findOne as jest.Mock).mockReturnValue(
      mockFindOneQuery({
        _id: 'log1',
        processingId: 'proc1',
        action: 'PERSON_OVERRIDE',
        idempotencyKey: 'idem-1',
        timestamp: new Date(),
      })
    );

    const result = await service.applyPersonOverride({
      processingId: 'proc1',
      organizationId: orgId,
      reviewer,
      suggestedPersonId: newPersonId,
      expectedVersion: 1,
      idempotencyKey: 'idem-1',
    });

    expect(result.version).toBe(1);
    expect(mockResumePersonSuggestionFindOneAndUpdate).not.toHaveBeenCalled();
    expect(ReviewAuditLog.create).not.toHaveBeenCalled();
    expect(mockEventBusPublish).not.toHaveBeenCalled();
  });

  it('should throw ConflictError when idempotency key has stale version', async () => {
    mockUaipUploadFindOne.mockReturnValue(
      mockFindOneQuery({ processingId: 'proc1', organizationId: orgId, status: 'PROCESSING' })
    );
    mockPersonFindOne.mockReturnValue(
      mockFindOneQuery({ _id: newPersonId, organizationId: orgId })
    );
    mockResumePersonSuggestionFindOne.mockReturnValue(
      mockFindOneQuery({
        processingId: 'proc1',
        version: 2,
      })
    );

    await expect(
      service.applyPersonOverride({
        processingId: 'proc1',
        organizationId: orgId,
        reviewer,
        suggestedPersonId: newPersonId,
        expectedVersion: 1,
        idempotencyKey: 'idem-1',
      })
    ).rejects.toThrow('Conflict: version mismatch');
  });

  it('should throw ConflictError on concurrent update when findOneAndUpdate modifies 0 docs', async () => {
    mockUaipUploadFindOne.mockReturnValue(
      mockFindOneQuery({ processingId: 'proc1', organizationId: orgId, status: 'PROCESSING' })
    );
    mockPersonFindOne.mockReturnValue(
      mockFindOneQuery({ _id: newPersonId, organizationId: orgId })
    );
    mockResumePersonSuggestionFindOne.mockReturnValue(
      mockFindOneQuery({
        processingId: 'proc1',
        suggestedPersonId: oldPersonId,
        matchBasis: ['email'],
        version: 1,
        status: 'PENDING',
      })
    );
    (ResumePersonSuggestion.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

    await expect(
      service.applyPersonOverride({
        processingId: 'proc1',
        organizationId: orgId,
        reviewer,
        suggestedPersonId: newPersonId,
        expectedVersion: 1,
      })
    ).rejects.toThrow('Conflict: concurrent update detected');
  });

  it('should throw when ResumePersonSuggestion not found', async () => {
    mockUaipUploadFindOne.mockReturnValue(
      mockFindOneQuery({ processingId: 'proc1', organizationId: orgId, status: 'PROCESSING' })
    );
    mockPersonFindOne.mockReturnValue(
      mockFindOneQuery({ _id: newPersonId, organizationId: orgId })
    );
    mockResumePersonSuggestionFindOne.mockReturnValue(
      mockFindOneQuery(null)
    );

    await expect(
      service.applyPersonOverride({
        processingId: 'proc1',
        organizationId: orgId,
        reviewer,
        suggestedPersonId: newPersonId,
        expectedVersion: 1,
      })
    ).rejects.toThrow('ResumePersonSuggestion not found for processingId: proc1');
  });

  it('should throw Forbidden when upload is missing or deleted', async () => {
    mockUaipUploadFindOne.mockReturnValue(
      mockFindOneQuery(null)
    );

    await expect(
      service.applyPersonOverride({
        processingId: 'proc1',
        organizationId: orgId,
        reviewer,
        suggestedPersonId: newPersonId,
        expectedVersion: 1,
      })
    ).rejects.toThrow('Document not found');
  });

  it('should throw Forbidden on cross-tenant access', async () => {
    mockUaipUploadFindOne.mockReturnValue(
      mockFindOneQuery({ processingId: 'proc1', organizationId: '507f1f77bcf86cd799439099', status: 'PROCESSING' })
    );

    await expect(
      service.applyPersonOverride({
        processingId: 'proc1',
        organizationId: orgId,
        reviewer,
        suggestedPersonId: newPersonId,
        expectedVersion: 1,
      })
    ).rejects.toThrow('Forbidden: cross-tenant access denied');
  });
});
