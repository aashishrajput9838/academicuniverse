import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

// Read the service account key directly
const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();

async function testFirestoreConnection() {
  try {
    console.log('Testing Firestore connection...');
    
    // Try to create a simple test document
    const testDocRef = db.collection('test_collection').doc('test_doc');
    
    await testDocRef.set({
      testField: 'testValue',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('Successfully wrote test document!');
    
    // Try to read it back
    const snapshot = await testDocRef.get();
    if (snapshot.exists) {
      console.log('Successfully read test document:', snapshot.data());
    }
    
    // Clean up the test document
    await testDocRef.delete();
    console.log('Cleaned up test document.');
    
    console.log('Firestore connection test completed successfully!');
  } catch (error) {
    console.error('Firestore connection test failed:', error);
    throw error;
  }
}

testFirestoreConnection()
  .then(() => {
    console.log('Test completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });