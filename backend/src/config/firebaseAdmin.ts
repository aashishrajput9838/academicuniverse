import * as admin from 'firebase-admin';
import { Request, Response, NextFunction } from 'express';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  // In a real application, you would load these from environment variables
  // For this example, we'll use the service account configuration
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (error) {
    console.warn('Firebase Admin SDK initialization warning:', error);
    // If application default credentials fail, try to initialize without credentials
    // This allows the SDK to work in environments where it can auto-detect credentials
    admin.initializeApp();
  }
}

// Export initialized services
export const firebaseAuth = admin.auth();
export const firebaseFirestore = admin.firestore();

export default admin;