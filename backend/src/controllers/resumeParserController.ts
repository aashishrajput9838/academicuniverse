import { Request, Response, NextFunction } from 'express';
import { sendResponse, sendError } from '../utils/response';
import { StorageService } from '../services/storageService';
import { UaipUpload } from '../models/UaipUpload';
import { ResumeParseResult } from '../models/ResumeParseResult';
import { ResumePersonSuggestion } from '../models/ResumePersonSuggestion';
import { KnowledgeJobRepository } from '../shared/repositories/knowledgeJob.repository';
import { Logger } from '../utils/logger';
import * as crypto from 'crypto';

const logger = new Logger('resumeParserController');
const storageService = new StorageService();
const knowledgeJobRepo = new KnowledgeJobRepository();

/**
 * Validate PDF magic bytes.
 */
export function isPdfMagic(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.slice(0, 4).toString('ascii') === '%PDF';
}

/**
 * Validate DOCX magic bytes (ZIP header with [Content_Types].xml).
 */
export async function isDocxMagic(buffer: Buffer): Promise<boolean> {
  if (buffer.length < 4 || buffer.slice(0, 2).toString('ascii') !== 'PK') {
    return false;
  }
  const text = buffer.toString('utf8', 0, Math.min(buffer.length, 65536));
  return text.includes('[Content_Types].xml');
}

/**
 * Compute SHA-256 hex digest of a buffer.
 */
function computeSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export class ResumeParserController {
  /**
   * POST /api/resume/parse-upload
   * Upload a resume for parsing. Returns immediately with processingId.
   * Sprint 1: validation, storage, enqueue only. No actual parsing.
   */
  public parseUpload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const file = req.file;
      if (!file) {
        return sendError(res, 400, 'No file provided. Upload a PDF or DOCX resume.');
      }

      const organizationId = (req as any).organizationId;
      const userId = (req as any).user?.userId;

      if (!organizationId) {
        return sendError(res, 403, 'Organization context is required');
      }
      if (!userId) {
        return sendError(res, 401, 'Authentication required');
      }

      const buffer = file.buffer;
      const mimeType = file.mimetype;
      const originalName = file.originalname;
      const size = file.size;

      // ---- MIME type validation ----
      const acceptedMimes = new Set([
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ]);

      const isDocxByName = typeof originalName === 'string' && originalName.toLowerCase().endsWith('.docx');
      if (!acceptedMimes.has(mimeType) && !isDocxByName) {
        return sendError(res, 400, 'Invalid file type. Only PDF and DOCX are supported.');
      }

      // ---- Magic-byte validation ----
      const isPdf = mimeType === 'application/pdf' || (typeof originalName === 'string' && originalName.toLowerCase().endsWith('.pdf'));
      const isDocx = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || isDocxByName;

      if (isPdf) {
        if (!isPdfMagic(buffer)) {
          logger.warn('Invalid PDF magic bytes', { fileName: originalName, userId, organizationId });
          return sendError(res, 400, 'Unsupported file format. Expected a valid PDF.');
        }
      } else if (isDocx) {
        const validDocx = await isDocxMagic(buffer);
        if (!validDocx) {
          logger.warn('Invalid DOCX magic bytes', { fileName: originalName, userId, organizationId });
          return sendError(res, 400, 'Unsupported file format. Expected a valid DOCX file.');
        }
        if (buffer.length > 50 * 1024 * 1024) {
          logger.warn('DOCX file exceeds safe unzipped size threshold', { fileName: originalName, size: buffer.length, userId, organizationId });
          return sendError(res, 413, 'DOCX file too large. Unzipped size may exceed 50MB limit.');
        }
      } else {
        return sendError(res, 400, 'Invalid file type. Only PDF and DOCX are supported.');
      }

      // ---- SHA-256 hash and duplicate check ----
      const fileHash = computeSha256(buffer);
      const existingUpload = await UaipUpload.findOne({
        organizationId,
        fileHash,
        status: { $ne: 'DELETED' },
      });

      if (existingUpload) {
        logger.info('Duplicate resume upload detected', { fileHash, existingProcessingId: existingUpload.processingId });
        return sendError(res, 409, 'Duplicate upload', { existingProcessingId: existingUpload.processingId });
      }

      // ---- Generate processingId ----
      const processingId = crypto.randomUUID();

      // ---- Upload file to storage ----
      let fileUrl: string;
      try {
        fileUrl = await storageService.uploadResumeFile(buffer, originalName, organizationId);
      } catch (storageError: any) {
        logger.error('Resume storage upload failed', storageError);
        return sendError(res, 500, 'Failed to store resume file. Please try again.');
      }

      // ---- Persist UaipUpload (atomic duplicate guard via unique index) ----
      const uploadDoc = new UaipUpload({
        processingId,
        organizationId,
        userId,
        fileName: originalName,
        mimeType,
        size,
        status: 'PROCESSING',
        fileHash,
        storageId: fileUrl,
        createdAt: new Date(),
      });

      let uploadSaved = false;
      try {
        await uploadDoc.save();
        uploadSaved = true;
      } catch (saveError: any) {
        if (saveError.code === 11000) {
          const duplicate = await UaipUpload.findOne({ organizationId, fileHash, status: { $ne: 'DELETED' } });
          if (duplicate) {
            logger.info('Duplicate resume upload detected (atomic)', { fileHash, existingProcessingId: duplicate.processingId });
            return sendError(res, 409, 'Duplicate upload', { existingProcessingId: duplicate.processingId });
          }
        }
        throw saveError;
      }

      // ---- Create initial ResumeParseResult ----
      const resumeParseResult = new ResumeParseResult({
        processingId,
        organizationId,
        userId,
        documentCategory: 'RESUME',
        confidenceScore: 0,
        sectionsDetected: 0,
        entitiesExtracted: 0,
        normalizedSkills: 0,
        sectionDetectionStrategy: 'heuristic',
        entityExtractionStrategy: 'regex',
        aiProviderUsed: 'none',
        failedOver: false,
        primaryTargetModule: '',
        secondaryTargetModules: [],
        reviewStatus: 'PENDING_REVIEW',
        extractionIssues: [],
        rawCandidateFields: {},
      });
      await resumeParseResult.save();

      // ---- Create initial ResumePersonSuggestion (pending match) ----
      const resumePersonSuggestion = new ResumePersonSuggestion({
        processingId,
        organizationId,
        matchConfidence: 0,
        matchBasis: [],
        isNewPerson: true,
        status: 'PENDING',
      });
      await resumePersonSuggestion.save();

      // ---- Enqueue resume parse job via KnowledgeJobRepository (Sprint 2 migration) ----
      try {
        await knowledgeJobRepo.create({
          personId: userId,
          sourceDocumentId: processingId,
          domain: 'resume',
          payload: {
            storageId: fileUrl,
            fileName: originalName,
            mimeType,
            size,
            fileHash,
          },
          maxRetries: 3,
        });
      } catch (queueError: any) {
        logger.error('Failed to enqueue resume job', queueError);
        // Non-blocking: file is stored and metadata persisted. Queue can be retried.
      }

      return sendResponse(res, 201, {
        processingId,
        fileName: originalName,
        mimeType,
        size,
        status: 'PROCESSING',
        estimatedCompletionMs: 5000,
        resumeParseResultId: resumeParseResult._id,
      }, 'Resume upload accepted. Parsing will begin shortly.');
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/resume/parse-status/:processingId
   * Return current parsing status for a resume.
   */
  public getParseStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = (req as any).organizationId;
      const userId = (req as any).user?.userId;
      const { processingId } = req.params;

      if (!organizationId) {
        return sendError(res, 403, 'Organization context is required');
      }
      if (!userId) {
        return sendError(res, 401, 'Authentication required');
      }
      if (!processingId) {
        return sendError(res, 400, 'processingId is required');
      }

      const result = await ResumeParseResult.findOne({ processingId, organizationId }).lean().exec();
      if (!result) {
        return sendError(res, 404, 'Resume not found or still being processed.');
      }

      // Verify ownership
      if (result.userId.toString() !== userId) {
        return sendError(res, 403, 'Access denied');
      }

      const reviewStatus = result.reviewStatus;
      const statusMap: Record<string, 'SUCCESS' | 'FAILED' | 'PENDING'> = {
        'AUTO_APPROVED': 'SUCCESS',
        'APPROVED': 'SUCCESS',
        'PENDING_REVIEW': 'PENDING',
        'NEEDS_REINDEX': 'FAILED',
        'REJECTED': 'FAILED',
      };
      const apiStatus = statusMap[reviewStatus] ?? 'PENDING';

      return sendResponse(res, 200, {
        processingId: result.processingId,
        status: apiStatus,
        confidenceScore: result.confidenceScore,
        reviewStatus: result.reviewStatus,
        sectionCount: result.sectionsDetected,
        entityCount: result.entitiesExtracted,
        primaryModule: result.primaryTargetModule,
        completedAt: result.updatedAt,
      }, 'Resume status retrieved successfully');
    } catch (err) {
      next(err);
    }
  };
}
