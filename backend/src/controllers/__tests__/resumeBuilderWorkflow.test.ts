import mongoose from 'mongoose';
import {
  uploadTemplateController,
  processTemplateController,
  getAvailableTemplatesController,
} from '../resumeController';
import { TemplateProcessingOrchestrator } from '../../services/templateProcessingOrchestrator.service';
import storageService from '../../services/storageService';

jest.mock('../../services/templateProcessingOrchestrator.service');
jest.mock('../../services/storageService');
jest.mock('../../models/ResumeTemplate', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  find: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    populate: jest.fn().mockResolvedValue([]),
  })),
  deleteMany: jest.fn(),
}));
jest.mock('../../models/Role', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
}));
jest.mock('../../models/EzoneAcademicProfile', () => ({
  findOne: jest.fn(),
}));
jest.mock('axios');

const MockedOrchestrator = TemplateProcessingOrchestrator as jest.MockedClass<typeof TemplateProcessingOrchestrator>;
const mockedStorage = storageService as jest.MockedClass<typeof storageService>;
const mockedAxios = require('axios') as jest.MockedClass<any>;
const MockedResumeTemplate = require('../../models/ResumeTemplate') as any;
const MockedRole = require('../../models/Role') as any;
const MockedEzoneAcademicProfile = require('../../models/EzoneAcademicProfile') as any;

const VALID_ORG_ID = '507f1f77bcf86cd799439011';
const VALID_USER_ID = '507f1f77bcf86cd799439012';
const VALID_TEMPLATE_ID = '507f1f77bcf86cd799439013';

const MOCK_SECTIONS = [
  {
    id: 'section_1',
    title: 'Education',
    order: 0,
    repeatable: false,
    fields: [
      { key: 'degree', label: 'Degree', type: 'text', required: true, aiEnhanceable: true },
      { key: 'institution', label: 'Institution', type: 'text', required: true, aiEnhanceable: true },
    ],
  },
];

const MOCK_PROCESSED_BUFFER = Buffer.from('processed-docx-content');

