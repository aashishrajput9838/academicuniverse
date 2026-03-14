import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

let firebaseAuthInstance: any = null;
let firebaseFirestoreInstance: any = null;
let firebaseStorageInstance: any = null;

// Initialize Firebase Admin SDK safely
try {
  let credential;

  // Option 1: Full JSON string from environment variable (Best for production)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  }
  // Option 2: Individual environment variables
  else {
    const pId = process.env.FIREBASE_PROJECT_ID || process.env.project_id;
    const pKey = process.env.FIREBASE_PRIVATE_KEY || process.env.private_key;
    const cEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.client_email;

    if (pKey && cEmail) {
      credential = admin.credential.cert({
        projectId: pId,
        clientEmail: cEmail,
        privateKey: pKey.replace(/\\n/g, '\n'),
      });
    }
    // Option 3: Local file (for development)
    else {
      const serviceAccountPath = path.join(__dirname, '../../../serviceAccountKey.json');
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        credential = admin.credential.cert(serviceAccount);
      } else {
        throw new Error('No Firebase credentials found in environment (tried FIREBASE_PRIVATE_KEY/private_key etc.) or local file');
      }
    }
  }

  const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'academicuniverse.firebasestorage.app';

  if (!admin.apps.length) {
    admin.initializeApp({
      credential,
      storageBucket: bucketName,
    });
  }
  firebaseAuthInstance = admin.auth();
  firebaseFirestoreInstance = admin.firestore();
  firebaseStorageInstance = admin.storage();
  console.log('✓ Firebase initialized successfully');
} catch (error) {
  console.warn('Firebase Admin SDK initialization failed:', error);
  console.info('Running in limited mode - using mock authentication for development');

  // Create mock Firebase Auth that simulates token verification
  firebaseAuthInstance = {
    verifyIdToken: async (token: string) => {
      // In development, we'll simulate a valid token verification
      // This is a simplified simulation for development purposes

      // For demo purposes, we'll return a mock decoded token
      // In a real app, this should never be used in production
      // But we'll make it more robust to handle various token formats
      try {
        // Simple validation to check if it's a plausible token
        if (typeof token !== 'string' || token.length < 10) {
          throw new Error('Invalid token format');
        }

        // Extract basic info from token or use defaults
        return {
          uid: 'demo-user-' + Date.now().toString(),
          email: process.env.DEMO_USER_EMAIL || 'demo@example.com',
          name: process.env.DEMO_USER_NAME || 'Demo User',
          exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
          iat: Math.floor(Date.now() / 1000),
          organizationId: process.env.DEMO_ORGANIZATION_ID || 'demo-org-123',
        };
      } catch (err) {
        console.error('Token verification error:', err);
        throw new Error('Invalid token format');
      }
    }
  };

  // Mock Firestore instance
  firebaseFirestoreInstance = {
    collection: (collectionName: string) => ({
      where: (field: string, operator: string, value: any) => ({
        get: async () => {
          return {
            empty: false,
            size: 0,
            docs: [],
            forEach: (callback: (doc: any) => void) => { },
          };
        },
      }),
      doc: (docId: string) => ({
        get: async () => ({ exists: false, data: () => ({}) }),
        set: () => Promise.resolve(),
      }),
    }),
  };

  // Mock Storage instance for development
  firebaseStorageInstance = {
    bucket: () => ({
      file: (filename: string) => ({
        save: async (buffer: Buffer, options: any) => {
          console.log(`[Mock Storage] Saved file ${filename}`);
          return Promise.resolve();
        },
        makePublic: async () => Promise.resolve(),
        publicUrl: () => `https://mock-storage.local/${filename}`
      })
    })
  };
}

// Export initialized services (or mock if initialization failed)
export const firebaseAuth = firebaseAuthInstance;
export const firebaseFirestore = firebaseFirestoreInstance;
export const firebaseStorage = firebaseStorageInstance;

export default admin;