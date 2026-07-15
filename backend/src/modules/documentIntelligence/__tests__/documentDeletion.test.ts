jest.mock('mongoose', () => ({
  __esModule: true,
  default: {
    startSession: jest.fn(),
  },
}));

jest.mock('../../../models/UaipUpload', () => ({
  UaipUpload: {
    findOne: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.mock('../../../models/KnowledgeRecord', () => ({
  KnowledgeRecordModel: {
    findOne: jest.fn(),
    find: jest.fn(),
    updateMany: jest.fn(),
  },
}));

jest.mock('../../../models/ReviewHistory', () => ({
  ReviewHistory: {
    find: jest.fn(),
    updateMany: jest.fn(),
  },
}));

import mongoose from 'mongoose';
import { UaipUpload } from '../../../models/UaipUpload';
import { KnowledgeRecordModel } from '../../../models/KnowledgeRecord';
import { ReviewHistory } from '../../../models/ReviewHistory';
import { DocumentIntelligenceController } from '../documentIntelligence.controller';
import { DocumentIntelligenceRepository } from '../documentIntelligence.repository';
import { GrowthUploadService } from '../../growth/growthUpload.service';

const processingId = 'processing-123';
const organizationId = 'organization-123';
const deletedBy = 'user-123';

const sessionQuery = (value: unknown) => ({
  session: jest.fn().mockResolvedValue(value),
});

describe('Document Intelligence soft deletion', () => {
  const session = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    abortTransaction: jest.fn().mockResolvedValue(undefined),
    endSession: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (mongoose.startSession as jest.Mock).mockResolvedValue(session);
    (KnowledgeRecordModel.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 1 });
    (ReviewHistory.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 1 });
  });

  it('soft-deletes the upload, knowledge record, and saved review drafts without touching canonical records', async () => {
    const upload: any = {
      processingId,
      organizationId,
      status: 'SUCCESS',
      fileHash: 'file-hash',
      save: jest.fn().mockResolvedValue(undefined),
    };
    const knowledgeRecord = {
      processingId,
      reviewStatus: 'PENDING_REVIEW',
    };
    (UaipUpload.findOne as jest.Mock).mockReturnValue(sessionQuery(upload));
    (KnowledgeRecordModel.findOne as jest.Mock).mockReturnValue(sessionQuery(knowledgeRecord));

    const result = await new DocumentIntelligenceRepository().softDeleteDocument(
      organizationId,
      processingId,
      deletedBy
    );

    expect(result).toEqual(expect.objectContaining({ outcome: 'DELETED', processingId }));
    expect(upload.status).toBe('DELETED');
    expect(upload.deletedBy).toBe(deletedBy);
    expect(upload.deletedAt).toBeInstanceOf(Date);
    expect(upload.deletedFileHash).toBe('file-hash');
    expect(upload.fileHash).toBeUndefined();
    expect(upload.save).toHaveBeenCalledWith({ session });
    expect(KnowledgeRecordModel.updateMany).toHaveBeenCalledWith(
      { processingId, status: { $ne: 'DELETED' } },
      {
        $set: expect.objectContaining({
          status: 'DELETED',
          deletedBy,
          deletedAt: expect.any(Date),
        }),
      },
      { session }
    );
    expect(ReviewHistory.updateMany).toHaveBeenCalledWith(
      {
        processingId,
        action: 'DRAFT_SAVED',
        status: { $ne: 'DELETED' },
      },
      {
        $set: expect.objectContaining({
          status: 'DELETED',
          deletedBy,
          deletedAt: expect.any(Date),
        }),
      },
      { session }
    );
    expect(session.commitTransaction).toHaveBeenCalledTimes(1);
  });

  it('refuses an approved document before changing any workflow record', async () => {
    const upload: any = {
      processingId,
      organizationId,
      status: 'SUCCESS',
      save: jest.fn(),
    };
    (UaipUpload.findOne as jest.Mock).mockReturnValue(sessionQuery(upload));
    (KnowledgeRecordModel.findOne as jest.Mock).mockReturnValue(
      sessionQuery({ processingId, reviewStatus: 'APPROVED' })
    );

    const result = await new DocumentIntelligenceRepository().softDeleteDocument(
      organizationId,
      processingId,
      deletedBy
    );

    expect(result).toEqual({ outcome: 'APPROVED', processingId });
    expect(upload.save).not.toHaveBeenCalled();
    expect(KnowledgeRecordModel.updateMany).not.toHaveBeenCalled();
    expect(ReviewHistory.updateMany).not.toHaveBeenCalled();
  });

  it('returns the required message when an approved-document deletion reaches the controller', async () => {
    const service: any = {
      softDeleteDocument: jest.fn().mockResolvedValue({ outcome: 'APPROVED', processingId }),
    };
    const controller = new DocumentIntelligenceController(service);
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);

    await controller.deleteDocument(
      {
        organizationId,
        user: { userId: deletedBy },
        params: { processingId },
      } as any,
      res,
      jest.fn()
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'This document has already produced canonical records. Perform a rollback before deletion.',
      })
    );
  });

  it('queries only active uploads for the Document Intelligence Center', async () => {
    const upload = {
      processingId,
      organizationId,
      fileName: 'pending.pdf',
      mimeType: 'application/pdf',
      size: 100,
      status: 'SUCCESS',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    (UaipUpload.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([upload]) }),
      }),
    });
    (KnowledgeRecordModel.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });
    (ReviewHistory.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    });
    (UaipUpload.countDocuments as jest.Mock).mockResolvedValue(1);

    await new DocumentIntelligenceRepository().listDocuments(organizationId, {});

    expect(UaipUpload.find).toHaveBeenCalledWith({
      organizationId,
      status: { $ne: 'DELETED' },
    });
    expect(UaipUpload.countDocuments).toHaveBeenCalledWith({
      organizationId,
      status: { $ne: 'DELETED' },
    });
  });

  it('queries only active uploads for all Growth Hub document sections', async () => {
    const upload = {
      processingId,
      organizationId,
      userId: deletedBy,
      fileName: 'pending.pdf',
      mimeType: 'application/pdf',
      size: 100,
      status: 'SUCCESS',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    (UaipUpload.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([upload]) }),
      }),
    });
    (KnowledgeRecordModel.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });

    await new GrowthUploadService().getUploadHistory({
      organizationId,
      userId: deletedBy,
    });

    expect(UaipUpload.find).toHaveBeenCalledWith({
      organizationId,
      userId: deletedBy,
      status: { $ne: 'DELETED' },
    });
  });
});
