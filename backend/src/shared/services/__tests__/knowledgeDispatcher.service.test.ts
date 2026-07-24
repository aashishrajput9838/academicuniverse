import { KnowledgeDispatcher } from '../knowledgeDispatcher.service';
import { UaipEvent } from '../../../events/UaipEvents';
import { ResumeParseResult } from '../../../models/ResumeParseResult';
import { ResumeSectionDetector } from '../../../services/resume/resumeSectionDetector.service';
import { AuditEntry } from '../../../models/AuditEntry';

jest.mock('../../../events/EventBus');
jest.mock('../../../models/ResumeParseResult');
jest.mock('../../../models/AuditEntry');
jest.mock('../../../services/resume/resumeSectionDetector.service');

const mockEventBusPublish = jest.fn().mockResolvedValue(undefined);
const mockResumeParseResultFindOne = jest.fn();
const mockResumeParseResultFindOneAndUpdate = jest.fn();
const mockResumeSectionDetectorDetect = jest.fn();
const mockAuditEntryCreate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (require('../../../events/EventBus').eventBus.publish as jest.Mock) = mockEventBusPublish;
  (ResumeParseResult.findOne as jest.Mock) = mockResumeParseResultFindOne;
  (ResumeParseResult.findOneAndUpdate as jest.Mock) = mockResumeParseResultFindOneAndUpdate;
  (ResumeSectionDetector as jest.MockedClass<typeof ResumeSectionDetector>).mockImplementation(() => ({
    detect: mockResumeSectionDetectorDetect,
  } as any));
  (AuditEntry.create as jest.Mock) = mockAuditEntryCreate;
});

describe('KnowledgeDispatcher section detection', () => {
  test('invokes ResumeSectionDetector and persists results', async () => {
    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
    };
    mockResumeParseResultFindOne.mockReturnValue(mockQuery);
    mockResumeParseResultFindOneAndUpdate.mockResolvedValue({});

    mockResumeSectionDetectorDetect.mockResolvedValue({
      sections: [
        { title: 'SUMMARY', order: 0, startLine: 0, endLine: 2, rawText: 'Summary' },
        { title: 'EXPERIENCE', order: 1, startLine: 3, endLine: 5, rawText: 'Experience' },
      ],
      strategy: 'heuristic',
      aiFallbackUsed: false,
    });

    const dispatcher = new KnowledgeDispatcher();
    await (dispatcher as any).handleResumeSectionDetection({
      organizationId: 'org1',
      personId: 'person1',
      sourceDocumentId: 'proc1',
      rawConfidence: 0.9,
      data: {
        payload: {
          processingId: 'proc1',
          stage: 'section_detection',
          rawContent: 'Summary\nExperience',
          mimeType: 'application/pdf',
        },
      },
      correlationId: 'corr1',
    });

    expect(mockResumeSectionDetectorDetect).toHaveBeenCalledWith({
      rawText: 'Summary\nExperience',
      mimeType: 'application/pdf',
    });

    expect(mockResumeParseResultFindOneAndUpdate).toHaveBeenCalledWith(
      { processingId: 'proc1' },
      expect.objectContaining({
        $set: expect.objectContaining({
          sectionsDetected: 2,
          sectionDetectionStrategy: 'heuristic',
          aiProviderUsed: 'none',
          failedOver: false,
          rawCandidateFields: expect.objectContaining({
            sections: expect.arrayContaining([
              expect.objectContaining({ title: 'SUMMARY' }),
              expect.objectContaining({ title: 'EXPERIENCE' }),
            ]),
          }),
        }),
      }),
      { upsert: false }
    );

    expect(mockEventBusPublish).toHaveBeenCalledWith(
      UaipEvent.ResumeSectionDetected,
      expect.objectContaining({
        processingId: 'proc1',
        sectionsDetected: 2,
        strategy: 'heuristic',
        correlationId: 'corr1',
      })
    );
  });

  test('publishes ResumeSectionDetectionFailed when no sections detected', async () => {
    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
    };
    mockResumeParseResultFindOne.mockReturnValue(mockQuery);
    mockResumeParseResultFindOneAndUpdate.mockResolvedValue({});

    mockResumeSectionDetectorDetect.mockResolvedValue({
      sections: [],
      strategy: 'heuristic',
      aiFallbackUsed: false,
    });

    const dispatcher = new KnowledgeDispatcher();
    await (dispatcher as any).handleResumeSectionDetection({
      organizationId: 'org1',
      personId: 'person1',
      sourceDocumentId: 'proc1',
      rawConfidence: 0.9,
      data: {
        payload: {
          processingId: 'proc1',
          stage: 'section_detection',
          rawContent: 'random text',
          mimeType: 'text/plain',
        },
      },
      correlationId: 'corr1',
    });

    expect(mockEventBusPublish).toHaveBeenCalledWith(
      UaipEvent.ResumeSectionDetectionFailed,
      expect.objectContaining({
        processingId: 'proc1',
        reason: 'No sections detected',
        strategy: 'heuristic',
        correlationId: 'corr1',
      })
    );
  });

  test('skips processing if sections already detected', async () => {
    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({ sectionsDetected: 2 }),
    };
    mockResumeParseResultFindOne.mockReturnValue(mockQuery);

    const dispatcher = new KnowledgeDispatcher();
    await (dispatcher as any).handleResumeSectionDetection({
      organizationId: 'org1',
      personId: 'person1',
      sourceDocumentId: 'proc1',
      rawConfidence: 0.9,
      data: {
        payload: {
          processingId: 'proc1',
          stage: 'section_detection',
          rawContent: 'Summary',
          mimeType: 'application/pdf',
        },
      },
    });

    expect(mockResumeSectionDetectorDetect).not.toHaveBeenCalled();
    expect(mockEventBusPublish).not.toHaveBeenCalled();
  });

  test('publishes ResumeSectionDetectionFailed on detector error', async () => {
    const mockQuery = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
    };
    mockResumeParseResultFindOne.mockReturnValue(mockQuery);

    mockResumeSectionDetectorDetect.mockRejectedValue(new Error('Detector error'));

    const dispatcher = new KnowledgeDispatcher();
    await expect(
      (dispatcher as any).handleResumeSectionDetection({
        organizationId: 'org1',
        personId: 'person1',
        sourceDocumentId: 'proc1',
        rawConfidence: 0.9,
        data: {
          payload: {
            processingId: 'proc1',
            stage: 'section_detection',
            rawContent: 'Summary',
            mimeType: 'application/pdf',
          },
        },
      })
    ).rejects.toThrow('Detector error');

    expect(mockEventBusPublish).toHaveBeenCalledWith(
      UaipEvent.ResumeSectionDetectionFailed,
      expect.objectContaining({
        processingId: 'proc1',
        errorMessage: 'Detector error',
      })
    );
  });
});
