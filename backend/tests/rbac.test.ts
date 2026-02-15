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

  it('should enforce permissions correctly for add/view/update/delete marks', async () => {
    for (const u of users) {
      const loginRes = await request(app).post('/api/auth/login').send({ email: u.email, password: u.password }).expect(200);
      const token = loginRes.body.data.token;
      const perms = loginRes.body.data.user.permissions;

      // Add marks
      const addRes = await request(app)
        .post('/api/marks')
        .set('Authorization', `Bearer ${token}`)
        .send({ studentId: 'student1', subjectId: 'math101', term: '2025-fall', marks: 95 });

      if (perms.includes('ADD_MARKS') || loginRes.body.data.isSuperAdmin) {
        expect(addRes.status).toBe(201);
        expect(addRes.body.success).toBe(true);
        const markId = addRes.body.data.id;

        // View student marks
        const viewRes = await request(app).get('/api/marks/student1').set('Authorization', `Bearer ${token}`);
        expect([200, 200]).toContain(viewRes.status);

        // If can edit
        if (perms.includes('EDIT_MARKS')) {
          const upd = await request(app).put(`/api/marks/${markId}`).set('Authorization', `Bearer ${token}`).send({ marks: 88 });
          expect(upd.status).toBe(200);
        }

        // If can delete
        if (perms.includes('DELETE_MARKS')) {
          const del = await request(app).delete(`/api/marks/${markId}`).set('Authorization', `Bearer ${token}`);
          expect(del.status).toBe(200);
        }
      } else {
        expect(addRes.status).toBe(403);
      }
    }
  });
});

afterAll(async () => {
  // Close mongoose connection so Jest can exit
  await disconnectDB();
});
