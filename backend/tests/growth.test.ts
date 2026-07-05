import request from 'supertest';
import { execSync } from 'child_process';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import app from '../src';
import { disconnectDB } from '../src/config';
import Mark from '../src/models/Mark';
import { EzoneAcademicProfile } from '../src/models/EzoneAcademicProfile';
import User from '../src/models/User';
import githubService from '../src/services/githubService';

jest.setTimeout(120000);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const login = async (email: string, password: string) => {
  const loginRes = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
  return loginRes.body.data;
};

const getStudentContext = async (email: string, password: string) => {
  const auth = await login(email, password);
  const userDoc = await User.findById(auth.user.id).lean();
  return {
    token: auth.token,
    userId: auth.user.id.toString(),
    organizationId: userDoc?.organizationId?.toString(),
  };
};

const clearGrowthArtifacts = async (userId: string, organizationId: string) => {
  await Mark.deleteMany({ studentId: new mongoose.Types.ObjectId(userId), organizationId: new mongoose.Types.ObjectId(organizationId) });
  await EzoneAcademicProfile.deleteMany({ userId: new mongoose.Types.ObjectId(userId), organizationId: new mongoose.Types.ObjectId(organizationId) });
  await User.findByIdAndUpdate(userId, { $unset: { githubUsername: 1 } });
};

