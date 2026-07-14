const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const fetch = global.fetch || require('node-fetch');

const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('Service account file missing at', serviceAccountPath);
  process.exit(1);
}
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const firebaseApiKey = 'AIzaSyB-3AiaySXOhTEaC0NWKr67-LntmXDK45Y';
const uid = '3pxGBpiRHJw2ck2Wjtci1NhJok1';

(async () => {
  try {
    const customToken = await admin.auth().createCustomToken(uid);
    console.log('customToken generated (length):', customToken.length);
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${firebaseApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    });
    const json = await response.json();
    console.log(JSON.stringify(json, null, 2));
    if (json.idToken) {
      const header = JSON.parse(Buffer.from(json.idToken.split('.')[0], 'base64').toString('utf8'));
      console.log('idToken header', header);
    }
  } catch (err) {
    console.error(err);
  }
})();
