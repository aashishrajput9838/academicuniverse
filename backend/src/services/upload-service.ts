import { v4 as uuidv4 } from 'uuid';
import { GridFSProvider } from '../storage/GridFSProvider';
import { UaipUpload } from '../models/UaipUpload';
import { eventBus } from '../events/EventBus';
import { UaipEvent } from '../events/UaipEvents';
import './pipeline-orchestrator';
// import { Types } from 'mongoose'; // not needed

// Supported MIME types for UAIP uploads (MVP)
const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'image/png',
  'image/jpeg',
]);

/**
 * UploadService – orchestrates the first‑stage of the Universal Academic Intelligence Pipeline.
 * Responsibilities (MVP only):
 *   • Validate authentication / organization context (caller must provide userId & organizationId).
 *   • Validate file size against UAIP_MAX_FILE_SIZE_MB (default 50 MB).
 *   • Validate MIME type against the supported list.
 *   • Generate a unique processingId.
 *   • Store the original file via the StorageProvider abstraction (GridFS implementation).
 *   • Persist an UaipUpload metadata document.
 *   • Emit a processing event for downstream pipeline stages (TODO hook).
 */
export class UploadService {
  private storageProvider = new GridFSProvider();

  /**
   * Handles a raw file upload.
   * @param params - upload parameters
   * @returns processingId – identifier for the rest of the pipeline.
   */
  async uploadFile(params: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    size: number; // bytes
    userId: string;
    organizationId: string;
  }): Promise<string> {
    const { buffer, originalName, mimeType, size, userId, organizationId } = params;

    // ---- Authentication & organization validation ----
    if (!userId) {
      throw new Error('Authenticated userId is required');
    }
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    // ---- File size validation (default 50 MB) ----
    const maxSizeMb = Number(process.env.UAIP_MAX_FILE_SIZE_MB || 50);
    const maxSizeBytes = maxSizeMb * 1024 * 1024;
    if (size > maxSizeBytes) {
      throw new Error(`File size exceeds maximum of ${maxSizeMb} MB`);
    }

    // ---- MIME type validation ----
    if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    // ---- Generate processingId ----
    const processingId = uuidv4();

    // ---- Store file via StorageProvider ----
    const { fileId } = await this.storageProvider.store(
      buffer,
      originalName,
      mimeType,
      userId,
      organizationId,
    );

    // ---- Persist upload metadata ----
    const uploadDoc = new UaipUpload({
      processingId,
      organizationId, // Mongoose will cast string to ObjectId
      userId, // Mongoose will cast string to ObjectId
      fileName: originalName,
      mimeType,
      size,
      status: 'PENDING',
      createdAt: new Date(),
    });
    await uploadDoc.save();

    // ---- Emit event for downstream processing ----
    await eventBus.publish(UaipEvent.Uploaded, {
      processingId,
      storageId: fileId,
      userId,
      organizationId,
      mimeType,
      fileName: originalName,
      fileSize: size,
      timestamp: new Date(),
    });

    return processingId;
  }
}
