const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

async function testBucket(bucketName) {
  try {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    const bucket = admin.storage().bucket(bucketName);
    const file = bucket.file('test.txt');
    await file.save('Hello World');
    console.log('SUCCESS with bucket:', bucketName);
    await file.delete();
    return true;
  } catch (err) {
    console.error(`FAILED with bucket ${bucketName}:`, err.message);
    return false;
  }
}

async function run() {
  const b1 = 'academicuniverse.firebasestorage.app';
  const b2 = 'academicuniverse.appspot.com';
  
  console.log('Testing', b1);
  const res1 = await testBucket(b1);
  
  if (!res1) {
    console.log('\nTesting', b2);
    await testBucket(b2);
  }
  process.exit(0);
}

run();
