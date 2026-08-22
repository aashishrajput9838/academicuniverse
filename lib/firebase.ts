import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const firebaseApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

export const isBrowser = typeof window !== "undefined";

// Initialize Firestore with experimentalForceLongPolling to prevent QUIC_NETWORK_IDLE_TIMEOUT errors
// which often happen in restricted network environments or due to browser issues.
export const db = isBrowser 
  ? initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
    })
  : getFirestore(firebaseApp);

export function getFirebaseAuth() {
  return getAuth(firebaseApp);
}

export async function safeGetAnalytics() {
  if (!isBrowser) return null;
  try {
    const analyticsModule = await import("firebase/analytics");
    // Only attempt to initialize if we have a measurementId and are not in a limited network
    if ((firebaseConfig as any).measurementId) {
      return analyticsModule.getAnalytics(firebaseApp);
    }
    return null;
  } catch (e) {
    // Silence analytics errors as they are non-blocking
    return null;
  }
}

export default firebaseConfig;
