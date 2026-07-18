import mongoose from 'mongoose';
import { getMyAcademicRecords } from '../academicRecordController';
import { AcademicRecord } from '../../models/AcademicRecord';
import { PersonResolver } from '../../shared/services/personResolver.service';

jest.mock('../../shared/services/personResolver.service');

const mockedPersonResolver = PersonResolver as jest.MockedClass<typeof PersonResolver>;

const VALID_ORG_ID = '507f1f77bcf86cd799439011';
const VALID_PERSON_ID = '507f1f77bcf86cd799439012';

describe('AcademicRecordController GPA calculations', () => {
  let mockReq: any;
  let mockRes: any;

  beforeAll(async () => {
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
    mockReq = {
      organizationId: VALID_ORG_ID,
      user: { userId: 'user-456' },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockedPersonResolver.mockImplementation(() => ({
      resolve: jest.fn().mockResolvedValue(VALID_PERSON_ID),
    }) as any);

    await AcademicRecord.deleteMany({});
  });

  const createRecord = async (overrides: any = {}) => {
    const record = new AcademicRecord({
      organizationId: new mongoose.Types.ObjectId(VALID_ORG_ID),
      personId: new mongoose.Types.ObjectId(VALID_PERSON_ID),
      sourceDocumentId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
      rawConfidence: 0.9,
      subjectCode: overrides.subjectCode || 'CSE101',
      subjectName: overrides.subjectName || 'Intro to CS',
      semester: overrides.semester || '1',
      year: overrides.year || 2023,
      grade: overrides.grade || 'A',
      gradePoints: overrides.gradePoints || 8,
      gradingStatus: overrides.gradingStatus || 'Graded',
      credits: overrides.credits || 3,
      status: 'APPROVED',
    });
    await record.save();
    return record;
  };

  it('should compute CGPA excluding Audit subjects', async () => {
    await createRecord({ subjectCode: 'CSE101', grade: 'A', gradePoints: 8, credits: 3, gradingStatus: 'Graded' });
    await createRecord({ subjectCode: 'AUD101', grade: 'A', gradePoints: 8, credits: 2, gradingStatus: 'Audit' });

    await getMyAcademicRecords(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    const responseBody = mockRes.json.mock.calls[0][0];
    expect(responseBody.data.overall.cgpa).toBeCloseTo(8 / 3, 3);
    expect(responseBody.data.overall.totalCredits).toBe(5);
    expect(responseBody.data.overall.completedCredits).toBe(3);
    expect(responseBody.data.overall.semestersCompleted).toBe(1);
  });

  it('should compute CGPA excluding In Progress subjects', async () => {
    await createRecord({ subjectCode: 'CSE101', grade: 'A', gradePoints: 8, credits: 3, gradingStatus: 'Graded' });
    await createRecord({ subjectCode: 'CSE102', grade: 'A', gradePoints: 8, credits: 3, gradingStatus: 'In Progress' });

    await getMyAcademicRecords(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    const responseBody = mockRes.json.mock.calls[0][0];
    expect(responseBody.data.overall.cgpa).toBeCloseTo(8 / 3, 3);
    expect(responseBody.data.overall.totalCredits).toBe(6);
    expect(responseBody.data.overall.completedCredits).toBe(3);
  });

  it('should compute CGPA excluding Failed subjects', async () => {
    await createRecord({ subjectCode: 'CSE101', grade: 'A', gradePoints: 8, credits: 3, gradingStatus: 'Graded' });
    await createRecord({ subjectCode: 'CSE102', grade: 'F', gradePoints: 0, credits: 3, gradingStatus: 'Fail' });

    await getMyAcademicRecords(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    const responseBody = mockRes.json.mock.calls[0][0];
    expect(responseBody.data.overall.cgpa).toBeCloseTo(8 / 3, 3);
    expect(responseBody.data.overall.totalCredits).toBe(6);
    expect(responseBody.data.overall.completedCredits).toBe(3);
  });

  it('should compute CGPA excluding grade F even when gradingStatus is Graded', async () => {
    await createRecord({ subjectCode: 'CSE101', grade: 'A', gradePoints: 8, credits: 3, gradingStatus: 'Graded' });
    await createRecord({ subjectCode: 'CSE102', grade: 'F', gradePoints: 0, credits: 3, gradingStatus: 'Graded' });

    await getMyAcademicRecords(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    const responseBody = mockRes.json.mock.calls[0][0];
    expect(responseBody.data.overall.cgpa).toBeCloseTo(8 / 3, 3);
    expect(responseBody.data.overall.totalCredits).toBe(6);
    expect(responseBody.data.overall.completedCredits).toBe(3);
  });

  it('should compute CGPA with Qualified subjects included', async () => {
    await createRecord({ subjectCode: 'CSE101', grade: 'A', gradePoints: 8, credits: 3, gradingStatus: 'Graded' });
    await createRecord({ subjectCode: 'CSE102', grade: 'Qualified', gradePoints: 6, credits: 3, gradingStatus: 'Qualified' });

    await getMyAcademicRecords(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    const responseBody = mockRes.json.mock.calls[0][0];
    expect(responseBody.data.overall.cgpa).toBeCloseTo((8 + 6) / (3 + 3), 3);
    expect(responseBody.data.overall.totalCredits).toBe(6);
    expect(responseBody.data.overall.completedCredits).toBe(6);
  });

  it('should handle multiple semesters and compute per-semester GPA correctly', async () => {
    await createRecord({ subjectCode: 'CSE101', grade: 'A', gradePoints: 8, credits: 3, semester: '1', year: 2023 });
    await createRecord({ subjectCode: 'CSE102', grade: 'B', gradePoints: 6, credits: 3, semester: '1', year: 2023 });
    await createRecord({ subjectCode: 'CSE201', grade: 'O', gradePoints: 10, credits: 4, semester: '2', year: 2024 });
    await createRecord({ subjectCode: 'CSE202', grade: 'A', gradePoints: 8, credits: 4, semester: '2', year: 2024 });

    await getMyAcademicRecords(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    const responseBody = mockRes.json.mock.calls[0][0];
    expect(responseBody.data.overall.cgpa).toBeCloseTo((8 + 6 + 10 + 8) / (3 + 3 + 4 + 4), 3);
    expect(responseBody.data.overall.totalCredits).toBe(14);
    expect(responseBody.data.overall.completedCredits).toBe(14);
    expect(responseBody.data.overall.semestersCompleted).toBe(2);
    expect(responseBody.data.semesters).toHaveLength(2);
    expect(responseBody.data.semesters[0].gpa).toBeCloseTo((8 + 6) / (3 + 3), 3);
    expect(responseBody.data.semesters[1].gpa).toBeCloseTo((10 + 8) / (4 + 4), 3);
  });

  it('should return zero CGPA when no GPA-eligible subjects exist', async () => {
    await createRecord({ subjectCode: 'AUD101', grade: 'A', gradePoints: 8, credits: 2, gradingStatus: 'Audit' });
    await createRecord({ subjectCode: 'CSE101', grade: 'F', gradePoints: 0, credits: 3, gradingStatus: 'Fail' });

    await getMyAcademicRecords(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    const responseBody = mockRes.json.mock.calls[0][0];
    expect(responseBody.data.overall.cgpa).toBe(0);
    expect(responseBody.data.overall.totalCredits).toBe(5);
    expect(responseBody.data.overall.completedCredits).toBe(0);
  });

  it('should handle empty records', async () => {
    await getMyAcademicRecords(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    const responseBody = mockRes.json.mock.calls[0][0];
    expect(responseBody.data.overall.cgpa).toBe(0);
    expect(responseBody.data.overall.totalCredits).toBe(0);
    expect(responseBody.data.semesters).toHaveLength(0);
  });

  it('should handle backward-compatible records missing gradingStatus', async () => {
    const record = new AcademicRecord({
      organizationId: new mongoose.Types.ObjectId(VALID_ORG_ID),
      personId: new mongoose.Types.ObjectId(VALID_PERSON_ID),
      sourceDocumentId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
      rawConfidence: 0.9,
      subjectCode: 'CSE101',
      subjectName: 'Intro to CS',
      semester: '1',
      year: 2023,
      grade: 'A',
      gradePoints: 8,
      credits: 3,
      status: 'APPROVED',
    });
    await record.save();

    await getMyAcademicRecords(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    const responseBody = mockRes.json.mock.calls[0][0];
    expect(responseBody.data.overall.cgpa).toBeCloseTo(8 / 3, 3);
    expect(responseBody.data.overall.completedCredits).toBe(3);
  });
});
