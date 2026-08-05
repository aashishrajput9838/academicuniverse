import fetch from 'node-fetch';

const BASE = process.env.BASE_URL || 'http://localhost:5000';

type Creds = { email: string; password: string };

const users: { name: string; creds: Creds }[] = [
  { name: 'super', creds: { email: process.env.TEST_SUPER_EMAIL || '', password: process.env.TEST_SUPER_PASS || '' } },
  { name: 'admin', creds: { email: process.env.TEST_ADMIN_EMAIL || '', password: process.env.TEST_ADMIN_PASS || '' } },
  { name: 'faculty', creds: { email: process.env.TEST_FACULTY_EMAIL || '', password: process.env.TEST_FACULTY_PASS || '' } },
  { name: 'student', creds: { email: process.env.TEST_STUDENT_EMAIL || '', password: process.env.TEST_STUDENT_PASS || '' } },
];

if (users.some(u => !u.creds.email || !u.creds.password)) {
  console.error('[rbacTestExtended] ERROR: Set TEST_SUPER_EMAIL/PASS, TEST_ADMIN_EMAIL/PASS, TEST_FACULTY_EMAIL/PASS, TEST_STUDENT_EMAIL/PASS env vars before running this script.');
  process.exit(1);
}

const login = async (creds: Creds) => {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creds),
  });
  return res.json();
};

const addMarks = async (token: string) => {
  const res = await fetch(`${BASE}/api/marks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ studentId: 'student1', subjectId: 'math101', term: '2025-fall', marks: 95 }),
  });
  return res.json().catch(() => ({ success: false, status: res.status, body: '' }));
};

const getAllMarks = async (token: string) => {
  const res = await fetch(`${BASE}/api/marks`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json().catch(() => ({ success: false, status: res.status }));
};

const getStudentMarks = async (token: string, studentId: string) => {
  const res = await fetch(`${BASE}/api/marks/${studentId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json().catch(() => ({ success: false, status: res.status }));
};

const updateMarks = async (token: string, markId: string) => {
  const res = await fetch(`${BASE}/api/marks/${markId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ marks: 88 }),
  });
  return res.json().catch(() => ({ success: false, status: res.status }));
};

const deleteMarks = async (token: string, markId: string) => {
  const res = await fetch(`${BASE}/api/marks/${markId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json().catch(() => ({ success: false, status: res.status }));
};

const run = async () => {
  console.log('\nRBAC Extended Test Starting');

  for (const u of users) {
    try {
      console.log(`\n--- User: ${u.name} (${u.creds.email})`);
      const loginRes = await login(u.creds);
      if (!loginRes || !loginRes.success) {
        console.log('Login failed', loginRes);
        continue;
      }

      const token = loginRes.data.token;
      console.log('Permissions:', loginRes.data.user.permissions || []);

      // 1) Add marks
      const addRes = await addMarks(token);
      console.log('Add marks:', addRes);

      // If add succeeded, capture mark id
      const markId = addRes?.data?.id;

      // 2) Get student marks
      const viewRes = await getStudentMarks(token, 'student1');
      console.log('View student marks:', viewRes?.statusCode ?? viewRes?.status, viewRes?.data ? 'OK' : viewRes);

      // 3) Get all marks
      const allRes = await getAllMarks(token);
      console.log('Get all marks:', allRes?.statusCode ?? allRes?.status);

      // 4) Update mark if created
      if (markId) {
        const upd = await updateMarks(token, markId);
        console.log('Update mark:', upd);

        const del = await deleteMarks(token, markId);
        console.log('Delete mark:', del);
      }

      // 5) Check /api/auth/me
      const meRes = await fetch(`${BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      const me = await meRes.json().catch(() => ({ success: false, status: meRes.status }));
      console.log('/api/auth/me:', me?.data?.user?.email ?? me);

    } catch (err) {
      console.error('Error for user', u.name, err);
    }
  }

  console.log('\nRBAC Extended Test Completed');
};

run();
