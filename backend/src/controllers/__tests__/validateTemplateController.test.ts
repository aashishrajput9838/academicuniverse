import mongoose from 'mongoose';
import { validateTemplateController } from '../resumeController';
import { PlaceholderValidator } from '../../services/placeholderValidator.service';

jest.mock('../../services/placeholderValidator.service');
jest.mock('../../models/Role', () => ({
  findById: jest.fn(),
}));

const MockedPlaceholderValidator = PlaceholderValidator as jest.MockedClass<typeof PlaceholderValidator>;
const MockedRole = require('../../models/Role') as any;

const VALID_USER_ID = '507f1f77bcf86cd799439012';
const VALID_ORG_ID = '507f1f77bcf86cd799439011';

function createMockFile(overrides: any = {}) {
  return {
    originalname: 'template.docx',
    mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: Buffer.from('mock-docx-content'),
    ...overrides,
  };
}

function createMockReq(overrides: any = {}) {
  return {
    user: {
      userId: VALID_USER_ID,
      organizationId: VALID_ORG_ID,
      roleId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439014'),
      isSuperAdmin: false,
    },
    file: createMockFile(),
    ...overrides,
  };
}

function createMockRes() {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('validateTemplateController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockedRole.findById.mockResolvedValue({ name: 'FACULTY' });
  });

  it('returns 401 when user is not authenticated', async () => {
    const req = createMockReq({ user: undefined });
    const res = createMockRes();

    await validateTemplateController(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 400 when no file is provided', async () => {
    const req = createMockReq({ file: undefined });
    const res = createMockRes();

    await validateTemplateController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 for unsupported file type', async () => {
    const req = createMockReq({
      file: createMockFile({ mimetype: 'application/pdf', originalname: 'resume.pdf' }),
    });
    const res = createMockRes();

    await validateTemplateController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns validation report for a valid DOCX', async () => {
    const mockReport = {
      valid: true,
      placeholders: [{ raw: '{{name}}', key: 'name', location: 'p[0]/r[0]/t[0]', context: 'Full Name: name' }],
      issues: [],
      summary: { total: 1, unique: 1, duplicates: 0, missingRequired: [], unknown: [], misspelled: [], reservedConflicts: [], deprecated: [] },
    };

    MockedPlaceholderValidator.mockImplementation(() => ({
      validate: jest.fn().mockResolvedValue(mockReport),
    } as any));

    const req = createMockReq();
    const res = createMockRes();

    await validateTemplateController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        success: true,
        data: mockReport,
      },
      message: 'Template validated successfully',
      statusCode: 200,
    });
  });

  it('returns validation report for an invalid DOCX', async () => {
    const mockReport = {
      valid: false,
      placeholders: [],
      issues: [{ severity: 'error', code: 'MISSING', placeholder: '{{name}}', message: 'Required field name is missing', suggestion: 'Add {{name}}' }],
      summary: { total: 0, unique: 0, duplicates: 0, missingRequired: ['name'], unknown: [], misspelled: [], reservedConflicts: [], deprecated: [] },
    };

    MockedPlaceholderValidator.mockImplementation(() => ({
      validate: jest.fn().mockResolvedValue(mockReport),
    } as any));

    const req = createMockReq();
    const res = createMockRes();

    await validateTemplateController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        success: false,
        data: mockReport,
      },
      message: 'Template validation failed',
      statusCode: 200,
    });
  });

  it('returns 500 when validator throws', async () => {
    MockedPlaceholderValidator.mockImplementation(() => ({
      validate: jest.fn().mockRejectedValue(new Error('DOCX parsing failed')),
    } as any));

    const req = createMockReq();
    const res = createMockRes();

    await validateTemplateController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('accepts DOCX by extension even with generic mime type', async () => {
    const req = createMockReq({
      file: createMockFile({ mimetype: 'application/zip', originalname: 'template.docx' }),
    });
    const res = createMockRes();

    const mockReport = {
      valid: true,
      placeholders: [],
      issues: [],
      summary: { total: 0, unique: 0, duplicates: 0, missingRequired: [], unknown: [], misspelled: [], reservedConflicts: [], deprecated: [] },
    };

    MockedPlaceholderValidator.mockImplementation(() => ({
      validate: jest.fn().mockResolvedValue(mockReport),
    } as any));

    await validateTemplateController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});
