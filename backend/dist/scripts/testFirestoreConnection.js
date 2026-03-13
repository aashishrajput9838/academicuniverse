"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Read the service account key directly
const serviceAccountPath = path_1.default.join(__dirname, '../../serviceAccountKey.json.json');
const serviceAccount = JSON.parse(fs_1.default.readFileSync(serviceAccountPath, 'utf8'));
// Initialize Firebase Admin SDK
if (firebase_admin_1.default.apps.length === 0) {
    firebase_admin_1.default.initializeApp({
        credential: firebase_admin_1.default.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
    });
}
const db = firebase_admin_1.default.firestore();
async function testFirestoreConnection() {
    try {
        console.log('Testing Firestore connection...');
        // Try to create a simple test document
        const testDocRef = db.collection('test_collection').doc('test_doc');
        await testDocRef.set({
            testField: 'testValue',
            timestamp: firebase_admin_1.default.firestore.FieldValue.serverTimestamp()
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
    }
    catch (error) {
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
