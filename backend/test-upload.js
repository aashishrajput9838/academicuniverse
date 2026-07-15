const fs = require('fs');
const jwt = require('jsonwebtoken');

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';
const token = jwt.sign({
  userId: '64d2b2f6f59c2a001d9f8a12',
  email: 'test@example.com',
  organizationId: '64d2b2f6f59c2a001d9f8a13',
  roleId: '64d2b2f6f59c2a001d9f8a14',
  permissions: [],
  isSuperAdmin: false
}, JWT_SECRET, { expiresIn: '1h' });

console.log('Generated token:', token);

fs.writeFileSync('dummy.pdf', 'dummy content for pdf upload test');

const fileBlob = new Blob([fs.readFileSync('dummy.pdf')], { type: 'application/pdf' });
const formData = new FormData();
formData.append('file', fileBlob, 'dummy.pdf');

fetch('http://localhost:3000/api/uaip/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
})
.then(async (res) => {
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', text);
})
.catch(console.error);