function createMockTemplate(overrides: any = {}) {
  return {
    _id: new mongoose.Types.ObjectId(VALID_TEMPLATE_ID),
    templateName: 'Test Template',
    type: 'global',
    target: '',
    fileUrl: 'https://storage.example.com/original.docx',
    organizationId: new mongoose.Types.ObjectId(VALID_ORG_ID),
    uploadedBy: new mongoose.Types.ObjectId(VALID_USER_ID),
    questions: [],
    sections: [],
    formattingMetadata: {},
    confidence: 0,
    reviewed: false,
    reviewNotes: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('Resume Builder Workflow Integration', () => {
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      user: {
        userId: VALID_USER_ID,
        organizationId: VALID_ORG_ID,
        roleId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439014'),
      },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockedAxios.get.mockResolvedValue({ data: Buffer.from('raw-docx-content') });
    mockedStorage.uploadResumeTemplate.mockResolvedValue('https://storage.example.com/processed.docx');

    MockedOrchestrator.mockImplementation(() => ({
      process: jest.fn().mockResolvedValue({
        success: true,
        milestone2Result: {
          sections: MOCK_SECTIONS,
          entities: [],
          formattingMetadata: { styles: {}, headingLevels: {}, bulletMarker: '-', dateFormat: 'YYYY-MM-DD' },
          extractionIssues: [],
          confidence: 0.9,
        },
        injectionResult: {
          success: true,
          placeholdersInjected: 4,
          issues: [],
          buffer: MOCK_PROCESSED_BUFFER,
        },
        generationResult: {
          success: true,
          buffer: MOCK_PROCESSED_BUFFER,
          size: MOCK_PROCESSED_BUFFER.length,
          issues: [],
        },
        processedBuffer: MOCK_PROCESSED_BUFFER,
        issues: [],
      }),
    } as any));

    MockedRole.findOne.mockResolvedValue({ name: 'FACULTY' });
    MockedResumeTemplate.findById.mockResolvedValue(createMockTemplate());
    MockedResumeTemplate.findByIdAndUpdate.mockResolvedValue(createMockTemplate());
    MockedResumeTemplate.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      populate: jest.fn().mockResolvedValue([createMockTemplate()]),
    });
    MockedResumeTemplate.deleteMany.mockResolvedValue({ deletedCount: 0 });
    MockedEzoneAcademicProfile.findOne.mockResolvedValue({ department: 'CSE' });
  });

  it('should process template and persist sections, questions, formattingMetadata, confidence, and processedTemplateUrl', async () => {
    const mockTemplate = createMockTemplate({ questions: [] });
    MockedResumeTemplate.findById.mockResolvedValue(mockTemplate);
    
    const updatedTemplate = createMockTemplate({
      questions: [
        { tag: 'degree', question: 'Degree', type: 'text', aiEnhanceable: true },
        { tag: 'institution', question: 'Institution', type: 'text', aiEnhanceable: true },
      ],
      sections: MOCK_SECTIONS,
      formattingMetadata: { styles: {}, headingLevels: {}, bulletMarker: '-', dateFormat: 'YYYY-MM-DD' },
      confidence: 0.9,
      fileUrl: 'https://storage.example.com/processed.docx',
      originalFileUrl: 'https://storage.example.com/original.docx',
    });
    MockedResumeTemplate.findByIdAndUpdate.mockResolvedValue(updatedTemplate);

    mockReq.body = { templateId: VALID_TEMPLATE_ID };

    await processTemplateController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    const responseBody = mockRes.json.mock.calls[0][0];
    expect(responseBody.success).toBe(true);
    expect(responseBody.data.sections).toEqual(MOCK_SECTIONS);
    expect(responseBody.data.questions).toHaveLength(2);
    expect(responseBody.data.confidence).toBe(0.9);
    expect(responseBody.data.processedFileUrl).toBe('https://storage.example.com/processed.docx');

    expect(MockedResumeTemplate.findByIdAndUpdate).toHaveBeenCalledWith(
      VALID_TEMPLATE_ID,
      {
        $set: {
          fileUrl: 'https://storage.example.com/processed.docx',
          originalFileUrl: 'https://storage.example.com/original.docx',
          sections: [
            {
              id: 'section_1',
              title: 'Education',
              order: 0,
              repeatable: false,
              maxEntries: undefined,
              minEntries: undefined,
              fields: [
                { key: 'degree', label: 'Degree', type: 'text', required: true, aiEnhanceable: true, placeholder: undefined, validation: undefined, options: undefined },
                { key: 'institution', label: 'Institution', type: 'text', required: true, aiEnhanceable: true, placeholder: undefined, validation: undefined, options: undefined },
              ],
              aiPrompt: undefined,
            },
          ],
          questions: [
            { tag: 'degree', question: 'Degree', type: 'text', aiEnhanceable: true },
            { tag: 'institution', question: 'Institution', type: 'text', aiEnhanceable: true },
          ],
          formattingMetadata: { styles: {}, headingLevels: {}, bulletMarker: '-', dateFormat: 'YYYY-MM-DD' },
          confidence: 0.9,
        },
      },
      { new: true }
    );
  });

  it('should return populated metadata to student via template listing', async () => {
    const processedTemplate = createMockTemplate({
      questions: [
        { tag: 'degree', question: 'Degree', type: 'text', aiEnhanceable: true },
        { tag: 'institution', question: 'Institution', type: 'text', aiEnhanceable: true },
      ],
      sections: MOCK_SECTIONS,
      formattingMetadata: { styles: {}, headingLevels: {}, bulletMarker: '-', dateFormat: 'YYYY-MM-DD' },
      confidence: 0.9,
    });
    const chainableMock = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      populate: jest.fn().mockResolvedValue([processedTemplate]),
    };
    MockedResumeTemplate.find.mockReturnValue(chainableMock);

    mockReq.query = {};
    await getAvailableTemplatesController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    const responseBody = mockRes.json.mock.calls[0][0];
    const listedTemplate = responseBody.data?.[0];
    expect(listedTemplate).toBeDefined();
    expect(listedTemplate.sections).toEqual(MOCK_SECTIONS);
    expect(listedTemplate.questions).toHaveLength(2);
    expect(listedTemplate.confidence).toBe(0.9);
    expect(listedTemplate.formattingMetadata).toEqual({ styles: {}, headingLevels: {}, bulletMarker: '-', dateFormat: 'YYYY-MM-DD' });
  });

  it('should transform sections to schema-compatible format before persisting', async () => {
    const mockTemplate = createMockTemplate({ questions: [] });
    MockedResumeTemplate.findById.mockResolvedValue(mockTemplate);

    const sectionsWithExtraProps = [
      {
        id: 'section_1',
        title: 'Summary',
        order: 0,
        repeatable: false,
        maxEntries: 1,
        minEntries: 1,
        fields: [
          { key: 'text', label: 'Summary', type: 'textarea', required: true, aiEnhanceable: true, extraProp: 'should-be-removed' },
        ],
        aiPrompt: 'Extract summary',
        extraSectionProp: 'should-be-removed',
      },
    ];

    MockedOrchestrator.mockImplementation(() => ({
      process: jest.fn().mockResolvedValue({
        success: true,
        milestone2Result: {
          sections: sectionsWithExtraProps,
          entities: [],
          formattingMetadata: { styles: {}, headingLevels: {}, bulletMarker: '-', dateFormat: 'YYYY-MM-DD' },
          extractionIssues: [],
          confidence: 0.9,
        },
        injectionResult: {
          success: true,
          placeholdersInjected: 1,
          issues: [],
          buffer: MOCK_PROCESSED_BUFFER,
        },
        generationResult: {
          success: true,
          buffer: MOCK_PROCESSED_BUFFER,
          size: MOCK_PROCESSED_BUFFER.length,
          issues: [],
        },
        processedBuffer: MOCK_PROCESSED_BUFFER,
        issues: [],
      }),
    } as any));

    mockReq.body = { templateId: VALID_TEMPLATE_ID };

    await processTemplateController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    const updateCall = MockedResumeTemplate.findByIdAndUpdate.mock.calls[0];
    const updateArg = updateCall[1];
    const persistedSections = updateArg.$set.sections;

    expect(persistedSections).toHaveLength(1);
    expect(persistedSections[0]).not.toHaveProperty('extraSectionProp');
    expect(persistedSections[0].fields[0]).not.toHaveProperty('extraProp');
    expect(persistedSections[0].fields[0]).toEqual({
      key: 'text',
      label: 'Summary',
      type: 'textarea',
      required: true,
      aiEnhanceable: true,
      placeholder: undefined,
      validation: undefined,
      options: undefined,
    });
  });
});
