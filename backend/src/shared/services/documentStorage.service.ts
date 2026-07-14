import { UploadDocumentDTO, ProcessedDocumentDTO, DocumentStatus } from '../document/document.types';
import { DocumentRepository } from '../repositories/document.repository';
import { IDocument } from '../../models/Document';
import { Logger } from '../../utils/logger';

const logger = new Logger('DocumentStorageService');

export class DocumentStorageService {
  private repo = new DocumentRepository();

  /**
   * Persists the raw file and metadata, returns the created document ID.
   */
  async saveDocument(dto: UploadDocumentDTO): Promise<IDocument> {
    const { file, organizationId, userId } = dto;
    const doc = await this.repo.create({
      organizationId,
      userId,
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      fileData: file.buffer,
      status: 'PENDING',
    });
    logger.info('Document saved', { documentId: doc._id, fileName: file.originalname });
    return doc;
  }

  /**
   * Retrieves the full document (including fileData) for processing.
   */
  async getDocumentWithData(id: string): Promise<IDocument | null> {
    return this.repo.findById(id).then(doc => {
      if (!doc) return null;
      // Ensure fileData is selected (it is excluded by default)
      return doc;
    });
  }
}
