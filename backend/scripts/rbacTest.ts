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
  console.error('[rbacTest] ERROR: Set TEST_SUPER_EMAIL/PASS, TEST_ADMIN_EMAIL/PASS, TEST_FACULTY_EMAIL/PASS, TEST_STUDENT_EMAIL/PASS env vars before running this script.');
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
  const text = await res.text();
  return { status: res.status, body: text };
};

const run = async () => {
  for (const u of users) {
    try {
      console.log(`\n--- Testing user: ${u.name} (${u.creds.email})`);
      const loginRes = await login(u.creds);
      if (!loginRes || !loginRes.success) {
        console.log('Login failed:', loginRes);
        continue;
      }

      const token = loginRes.data.token;
      console.log('Permissions:', loginRes.data.user.permissions || []);

      const addRes = await addMarks(token);
      console.log('Add marks response status:', addRes.status);
      console.log('Body:', addRes.body);
    } catch (err) {
      console.error('Error testing user', u.name, err);
    }
  }
};

run();
