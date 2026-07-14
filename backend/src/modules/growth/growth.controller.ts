import { Request, Response, NextFunction } from 'express';
import { DocumentProcessingService } from '../../shared/services/documentProcessing.service';
import { UploadDocumentDTO } from '../../shared/document/document.types';

export class GrowthController {
  constructor(private readonly documentProcessingService: DocumentProcessingService) {}

  /**
   * POST /documents – universal upload endpoint.
   */
  public handleUpload = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ status: 'error', message: 'No file provided' });
      }
      const organizationId = (req as any).organizationId; // set by auth middleware
      const userId = (req as any).userId;
      const dto: UploadDocumentDTO = { file, organizationId, userId };
      const result = await this.documentProcessingService.handleUpload(dto);
      return res.status(202).json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /documents/:id – retrieve processing status and result.
   */
  public getDocumentStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;
      const doc = await this.documentProcessingService.getDocumentStatus(id);
      if (!doc) {
        return res.status(404).json({ status: 'error', message: 'Document not found' });
      }
      return res.json({ status: 'success', data: doc });
    } catch (err) {
      next(err);
    }
  };
}
