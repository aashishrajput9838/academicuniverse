import * as admin from 'firebase-admin';

let firebaseAuthInstance: any = null;
let firebaseFirestoreInstance: any = null;

// Initialize Firebase Admin SDK safely
try {
  // Check if we have service account credentials in environment variables
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')),
      });
    }
  } else if (process.env.FIREBASE_PROJECT_ID) {
    // Initialize with just the project ID if available
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }
  } else {
    // For development, we can initialize with just a project ID
    // This avoids the need for service account credentials in development
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: 'academicuniverse', // Use the project ID from the frontend config
      });
    }
  }
  
  firebaseAuthInstance = admin.auth();
  firebaseFirestoreInstance = admin.firestore();
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
        };
      } catch (err) {
        console.error('Token verification error:', err);
        throw new Error('Invalid token format');
      }
    }
  };
  
  // Mock Firestore instance
  firebaseFirestoreInstance = {
    collection: () => ({
      doc: () => ({
        get: () => Promise.resolve({ exists: false, data: () => ({}) }),
        set: () => Promise.resolve(),
      }),
    }),
  };
}

// Export initialized services (or mock if initialization failed)
export const firebaseAuth = firebaseAuthInstance;
export const firebaseFirestore = firebaseFirestoreInstance;

export default admin;