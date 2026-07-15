/**
 * UaipFacade.ts
 *
 * Application facade for the Universal Academic Intelligence Pipeline (UAIP).
 *
 * This class is the ONLY entry-point that modules outside the UAIP boundary
 * (e.g. Growth, Career) are permitted to use.  It hides every internal
 * detail:  GridFS, EventBus, PipelineOrchestrator, UploadService, OCR,
 * Parser, Classification, DocumentProcessingService.
 *
 * Public surface (what callers see):
 *   submitDocument(params)       → { processingId }
 *   getDocumentStatus(id)        → IDocument | null
 *   getUploadHistory(params)     → GrowthUploadHistory
 *   getProcessingStatus(params)  → GrowthProcessingStatus | null
 */

import { UploadService } from '../../services/upload-service';
import { DocumentProcessingService } from '../services/documentProcessing.service';
import { GrowthUploadService } from '../../modules/growth/growthUpload.service';

import type {
  SubmitDocumentParams,
  SubmitDocumentResult,
  UaipDocument,
  GrowthUploadHistory,
  GrowthProcessingStatus,
} from './UaipFacade.types';

export class UaipFacade {
  private readonly uploadService: UploadService;
  private readonly documentProcessingService: DocumentProcessingService;
  private readonly growthUploadService: GrowthUploadService;

  constructor(
    uploadService?: UploadService,
    documentProcessingService?: DocumentProcessingService,
    growthUploadService?: GrowthUploadService,
  ) {
    this.uploadService = uploadService ?? new UploadService();
    this.documentProcessingService =
      documentProcessingService ?? new DocumentProcessingService();
    this.growthUploadService = growthUploadService ?? new GrowthUploadService();
  }

  /**
   * Accept a raw file upload, push it into the UAIP pipeline, and return an
   * opaque processingId.  All GridFS, EventBus, and orchestration details are
   * fully encapsulated here.
   */
  async submitDocument(params: SubmitDocumentParams): Promise<SubmitDocumentResult> {
    const processingId = await this.uploadService.uploadFile({
      buffer: params.buffer,
      originalName: params.originalName,
      mimeType: params.mimeType,
      size: params.size,
      userId: params.userId,
      organizationId: params.organizationId,
    });
    return { processingId };
  }

  /**
   * Retrieve a document's processing status by its document id.
   * Delegates to the shared DocumentProcessingService without exposing it.
   */
  async getDocumentStatus(documentId: string): Promise<UaipDocument | null> {
    return this.documentProcessingService.getDocumentStatus(documentId);
  }

  /**
   * Paginated upload history for a user within an organisation.
   */
  async getUploadHistory(params: {
    userId: string;
    organizationId: string;
    limit?: number;
    cursor?: string;
  }): Promise<GrowthUploadHistory> {
    return this.growthUploadService.getUploadHistory(params);
  }

  /**
   * Detailed pipeline status for a single upload.
   */
  async getProcessingStatus(params: {
    userId: string;
    organizationId: string;
    processingId: string;
  }): Promise<GrowthProcessingStatus | null> {
    return this.growthUploadService.getProcessingStatus(params);
  }
}