beforeAll(() => {
  execSync('npm run seed', { cwd: __dirname + '/../', stdio: 'inherit' });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Growth Hub integration tests', () => {
  it('denies unauthenticated growth requests', async () => {
    const res = await request(app).get('/api/growth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('fails safely when canonical organization context is missing', async () => {
    const token = jwt.sign({ userId: '507f1f77bcf86cd799439011', email: 'missing-org@example.com', roleId: '507f1f77bcf86cd799439011', permissions: [], isSuperAdmin: false }, JWT_SECRET);

    const res = await request(app)
      .get('/api/growth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Organization context is required');
  });

  it('uses the authenticated student identity and ignores client-selected identity', async () => {
    const studentContext = await getStudentContext('john.doe@sharda.com', 'Student123');
    await clearGrowthArtifacts(studentContext.userId, studentContext.organizationId!);
    await Mark.create({
      studentId: new mongoose.Types.ObjectId(studentContext.userId),
      organizationId: new mongoose.Types.ObjectId(studentContext.organizationId!),
      subjectId: 'math101',
      marks: 88,
      createdBy: new mongoose.Types.ObjectId(studentContext.userId),
    });

    const res = await request(app)
      .get('/api/growth/me')
      .set('Authorization', `Bearer ${studentContext.token}`)
      .query({ studentId: '507f1f77bcf86cd799439011' });

    expect(res.status).toBe(200);
    expect(res.body.data.metrics.marksSummary.state).toBe('AVAILABLE');
    expect(res.body.data.metrics.averageMarks.value).toBe(88);
    expect(res.body.data.metrics.subjectWisePerformance.value[0].subjectId).toBe('math101');
    expect(res.body.data.metrics.attendance.state).toBe('NOT_SYNCED');
    expect(res.body.data.metrics.githubRepositoryCount.state).toBe('NOT_CONNECTED');
  });

  it('does not expose marks from another organization', async () => {
    const studentContext = await getStudentContext('john.doe@sharda.com', 'Student123');
    await clearGrowthArtifacts(studentContext.userId, studentContext.organizationId!);
    await Mark.create({
      studentId: new mongoose.Types.ObjectId(studentContext.userId),
      organizationId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      subjectId: 'math999',
      marks: 99,
      createdBy: new mongoose.Types.ObjectId(studentContext.userId),
    });

    const res = await request(app)
      .get('/api/growth/me')
      .set('Authorization', `Bearer ${studentContext.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.metrics.marksSummary.state).toBe('EMPTY');
    expect(res.body.data.metrics.averageMarks.state).toBe('EMPTY');
  });

  it('keeps a real zero mark as valid data', async () => {
    const studentContext = await getStudentContext('john.doe@sharda.com', 'Student123');
    await clearGrowthArtifacts(studentContext.userId, studentContext.organizationId!);
    await Mark.create({
      studentId: new mongoose.Types.ObjectId(studentContext.userId),
      organizationId: new mongoose.Types.ObjectId(studentContext.organizationId!),
      subjectId: 'math101',
      marks: 0,
      createdBy: new mongoose.Types.ObjectId(studentContext.userId),
    });

    const res = await request(app)
      .get('/api/growth/me')
      .set('Authorization', `Bearer ${studentContext.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.metrics.marksSummary.state).toBe('AVAILABLE');
    expect(res.body.data.metrics.averageMarks.value).toBe(0);
    expect(res.body.data.metrics.subjectWisePerformance.value[0].averageMarks).toBe(0);
  });

  it('returns real Ezone attendance and status when the profile is available', async () => {
    const studentContext = await getStudentContext('john.doe@sharda.com', 'Student123');
    await clearGrowthArtifacts(studentContext.userId, studentContext.organizationId!);
    await EzoneAcademicProfile.create({
      organizationId: new mongoose.Types.ObjectId(studentContext.organizationId!),
      userId: new mongoose.Types.ObjectId(studentContext.userId),
      studentName: 'John Doe',
      systemId: 'SYS-001',
      status: 'ACTIVE',
      attendancePercentage: 92,
    });

    const res = await request(app)
      .get('/api/growth/me')
      .set('Authorization', `Bearer ${studentContext.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.metrics.attendance.state).toBe('AVAILABLE');
    expect(res.body.data.metrics.attendance.value).toBe(92);
    expect(res.body.data.metrics.academicProfileStatus.state).toBe('AVAILABLE');
    expect(res.body.data.metrics.academicProfileStatus.value).toBe('ACTIVE');
  });

  it('keeps academic metrics intact when GitHub integration fails and does not leak provider text', async () => {
    const studentContext = await getStudentContext('john.doe@sharda.com', 'Student123');
    await clearGrowthArtifacts(studentContext.userId, studentContext.organizationId!);
    await Mark.create({
      studentId: new mongoose.Types.ObjectId(studentContext.userId),
      organizationId: new mongoose.Types.ObjectId(studentContext.organizationId!),
      subjectId: 'math101',
      marks: 76,
      createdBy: new mongoose.Types.ObjectId(studentContext.userId),
    });
    await EzoneAcademicProfile.create({
      organizationId: new mongoose.Types.ObjectId(studentContext.organizationId!),
      userId: new mongoose.Types.ObjectId(studentContext.userId),
      studentName: 'John Doe',
      systemId: 'SYS-002',
      status: 'ACTIVE',
      attendancePercentage: 90,
    });
    await User.findByIdAndUpdate(studentContext.userId, { githubUsername: 'octocat' });
    jest.spyOn(githubService, 'getProjectStats').mockRejectedValueOnce(new Error('controlled-github-provider-failure'));

    const res = await request(app)
      .get('/api/growth/me')
      .set('Authorization', `Bearer ${studentContext.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.metrics.marksSummary.state).toBe('AVAILABLE');
    expect(res.body.data.metrics.attendance.state).toBe('AVAILABLE');
    expect(res.body.data.metrics.githubRepositoryCount.state).toBe('UNAVAILABLE');
    expect(res.body.data.metrics.githubRepositoryCount.value).toBeNull();
    expect(res.body.data.metrics.githubRepositoryCount.reasonCode).toBe('SOURCE_ERROR');
    expect(res.body.data.metrics.completedProjects.state).toBe('UNAVAILABLE');
    expect(res.body.data.metrics.completedProjects.value).toBeNull();
    expect(res.body.data.metrics.completedProjects.reasonCode).toBe('SOURCE_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('controlled-github-provider-failure');
    expect(res.body.data).not.toHaveProperty('githubUsername');
    expect(res.body.data).not.toHaveProperty('githubAccessToken');
    expect(res.body.data).not.toHaveProperty('githubProviderError');
    expect(res.body.data.metrics).not.toHaveProperty('githubDetails');
  });

  it('keeps Ezone and GitHub metrics intact when the marks source fails', async () => {
    const studentContext = await getStudentContext('john.doe@sharda.com', 'Student123');
    await clearGrowthArtifacts(studentContext.userId, studentContext.organizationId!);
    await EzoneAcademicProfile.create({
      organizationId: new mongoose.Types.ObjectId(studentContext.organizationId!),
      userId: new mongoose.Types.ObjectId(studentContext.userId),
      studentName: 'John Doe',
      systemId: 'SYS-003',
      status: 'ACTIVE',
      attendancePercentage: 88,
    });
    await User.findByIdAndUpdate(studentContext.userId, { githubUsername: 'octocat' });
    jest.spyOn(githubService, 'getProjectStats').mockResolvedValueOnce({ total: 3, completed: 1, ongoing: 1 });
    jest.spyOn(Mark, 'find').mockImplementationOnce(() => { throw new Error('db failure'); });

    const res = await request(app)
      .get('/api/growth/me')
      .set('Authorization', `Bearer ${studentContext.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.metrics.marksSummary.state).toBe('ERROR');
    expect(res.body.data.metrics.marksSummary.value).toBeNull();
    expect(res.body.data.metrics.marksSummary.reasonCode).toBe('SOURCE_ERROR');
    expect(res.body.data.metrics.averageMarks.state).toBe('ERROR');
    expect(res.body.data.metrics.subjectWisePerformance.state).toBe('ERROR');
    expect(res.body.data.metrics.attendance.state).toBe('AVAILABLE');
    expect(res.body.data.metrics.attendance.value).toBe(88);
    expect(res.body.data.metrics.githubRepositoryCount.state).toBe('AVAILABLE');
    expect(res.body.data.metrics.githubRepositoryCount.value).toBe(3);
    expect(JSON.stringify(res.body)).not.toContain('db failure');
  });

  it('keeps marks and GitHub metrics intact when the Ezone source fails', async () => {
    const studentContext = await getStudentContext('john.doe@sharda.com', 'Student123');
    await clearGrowthArtifacts(studentContext.userId, studentContext.organizationId!);
    await Mark.create({
      studentId: new mongoose.Types.ObjectId(studentContext.userId),
      organizationId: new mongoose.Types.ObjectId(studentContext.organizationId!),
      subjectId: 'math101',
      marks: 82,
      createdBy: new mongoose.Types.ObjectId(studentContext.userId),
    });
    await User.findByIdAndUpdate(studentContext.userId, { githubUsername: 'octocat' });
    jest.spyOn(githubService, 'getProjectStats').mockResolvedValueOnce({ total: 4, completed: 2, ongoing: 1 });
    jest.spyOn(EzoneAcademicProfile, 'findOne').mockImplementationOnce(() => { throw new Error('ezone failure'); });

    const res = await request(app)
      .get('/api/growth/me')
      .set('Authorization', `Bearer ${studentContext.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.metrics.attendance.state).toBe('ERROR');
    expect(res.body.data.metrics.attendance.value).toBeNull();
    expect(res.body.data.metrics.attendance.reasonCode).toBe('SOURCE_ERROR');
    expect(res.body.data.metrics.academicProfileStatus.state).toBe('ERROR');
    expect(res.body.data.metrics.marksSummary.state).toBe('AVAILABLE');
    expect(res.body.data.metrics.averageMarks.value).toBe(82);
    expect(res.body.data.metrics.githubRepositoryCount.state).toBe('AVAILABLE');
    expect(res.body.data.metrics.githubRepositoryCount.value).toBe(4);
    expect(JSON.stringify(res.body)).not.toContain('ezone failure');
  });

  it('keeps missing source values null instead of converting them to zero', async () => {
    const studentContext = await getStudentContext('john.doe@sharda.com', 'Student123');
    await clearGrowthArtifacts(studentContext.userId, studentContext.organizationId!);

    const res = await request(app)
      .get('/api/growth/me')
      .set('Authorization', `Bearer ${studentContext.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.metrics.marksSummary.state).toBe('EMPTY');
    expect(res.body.data.metrics.marksSummary.value).toBeNull();
    expect(res.body.data.metrics.marksSummary.reasonCode).toBe('NO_DATA');
    expect(res.body.data.metrics.averageMarks.state).toBe('EMPTY');
    expect(res.body.data.metrics.averageMarks.value).toBeNull();
    expect(res.body.data.metrics.averageMarks.reasonCode).toBe('NO_DATA');
    expect(res.body.data.metrics.attendance.state).toBe('NOT_SYNCED');
    expect(res.body.data.metrics.attendance.value).toBeNull();
    expect(res.body.data.metrics.attendance.reasonCode).toBe('NOT_SYNCED');
    expect(res.body.data.metrics.githubRepositoryCount.state).toBe('NOT_CONNECTED');
    expect(res.body.data.metrics.githubRepositoryCount.value).toBeNull();
    expect(res.body.data.metrics.githubRepositoryCount.reasonCode).toBe('NOT_CONNECTED');
    expect(res.body.data.metrics.completedProjects.state).toBe('NOT_CONNECTED');
    expect(res.body.data.metrics.completedProjects.value).toBeNull();
    expect(res.body.data.metrics.completedProjects.reasonCode).toBe('NOT_CONNECTED');
  });

  it('reports GitHub not connected when the current user has no GitHub username', async () => {
    const studentContext = await getStudentContext('john.doe@sharda.com', 'Student123');
    await clearGrowthArtifacts(studentContext.userId, studentContext.organizationId!);
    await Mark.create({
      studentId: new mongoose.Types.ObjectId(studentContext.userId),
      organizationId: new mongoose.Types.ObjectId(studentContext.organizationId!),
      subjectId: 'math101',
      marks: 74,
      createdBy: new mongoose.Types.ObjectId(studentContext.userId),
    });
    await EzoneAcademicProfile.create({
      organizationId: new mongoose.Types.ObjectId(studentContext.organizationId!),
      userId: new mongoose.Types.ObjectId(studentContext.userId),
      studentName: 'John Doe',
      systemId: 'SYS-004',
      status: 'ACTIVE',
      attendancePercentage: 86,
    });
    await User.findByIdAndUpdate(studentContext.userId, { githubUsername: null });

    const res = await request(app)
      .get('/api/growth/me')
      .set('Authorization', `Bearer ${studentContext.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.metrics.githubRepositoryCount.state).toBe('NOT_CONNECTED');
    expect(res.body.data.metrics.githubRepositoryCount.value).toBeNull();
    expect(res.body.data.metrics.githubRepositoryCount.reasonCode).toBe('NOT_CONNECTED');
    expect(res.body.data.metrics.completedProjects.state).toBe('NOT_CONNECTED');
    expect(res.body.data.metrics.completedProjects.value).toBeNull();
    expect(res.body.data.metrics.completedProjects.reasonCode).toBe('NOT_CONNECTED');
    expect(res.body.data.metrics.marksSummary.state).toBe('AVAILABLE');
    expect(res.body.data.metrics.averageMarks.state).toBe('AVAILABLE');
    expect(res.body.data.metrics.averageMarks.value).toBe(74);
    expect(res.body.data.metrics.attendance.state).toBe('AVAILABLE');
    expect(res.body.data.metrics.attendance.value).toBe(86);
    expect(res.body.data.metrics.academicProfileStatus.state).toBe('AVAILABLE');
    expect(res.body.data.metrics.academicProfileStatus.value).toBe('ACTIVE');
  });

  it('reports Ezone as never synced when no profile document exists for the authenticated user', async () => {
    const studentContext = await getStudentContext('john.doe@sharda.com', 'Student123');
    await clearGrowthArtifacts(studentContext.userId, studentContext.organizationId!);
    await Mark.create({
      studentId: new mongoose.Types.ObjectId(studentContext.userId),
      organizationId: new mongoose.Types.ObjectId(studentContext.organizationId!),
      subjectId: 'math101',
      marks: 68,
      createdBy: new mongoose.Types.ObjectId(studentContext.userId),
    });

    const res = await request(app)
      .get('/api/growth/me')
      .set('Authorization', `Bearer ${studentContext.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.metrics.attendance.state).toBe('NOT_SYNCED');
    expect(res.body.data.metrics.attendance.value).toBeNull();
    expect(res.body.data.metrics.attendance.reasonCode).toBe('NOT_SYNCED');
    expect(res.body.data.metrics.academicProfileStatus.state).toBe('NOT_SYNCED');
    expect(res.body.data.metrics.academicProfileStatus.value).toBeNull();
    expect(res.body.data.metrics.academicProfileStatus.reasonCode).toBe('NOT_SYNCED');
    expect(res.body.data.metrics.marksSummary.state).toBe('AVAILABLE');
    expect(res.body.data.metrics.averageMarks.state).toBe('AVAILABLE');
    expect(res.body.data.metrics.averageMarks.value).toBe(68);
  });

  it('does not expose Gmail or internal identity fields in the public response', async () => {
    const studentContext = await getStudentContext('john.doe@sharda.com', 'Student123');
    await clearGrowthArtifacts(studentContext.userId, studentContext.organizationId!);

    const res = await request(app)
      .get('/api/growth/me')
      .set('Authorization', `Bearer ${studentContext.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty('gmail');
    expect(res.body.data).not.toHaveProperty('studentId');
    expect(res.body.data).not.toHaveProperty('organizationId');
    expect(JSON.stringify(res.body)).not.toContain('gmail');
  });
});

afterAll(async () => {
  await disconnectDB();
});
