import { Request, Response, NextFunction } from 'express';
import { sendResponse } from '../../utils/response';
import { GrowthProjectionService } from './growthProjection.service';
import { UaipFacade } from '../../shared/application/UaipFacade';

export class GrowthController {
  constructor(
    private readonly uaip: UaipFacade,
    private readonly projectionService = new GrowthProjectionService(),
  ) {}

  public getMyGrowthHub = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).organizationId;
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      if (!organizationId) {
        return res.status(403).json({ success: false, message: 'Organization context is required' });
      }

      const projection = await this.projectionService.buildProjection(userId, organizationId);
      return sendResponse(res, 200, projection, 'Growth Hub metrics retrieved successfully');
    } catch (err) {
      next(err);
    }
  };

  public handleUpload = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ status: 'error', message: 'No file provided' });
      }

      const organizationId = (req as any).organizationId;
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      if (!organizationId) {
        return res.status(403).json({ success: false, message: 'Organization context is required' });
      }

      // Delegate entirely to the UAIP facade — no pipeline internals visible here.
      const { processingId } = await this.uaip.submitDocument({
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        userId,
        organizationId,
      });

      return sendResponse(res, 202, { processingId }, 'Document upload accepted');
    } catch (err) {
      next(err);
    }
  };

  public getDocumentStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).organizationId;
      const userId = (req as any).user?.userId;
      const doc = await this.uaip.getDocumentStatus(req.params.id);

      if (!doc || doc.organizationId !== organizationId || doc.userId !== userId) {
        return res.status(404).json({ status: 'error', message: 'Document not found' });
      }

      return sendResponse(res, 200, doc, 'Document status retrieved successfully');
    } catch (err) {
      next(err);
    }
  };

  public getUploadHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).organizationId;
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      if (!organizationId) {
        return res.status(403).json({ success: false, message: 'Organization context is required' });
      }

      const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
      const limit = rawLimit ? Number(rawLimit) : undefined;
      const cursor = Array.isArray(req.query.cursor) ? req.query.cursor[0] : req.query.cursor;

      const history = await this.uaip.getUploadHistory({
        userId,
        organizationId,
        limit: Number.isFinite(limit) ? limit : undefined,
        cursor: typeof cursor === 'string' ? cursor : undefined,
      });

      return sendResponse(res, 200, history, 'Growth upload history retrieved successfully');
    } catch (err) {
      next(err);
    }
  };

  public getProcessingStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).organizationId;
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      if (!organizationId) {
        return res.status(403).json({ success: false, message: 'Organization context is required' });
      }

      const status = await this.uaip.getProcessingStatus({
        userId,
        organizationId,
        processingId: req.params.processingId,
      });

      if (!status) {
        return res.status(404).json({ status: 'error', message: 'Upload not found' });
      }

      return sendResponse(res, 200, status, 'Growth upload status retrieved successfully');
    } catch (err) {
      next(err);
    }
  };

  public streamDocumentFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).organizationId;
      const { id } = req.params;

      const { UaipUpload } = await import('../../models/UaipUpload');
      const { GridFSProvider } = await import('../../storage/GridFSProvider');
      const { toObjectId } = await import('../../utils/mongooseHelpers');

      // Find by _id or processingId
      const query: any = { organizationId };
      if (id && id.length === 24) {
        query.$or = [{ _id: toObjectId(id) }, { processingId: id }];
      } else {
        query.processingId = id;
      }

      const upload = await UaipUpload.findOne(query);
      if (!upload || !upload.storageId) {
        return res.status(404).json({ success: false, message: 'Document file not found' });
      }

      const gridFs = new GridFSProvider();
      const buffer = await gridFs.getFile(upload.storageId);

      res.setHeader('Content-Type', upload.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${upload.fileName}"`);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  };

  public streamDocumentThumbnail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).organizationId;
      const { id } = req.params;

      const { UaipUpload } = await import('../../models/UaipUpload');
      const { thumbnailService } = await import('../../services/thumbnailService');
      const { toObjectId } = await import('../../utils/mongooseHelpers');

      const query: any = { organizationId };
      if (id && id.length === 24) {
        query.$or = [{ _id: toObjectId(id) }, { processingId: id }];
      } else {
        query.processingId = id;
      }

      const upload = await UaipUpload.findOne(query);
      if (!upload || !upload.storageId) {
        return res.status(404).json({ success: false, message: 'Document not found' });
      }

      const { buffer, mimeType } = await thumbnailService.getOrCreateThumbnail(upload._id.toString());

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="thumb_${upload.fileName}.webp"`);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  };
}

