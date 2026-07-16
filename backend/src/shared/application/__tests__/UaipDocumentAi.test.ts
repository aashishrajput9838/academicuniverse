import mongoose from 'mongoose';
import { UaipDocumentAiService } from '../UaipDocumentAi.service';
import { KnowledgeRecordModel } from '../../../models/KnowledgeRecord';
import { aiProvider } from '../../../core/ai';

// Mock the AI provider
jest.mock('../../../core/ai', () => {
  return {
    aiProvider: {
      generateJSON: jest.fn(),
      generateContent: jest.fn(),
      isAvailable: () => true,
      getProviderName: () => 'Mock AI Provider',
    },
  };
});

describe('UaipDocumentAiService', () => {
  let aiService: UaipDocumentAiService;
  const mockProcessingId = 'test-processing-id-123';

  beforeAll(async () => {
    // Connect to in-memory db or test db
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    aiService = new UaipDocumentAiService();
    // Clean up test records
    await KnowledgeRecordModel.deleteMany({ processingId: mockProcessingId });
  });

  it('should successfully run Stage 2 AI analysis and save candidate data', async () => {
    // 1️⃣ Seed initial Stage 1 KnowledgeRecord
    await KnowledgeRecordModel.create({
      processingId: mockProcessingId,
      documentCategory: 'UNKNOWN',
      language: 'en',
      isScanned: false,
      parserStrategy: 'EXCEL_PARSER',
      confidenceScore: 0.9,
      rawContent: 'Sample Excel timetable content data',
    });

    const mockAiResponse = {
      documentCategory: 'ACADEMIC_TIMETABLE',
      confidenceScore: 0.95,
      summary: 'Weekly class schedule showing CSE lectures',
      extractedEntities: {
        semester: 'Fall 2026',
        course: 'CSE062',
      },
      suggestedModule: 'None',
      candidateFields: {
        classes: [
          { day: 'Wed', time: '10:50 - 11:40', subject: 'Mobile Computing' }
        ]
      }
    };

    (aiProvider.generateJSON as jest.Mock).mockResolvedValue(mockAiResponse);

    const result = await aiService.processDocument({
      processingId: mockProcessingId,
      fileName: 'download.xls',
      mimeType: 'application/vnd.ms-excel',
      fileSize: 6453,
    });

    expect(result.documentCategory).toBe('ACADEMIC_TIMETABLE');
    expect(result.confidenceScore).toBe(0.95);
    expect(result.suggestedModule).toBe('None');

    // 2️⃣ Verify the KnowledgeRecord was updated in MongoDB
    const updatedRecord = await KnowledgeRecordModel.findOne({ processingId: mockProcessingId });
    expect(updatedRecord).toBeTruthy();
    expect(updatedRecord!.documentCategory).toBe('ACADEMIC_TIMETABLE');
    expect(updatedRecord!.summary).toBe('Weekly class schedule showing CSE lectures');
    expect(updatedRecord!.candidateFields).toEqual(mockAiResponse.candidateFields);
    expect(updatedRecord!.reviewStatus).toBe('PENDING_REVIEW');
  });

  it('should throw and fallback gracefully on invalid AI response format', async () => {
    await KnowledgeRecordModel.create({
      processingId: mockProcessingId,
      documentCategory: 'UNKNOWN',
      language: 'en',
      isScanned: false,
      parserStrategy: 'PDF_PARSER',
      confidenceScore: 0.5,
      rawContent: 'Scanned transcript text',
    });

    // Mock malformed response
    const badAiResponse = {
      documentCategory: 'INVALID_CATEGORY_NAME',
      confidenceScore: 1.5, // invalid confidence
    };

    (aiProvider.generateJSON as jest.Mock).mockResolvedValue(badAiResponse);

    await expect(
      aiService.processDocument({
        processingId: mockProcessingId,
        fileName: 'grades.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
      })
    ).rejects.toThrow();

    // Verify record review status is still handled
    const failedRecord = await KnowledgeRecordModel.findOne({ processingId: mockProcessingId });
    expect(failedRecord).toBeTruthy();
    expect(failedRecord!.documentCategory).toBe('UNKNOWN'); // remains UNKNOWN
  });

  it('should throw on MARKSHEET with empty subjects array (extraction failure)', async () => {
    await KnowledgeRecordModel.create({
      processingId: mockProcessingId,
      documentCategory: 'UNKNOWN',
      language: 'en',
      isScanned: false,
      parserStrategy: 'PDF_PARSER',
      confidenceScore: 0.5,
      rawContent: 'Scanned marksheet image with no extractable table',
    });

    const badMarksheetResponse = {
      documentCategory: 'MARKSHEET',
      confidenceScore: 0.9,
      summary: 'Marksheet document',
      extractedEntities: { semester: '1' },
      suggestedModule: 'None',
      candidateFields: {
        subjects: [],
        gpa: 0,
      },
    };

    (aiProvider.generateJSON as jest.Mock).mockResolvedValue(badMarksheetResponse);

    await expect(
      aiService.processDocument({
        processingId: mockProcessingId,
        fileName: 'sem1_marks.pdf',
        mimeType: 'application/pdf',
        fileSize: 2048,
      })
    ).rejects.toThrow(/subjects array is empty or missing/);

    const failedRecord = await KnowledgeRecordModel.findOne({ processingId: mockProcessingId });
    expect(failedRecord).toBeTruthy();
    expect(failedRecord!.reviewStatus).toBe('PENDING_REVIEW');
  });

  it('regression: should correctly parse download.xls HTML-based Excel timetable and extract content keywords', async () => {
    const fs = require('fs');
    const path = require('path');
    const { ExcelParser } = require('../../../services/parsing/ExcelParser');

    const filePath = path.resolve(__dirname, '../../..', 'input data', 'download.xls');
    expect(fs.existsSync(filePath)).toBe(true);

    const parser = new ExcelParser();
    const buffer = fs.readFileSync(filePath);
    const parsedText = await parser.parse(buffer);

    expect(parsedText).toBeTruthy();
    // HTML spreadsheet parsed text must contain schedule hours, courses and instructions
    expect(parsedText).toContain('09:00:00 - 09:50:00');
    expect(parsedText).toContain('CSE062');
    expect(parsedText).toContain('Machine Learning');
  });
});
