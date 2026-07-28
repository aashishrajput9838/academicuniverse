jest.mock('mongoose', () => ({
  __esModule: true,
  default: {
    startSession: jest.fn().mockImplementation(() => ({
      startTransaction: jest.fn(),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      abortTransaction: jest.fn().mockResolvedValue(undefined),
      endSession: jest.fn().mockResolvedValue(undefined),
    })),
    connection: {
      db: {
        admin: () => ({
          command: jest.fn().mockResolvedValue({ setName: 'rs0' }),
        }),
      },
    },
  },
}));

jest.mock('../../../models/UaipUpload', () => ({
  UaipUpload: {
    find: jest.fn(),
    bulkWrite: jest.fn(),
  },
}));

jest.mock('../../../models/KnowledgeRecord', () => ({
  KnowledgeRecordModel: {
    find: jest.fn(),
    updateMany: jest.fn(),
  },
}));

jest.mock('../../../models/ReviewHistory', () => ({
  ReviewHistory: {
    updateMany: jest.fn(),
  },
}));

jest.mock('../../../storage/GridFSProvider', () => ({
  GridFSProvider: jest.fn().mockImplementation(() => ({
    delete: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('../../../services/ocr/OCRService', () => ({
  OCRService: {
    clearProcessingId: jest.fn().mockResolvedValue(undefined),
  },
}));

import { UaipUpload } from '../../../models/UaipUpload';
import { KnowledgeRecordModel } from '../../../models/KnowledgeRecord';
import { ReviewHistory } from '../../../models/ReviewHistory';
import { DocumentIntelligenceRepository } from '../documentIntelligence.repository';
import { DocumentIntelligenceController } from '../documentIntelligence.controller';

describe('Bulk Delete Review Required Files', () => {
  const organizationId = 'org-test-123';
  const userId = 'user-test-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('successfully bulk soft-deletes eligible Review Required documents', async () => {
    const mockUploads = [
      { _id: 'u1', processingId: 'pid-1', status: 'SUCCESS', fileHash: 'hash-1', organizationId, uploadedBy: userId },
      { _id: 'u2', processingId: 'pid-2', status: 'SUCCESS', fileHash: 'hash-2', organizationId, uploadedBy: userId },
    ];

    const mockKnowledgeRecords = [
      { _id: 'kr1', processingId: 'pid-1', reviewStatus: 'PENDING_REVIEW', status: 'ACTIVE' },
      { _id: 'kr2', processingId: 'pid-2', reviewStatus: 'PENDING_REVIEW', status: 'ACTIVE' },
    ];

    (UaipUpload.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockUploads),
    });

    (KnowledgeRecordModel.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockKnowledgeRecords),
    });

    (UaipUpload.bulkWrite as jest.Mock).mockResolvedValue({ modifiedCount: 2 });
    (KnowledgeRecordModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 2 });
    (ReviewHistory.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 2 });

    const repo = new DocumentIntelligenceRepository();
    const result = await repo.bulkDeleteReviewRequired(organizationId, userId);

    expect(result.totalMatched).toBe(2);
    expect(result.successfullyDeleted).toBe(2);
    expect(result.failedCount).toBe(0);
    expect(result.deletedProcessingIds).toEqual(['pid-1', 'pid-2']);
    expect(UaipUpload.bulkWrite).toHaveBeenCalledTimes(1);
    expect(KnowledgeRecordModel.updateMany).toHaveBeenCalledTimes(1);
  });

  it('excludes APPROVED and PROCESSING documents from bulk deletion', async () => {
    const mockUploads = [
      { _id: 'u1', processingId: 'pid-pending', status: 'SUCCESS', organizationId, uploadedBy: userId },
      { _id: 'u2', processingId: 'pid-approved', status: 'SUCCESS', organizationId, uploadedBy: userId },
      { _id: 'u3', processingId: 'pid-processing', status: 'PROCESSING', organizationId, uploadedBy: userId },
    ];

    const mockKnowledgeRecords = [
      { _id: 'kr1', processingId: 'pid-pending', reviewStatus: 'PENDING_REVIEW', status: 'ACTIVE' },
      { _id: 'kr2', processingId: 'pid-approved', reviewStatus: 'APPROVED', status: 'ACTIVE' },
    ];

    (UaipUpload.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockUploads),
    });

    (KnowledgeRecordModel.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockKnowledgeRecords),
    });

    (UaipUpload.bulkWrite as jest.Mock).mockResolvedValue({ modifiedCount: 1 });

    const repo = new DocumentIntelligenceRepository();
    const result = await repo.bulkDeleteReviewRequired(organizationId, userId);

    expect(result.totalMatched).toBe(1);
    expect(result.deletedProcessingIds).toEqual(['pid-pending']);
  });

  it('controller correctly calls service and returns bulk delete summary response', async () => {
    const mockResult = {
      totalMatched: 3,
      successfullyDeleted: 3,
      failedCount: 0,
      failedProcessingIds: [],
      deletedProcessingIds: ['p1', 'p2', 'p3'],
      durationMs: 12,
    };

    const controller = new DocumentIntelligenceController();
    (controller as any).service = {
      bulkDeleteReviewRequired: jest.fn().mockResolvedValue(mockResult),
    };

    const req: any = {
      organizationId,
      user: { userId },
      requestId: 'req-abc',
    };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await controller.bulkDeleteReviewRequired(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: mockResult,
      })
    );
  });
});
