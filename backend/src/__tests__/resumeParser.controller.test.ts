import { Request, Response } from 'express';
import { ResumeParserController } from '../controllers/resumeParserController';
import { ResumeParseResult } from '../models/ResumeParseResult';
import { ResumePersonSuggestion } from '../models/ResumePersonSuggestion';
import { UaipUpload } from '../models/UaipUpload';
import { resumeQueueService } from '../shared/services/resumeQueue.service';
import { StorageService } from '../services/storageService';

jest.mock('../models/ResumeParseResult');
jest.mock('../models/ResumePersonSuggestion');
jest.mock('../models/UaipUpload');
jest.mock('../shared/services/resumeQueue.service');
jest.mock('../services/storageService');

const mockSendResponse = jest.fn();
const mockSendError = jest.fn();

jest.mock('../utils/response', () => ({
  sendResponse: (...args: any[]) => mockSendResponse(...args),
  sendError: (...args: any[]) => mockSendError(...args),
}));

describe('Sprint 1: Resume Parser Foundation', () => {
  let controller: ResumeParserController;
  const mockStorageService = StorageService as jest.MockedClass<typeof StorageService>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ResumeParserController();
    mockStorageService.prototype.uploadResumeFile = jest.fn().mockResolvedValue('https://cloudinary.com/resume/test.pdf');
  });

  describe('ResumeParseResult model', () => {
    it('should create a ResumeParseResult with required fields', () => {
      const mockResult = {
        _id: 'result123',
        processingId: 'proc123',
        organizationId: 'org123',
        userId: 'user123',
        documentCategory: 'RESUME',
        confidenceScore: 0,
        reviewStatus: 'NEEDS_REINDEX',
        sectionsDetected: 0,
        entitiesExtracted: 0,
        normalizedSkills: 0,
        sectionDetectionStrategy: 'heuristic',
        entityExtractionStrategy: 'regex',
        aiProviderUsed: 'none',
        failedOver: false,
        primaryTargetModule: '',
        secondaryTargetModules: [],
        extractionIssues: [],
        rawCandidateFields: {},
        save: jest.fn().mockResolvedValue({}),
      };

      (ResumeParseResult as any).mockImplementation(() => mockResult);

      const result = new ResumeParseResult({
        processingId: 'proc123',
        organizationId: 'org123' as any,
        userId: 'user123' as any,
        documentCategory: 'RESUME',
        confidenceScore: 0,
        reviewStatus: 'NEEDS_REINDEX',
        sectionsDetected: 0,
        entitiesExtracted: 0,
        normalizedSkills: 0,
        sectionDetectionStrategy: 'heuristic',
        entityExtractionStrategy: 'regex',
        aiProviderUsed: 'none',
        failedOver: false,
        primaryTargetModule: '',
        secondaryTargetModules: [],
        extractionIssues: [],
        rawCandidateFields: {},
      });

      expect(result.processingId).toBe('proc123');
      expect(result.documentCategory).toBe('RESUME');
      expect(result.reviewStatus).toBe('NEEDS_REINDEX');
    });
  });

  describe('ResumePersonSuggestion model', () => {
    it('should create a ResumePersonSuggestion with pending status', () => {
      const mockSuggestion = {
        _id: 'sugg123',
        processingId: 'proc123',
        organizationId: 'org123',
        matchConfidence: 0,
        matchBasis: [],
        isNewPerson: true,
        status: 'PENDING',
        save: jest.fn().mockResolvedValue({}),
      };

      (ResumePersonSuggestion as any).mockImplementation(() => mockSuggestion);

      const suggestion = new ResumePersonSuggestion({
        processingId: 'proc123',
        organizationId: 'org123' as any,
        matchConfidence: 0,
        matchBasis: [],
        isNewPerson: true,
        status: 'PENDING',
      });

      expect(suggestion.processingId).toBe('proc123');
      expect(suggestion.status).toBe('PENDING');
      expect(suggestion.isNewPerson).toBe(true);
    });
  });

  describe('ResumeParserController.parseUpload', () => {
    it('should return 400 when no file is provided', async () => {
      const req = { file: undefined, organizationId: 'org1', user: { userId: 'user1' } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      await controller.parseUpload(req, res, next);
      expect(mockSendError).toHaveBeenCalledWith(res, 400, 'No file provided. Upload a PDF or DOCX resume.');
    });

    it('should return 400 for unsupported MIME type', async () => {
      const req = {
        file: { buffer: Buffer.from('test'), mimetype: 'text/plain', originalname: 'resume.txt', size: 100 },
        organizationId: 'org1',
        user: { userId: 'user1' },
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      await controller.parseUpload(req, res, next);
      expect(mockSendError).toHaveBeenCalledWith(res, 400, 'Invalid file type. Only PDF and DOCX are supported.');
    });

    it('should return 400 for invalid PDF magic bytes', async () => {
      const req = {
        file: { buffer: Buffer.from('NOTAPDF'), mimetype: 'application/pdf', originalname: 'resume.pdf', size: 100 },
        organizationId: 'org1',
        user: { userId: 'user1' },
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      await controller.parseUpload(req, res, next);
      expect(mockSendError).toHaveBeenCalledWith(res, 400, 'Unsupported file format. Expected a valid PDF.');
    });

    it('should return 400 for invalid DOCX magic bytes', async () => {
      const req = {
        file: { buffer: Buffer.from('NOTADOCX'), mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', originalname: 'resume.docx', size: 100 },
        organizationId: 'org1',
        user: { userId: 'user1' },
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      await controller.parseUpload(req, res, next);
      expect(mockSendError).toHaveBeenCalledWith(res, 400, 'Unsupported file format. Expected a valid DOCX file.');
    });

    it('should return 201 for a valid PDF upload with correct response shape', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n');
      const req = {
        file: { buffer: pdfBuffer, mimetype: 'application/pdf', originalname: 'resume.pdf', size: 1024 },
        organizationId: 'org1',
        user: { userId: 'user1' },
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      const mockSave = jest.fn().mockResolvedValue({ _id: 'doc123' });
      const mockResumeParseResult = { _id: 'result123', save: mockSave };
      const mockResumePersonSuggestion = { _id: 'sugg123', save: mockSave };
      const mockUaipUpload = { _id: 'upload123', save: mockSave };

      (ResumeParseResult as any).mockImplementation(() => mockResumeParseResult);
      (ResumePersonSuggestion as any).mockImplementation(() => mockResumePersonSuggestion);
      (UaipUpload as any).mockImplementation(() => mockUaipUpload);

      await controller.parseUpload(req, res, next);

      expect(mockSendResponse).toHaveBeenCalledWith(
        res,
        201,
        expect.objectContaining({
          processingId: expect.any(String),
          fileName: 'resume.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          status: 'PROCESSING',
          estimatedCompletionMs: 5000,
          resumeParseResultId: 'result123',
        }),
        'Resume upload accepted. Parsing will begin shortly.'
      );
    });

    it('should return 409 when atomic save detects duplicate (E11000)', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n');
      const req = {
        file: { buffer: pdfBuffer, mimetype: 'application/pdf', originalname: 'resume.pdf', size: 1024 },
        organizationId: 'org1',
        user: { userId: 'user1' },
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      const duplicateUpload = {
        processingId: 'existing_proc',
        organizationId: 'org1',
        fileHash: 'hash123',
        status: 'PENDING',
      };

      (UaipUpload as any).mockImplementation(() => ({
        save: jest.fn().mockRejectedValue({ code: 11000 }),
      }));

      (UaipUpload.findOne as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce(duplicateUpload);

      await controller.parseUpload(req, res, next);

      expect(mockSendError).toHaveBeenCalledWith(
        res,
        409,
        'Duplicate upload',
        { existingProcessingId: 'existing_proc' }
      );
    });
  });

  describe('ResumeParserController.getParseStatus', () => {
    it('should return 400 when processingId is missing', async () => {
      const req = { params: {}, organizationId: 'org1', user: { userId: 'user1' } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      await controller.getParseStatus(req, res, next);
      expect(mockSendError).toHaveBeenCalledWith(res, 400, 'processingId is required');
    });

    it('should return 404 when ResumeParseResult not found', async () => {
      const mockQuery = {
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };
      (ResumeParseResult.findOne as jest.Mock).mockReturnValue(mockQuery);

      const req = { params: { processingId: 'proc123' }, organizationId: 'org1', user: { userId: 'user1' } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      await controller.getParseStatus(req, res, next);
      expect(mockSendError).toHaveBeenCalledWith(res, 404, 'Resume not found or still being processed.');
    });
  });

  describe('Magic-byte validation logic', () => {
    it('should identify valid PDF magic bytes', () => {
      const pdfBuffer = Buffer.from('%PDF-');
      const isPdf = pdfBuffer.length >= 4 && pdfBuffer.slice(0, 4).toString('ascii') === '%PDF';
      expect(isPdf).toBe(true);
    });

    it('should identify invalid PDF magic bytes', () => {
      const invalidBuffer = Buffer.from('NOTAPDF');
      const isPdf = invalidBuffer.length >= 4 && invalidBuffer.slice(0, 4).toString('ascii') === '%PDF';
      expect(isPdf).toBe(false);
    });

    it('should identify valid DOCX magic bytes', async () => {
      const docxBuffer = Buffer.from('PK\x03\x04[Content_Types].xml</Types>');
      const validDocx = docxBuffer.slice(0, 2).toString('ascii') === 'PK' && docxBuffer.includes(Buffer.from('[Content_Types].xml'));
      expect(validDocx).toBe(true);
    });

    it('should identify invalid DOCX magic bytes', async () => {
      const invalidBuffer = Buffer.from('NOTADOCX');
      const validDocx = invalidBuffer.slice(0, 2).toString('ascii') === 'PK' && invalidBuffer.includes(Buffer.from('[Content_Types].xml'));
      expect(validDocx).toBe(false);
    });
  });

  describe('SHA-256 hashing', () => {
    it('should produce a consistent SHA-256 hash for a given buffer', () => {
      const buffer = Buffer.from('test content');
      const hash = require('crypto').createHash('sha256').update(buffer).digest('hex');
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });
  });

  describe('ResumeQueueService integration', () => {
    it('should enqueue a resume job', async () => {
      await resumeQueueService.enqueue({
        processingId: 'proc123',
        organizationId: 'org123',
        userId: 'user123',
        storageId: 'storage123',
        fileName: 'resume.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        fileHash: 'abc123',
      });

      expect(resumeQueueService.enqueue).toHaveBeenCalledWith({
        processingId: 'proc123',
        organizationId: 'org123',
        userId: 'user123',
        storageId: 'storage123',
        fileName: 'resume.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        fileHash: 'abc123',
      });
    });
  });

  describe('Duplicate hash detection', () => {
    it('should detect duplicate uploads within organization via fast path', async () => {
      const existingUpload = {
        processingId: 'existing_proc',
        organizationId: 'org1',
        fileHash: 'hash123',
        status: 'PENDING',
      };

      (UaipUpload.findOne as jest.Mock).mockResolvedValue(existingUpload);

      const pdfBuffer = Buffer.from('%PDF-1.4\n');
      const req = {
        file: { buffer: pdfBuffer, mimetype: 'application/pdf', originalname: 'resume.pdf', size: 100 },
        organizationId: 'org1',
        user: { userId: 'user1' },
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      await controller.parseUpload(req, res, next);
      expect(mockSendError).toHaveBeenCalledWith(
        res,
        409,
        'Duplicate upload',
        { existingProcessingId: 'existing_proc' }
      );
    });

    it('should detect duplicate uploads via atomic save (E11000)', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n');
      const req = {
        file: { buffer: pdfBuffer, mimetype: 'application/pdf', originalname: 'resume.pdf', size: 1024 },
        organizationId: 'org1',
        user: { userId: 'user1' },
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
      const next = jest.fn();

      const duplicateUpload = {
        processingId: 'existing_proc',
        organizationId: 'org1',
        fileHash: 'hash123',
        status: 'PENDING',
      };

      (UaipUpload.findOne as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(duplicateUpload);

      (UaipUpload as any).mockImplementation(() => ({
        save: jest.fn().mockRejectedValue({ code: 11000 }),
      }));

      await controller.parseUpload(req, res, next);

      expect(mockSendError).toHaveBeenCalledWith(
        res,
        409,
        'Duplicate upload',
        { existingProcessingId: 'existing_proc' }
      );
    });
  });
});
