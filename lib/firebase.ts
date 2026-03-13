import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB-3AiaySXOhTEaC0NWKr67-LntmXDK45Y",
  authDomain: "academicuniverse.firebaseapp.com",
  projectId: "academicuniverse",
  storageBucket: "academicuniverse.firebasestorage.app",
  messagingSenderId: "851768640115",
  appId: "1:851768640115:web:463edefc819a483f7aa006",
  measurementId: "G-BGFLH3LMTT",
};

export const firebaseApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

export const isBrowser = typeof window !== "undefined";

export function getFirebaseAuth() {
  return getAuth(firebaseApp);
}

export async function safeGetAnalytics() {
  if (!isBrowser) return null;
  try {
    const analyticsModule = await import("firebase/analytics");
    // Only attempt to initialize if we have a measurementId and are not in a limited network
    if (firebaseConfig.measurementId) {
      return analyticsModule.getAnalytics(firebaseApp);
    }
    return null;
  } catch (e) {
    // Silence analytics errors as they are non-blocking
    return null;
  }
}

export default firebaseConfig;
