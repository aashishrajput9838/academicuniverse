import { Request, Response, NextFunction } from 'express';
import { DocumentRegistryRepository } from '../../shared/repositories/documentRegistry.repository';

export class DocumentRegistryController {
  private repo = new DocumentRegistryRepository();

  /** GET /api/document-registry */
  public getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).organizationId;
      const userId = (req as any).user?.userId;
      const entries = await this.repo.list(organizationId, userId);
      return res.json({ status: 'success', data: entries });
    } catch (err) {
      next(err);
    }
  };
}
