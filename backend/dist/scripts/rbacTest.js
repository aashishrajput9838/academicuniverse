"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = __importDefault(require("node-fetch"));
const BASE = process.env.BASE_URL || 'http://localhost:5000';
const users = [
    { name: 'super', creds: { email: 'superadmin@academicuniverse.com', password: 'SuperAdmin123' } },
    { name: 'admin', creds: { email: 'admin@sharda.com', password: 'Admin123456' } },
    { name: 'faculty', creds: { email: 'jane.smith@sharda.com', password: 'Faculty123' } },
    { name: 'student', creds: { email: 'john.doe@sharda.com', password: 'Student123' } },
];
const login = async (creds) => {
    const res = await (0, node_fetch_1.default)(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds),
    });
    return res.json();
};
const addMarks = async (token) => {
    const res = await (0, node_fetch_1.default)(`${BASE}/api/marks`, {
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
        }
        catch (err) {
            console.error('Error testing user', u.name, err);
        }
    }
};
run();
