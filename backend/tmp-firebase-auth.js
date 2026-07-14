const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const fetch = global.fetch || require('node-fetch');

dotenv.config({ path: path.join(__dirname, '../.env') });

const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
let credential;
if (fs.existsSync(serviceAccountPath)) {
  credential = require(serviceAccountPath);
} else {
  const pId = process.env.FIREBASE_PROJECT_ID || process.env.project_id;
  const pKey = process.env.FIREBASE_PRIVATE_KEY || process.env.private_key;
  const cEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.client_email;
  credential = { projectId: pId, privateKey: pKey.replace(/\\n/g, '\n'), clientEmail: cEmail };
}

admin.initializeApp({ credential: admin.credential.cert(credential) });

const firebaseApiKey = 'AIzaSyB-3AiaySXOhTEaC0NWKr67-LntmXDK45Y';
const uid = '3pxGBpiDrxWarUJrKqQYc1NhJok1';

(async () => {
  try {
    const customToken = await admin.auth().createCustomToken(uid);
    console.log('customToken:', customToken.slice(0, 40) + '...');
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${firebaseApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    });
    const json = await response.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error(err);
  }
})();
