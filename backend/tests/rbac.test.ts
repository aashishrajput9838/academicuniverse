import request from 'supertest';
import { execSync } from 'child_process';
import app from '../src';
import { disconnectDB } from '../src/config';

jest.setTimeout(120000);

beforeAll(() => {
  // Seed the database in a child process so it won't exit this test runner
  execSync('npm run seed', { cwd: __dirname + '/../', stdio: 'inherit' });
});

describe('RBAC integration tests', () => {
  const users = [
    { name: 'super', email: 'superadmin@academicuniverse.com', password: 'SuperAdmin123' },
    { name: 'admin', email: 'admin@sharda.com', password: 'Admin123456' },
    { name: 'faculty', email: 'jane.smith@sharda.com', password: 'Faculty123' },
    { name: 'student', email: 'john.doe@sharda.com', password: 'Student123' },
  ];

  it('should allow a student to read only their own marks through /api/marks/me', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({ email: 'john.doe@sharda.com', password: 'Student123' }).expect(200);
    const token = loginRes.body.data.token;
    const studentId = loginRes.body.data.user.id.toString();

    const addRes = await request(app)
      .post('/api/marks')
      .set('Authorization', `Bearer ${token}`)
      .send({ studentId, subjectId: 'math101', marks: 95 });

    expect(addRes.status).toBe(201);

    const selfMarksRes = await request(app)
      .get('/api/marks/me')
      .set('Authorization', `Bearer ${token}`);

    expect(selfMarksRes.status).toBe(200);
    expect(Array.isArray(selfMarksRes.body.data)).toBe(true);
    expect(selfMarksRes.body.data.some((mark: any) => mark.subjectId === 'math101' && mark.marks === 95)).toBe(true);

    const clientInputSelfRes = await request(app)
      .get('/api/marks/me')
      .set('Authorization', `Bearer ${token}`)
      .query({ studentId: '507f1f77bcf86cd799439011' });

    expect(clientInputSelfRes.status).toBe(200);
    expect(Array.isArray(clientInputSelfRes.body.data)).toBe(true);
  });

  it('should deny /:studentId to users without VIEW_ALL_MARKS and allow /:studentId to users with VIEW_ALL_MARKS', async () => {
    const studentLoginRes = await request(app).post('/api/auth/login').send({ email: 'john.doe@sharda.com', password: 'Student123' }).expect(200);
    const studentToken = studentLoginRes.body.data.token;
    const studentId = studentLoginRes.body.data.user.id.toString();

    const adminLoginRes = await request(app).post('/api/auth/login').send({ email: 'admin@sharda.com', password: 'Admin123456' }).expect(200);
    const adminToken = adminLoginRes.body.data.token;

    const addRes = await request(app)
      .post('/api/marks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId, subjectId: 'math201', marks: 90 });

    expect(addRes.status).toBe(201);

    const deniedRes = await request(app)
      .get(`/api/marks/${studentId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(deniedRes.status).toBe(403);

    const allowedRes = await request(app)
      .get(`/api/marks/${studentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(allowedRes.status).toBe(200);
    expect(Array.isArray(allowedRes.body.data)).toBe(true);
  });

  it('should return a 400 for malformed studentId on /:studentId', async () => {
    const adminLoginRes = await request(app).post('/api/auth/login').send({ email: 'admin@sharda.com', password: 'Admin123456' }).expect(200);
    const adminToken = adminLoginRes.body.data.token;

    const invalidIdRes = await request(app)
      .get('/api/marks/not-a-valid-object-id')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(invalidIdRes.status).toBe(400);
    expect(invalidIdRes.body.success).toBe(false);
  });

  it('should not expose marks for a target user outside the authenticated organization', async () => {
    const adminLoginRes = await request(app).post('/api/auth/login').send({ email: 'admin@sharda.com', password: 'Admin123456' }).expect(200);
    const adminToken = adminLoginRes.body.data.token;

    const outsideOrgRes = await request(app)
      .get('/api/marks/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(outsideOrgRes.status).toBe(404);
  });
});

afterAll(async () => {
  // Close mongoose connection so Jest can exit
  await disconnectDB();
});
