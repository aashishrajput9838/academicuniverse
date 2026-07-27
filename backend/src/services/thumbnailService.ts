import sharp from 'sharp';
import { GridFSProvider } from '../storage/GridFSProvider';
import { UaipUpload, IUaipUpload } from '../models/UaipUpload';
import logger from '../utils/logger';

export class ThumbnailService {
  private storageProvider = new GridFSProvider();

  /**
   * Retrieves or creates a persisted thumbnail for a UaipUpload document.
   * Checks if thumbnailStorageId exists; if so, loads from GridFS.
   * If missing, generates a high-quality WebP thumbnail once using Sharp,
   * stores it in GridFS, updates UaipUpload.thumbnailStorageId, and returns it.
   */
  public async getOrCreateThumbnail(uploadId: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const upload = await UaipUpload.findById(uploadId);
    if (!upload || !upload.storageId) {
      throw new Error(`Upload document or storageId not found for ID: ${uploadId}`);
    }

    // 1. If thumbnail already generated and stored in GridFS, retrieve it
    if (upload.thumbnailStorageId) {
      try {
        const thumbBuffer = await this.storageProvider.getFile(upload.thumbnailStorageId);
        if (thumbBuffer && thumbBuffer.length > 0) {
          return { buffer: thumbBuffer, mimeType: 'image/webp' };
        }
      } catch (err) {
        logger.warn(`Failed to read stored thumbnailGridFS ${upload.thumbnailStorageId}, regenerating...`, err);
      }
    }

    // 2. Fetch original document binary from GridFS
    const originalBuffer = await this.storageProvider.getFile(upload.storageId);
    let thumbBuffer: Buffer;
    const isImage = upload.mimeType && upload.mimeType.startsWith('image/');

    if (isImage) {
      // High performance Sharp WebP thumbnail generation (width 600px)
      thumbBuffer = await sharp(originalBuffer)
        .resize({ width: 600, height: 450, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    } else {
      // PDF or non-image document: create SVG styled certificate card & render to WebP
      const title = upload.fileName.replace(/\.[^/.]+$/, '');
      const svgCard = `
        <svg width="600" height="420" viewBox="0 0 600 420" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#0f172a"/>
              <stop offset="100%" stop-color="#1e293b"/>
            </linearGradient>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#f59e0b"/>
              <stop offset="100%" stop-color="#10b981"/>
            </linearGradient>
          </defs>
          <rect width="600" height="420" fill="url(#bgGrad)" rx="16"/>
          <rect x="20" y="20" width="560" height="380" fill="none" stroke="url(#goldGrad)" stroke-width="2" rx="12" opacity="0.6"/>
          
          <circle cx="300" cy="110" r="36" fill="#10b981" fill-opacity="0.15" stroke="#10b981" stroke-width="2"/>
          <path d="M300 90 L308 108 L328 108 L312 120 L318 138 L300 126 L282 138 L288 120 L272 108 L292 108 Z" fill="#10b981"/>
          
          <text x="300" y="195" font-family="Segoe UI, sans-serif" font-size="22" font-weight="bold" fill="#ffffff" text-anchor="middle">VERIFIED CERTIFICATE</text>
          <text x="300" y="235" font-family="Segoe UI, sans-serif" font-size="16" fill="#94a3b8" text-anchor="middle">${title.substring(0, 36)}</text>
          
          <rect x="210" y="270" width="180" height="32" rx="16" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-width="1"/>
          <text x="300" y="291" font-family="Segoe UI, sans-serif" font-size="13" font-weight="600" fill="#34d399" text-anchor="middle">Official Document PDF</text>

          <text x="300" y="365" font-family="Segoe UI, sans-serif" font-size="11" fill="#64748b" text-anchor="middle">Academic Universe Verified</text>
        </svg>
      `;

      thumbBuffer = await sharp(Buffer.from(svgCard))
        .webp({ quality: 90 })
        .toBuffer();
    }

    // 3. Save generated thumbnail permanently into GridFS
    try {
      const thumbFileName = `thumb_${upload.fileName}.webp`;
      const { fileId: thumbStorageId } = await this.storageProvider.store(
        thumbBuffer,
        thumbFileName,
        'image/webp',
        upload.userId,
        upload.organizationId
      );
      
      // Update MongoDB UaipUpload with stored thumbnail ID
      upload.thumbnailStorageId = thumbStorageId;
      await upload.save();
      logger.info(`Persisted new thumbnail GridFS file ${thumbStorageId} for upload ${uploadId}`);
    } catch (saveErr) {
      logger.error(`Failed to persist thumbnail to GridFS for upload ${uploadId}:`, saveErr);
    }

    return { buffer: thumbBuffer, mimeType: 'image/webp' };
  }
}

export const thumbnailService = new ThumbnailService();
