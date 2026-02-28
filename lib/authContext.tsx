'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  signOut,
  User,
  onAuthStateChanged,
} from 'firebase/auth';
import { getFirebaseAuth } from './firebase';

interface BackendUser {
  id: string;
  name: string;
  email: string;
  organization: string;
  role: string;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  backendUser: BackendUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [backendUser, setBackendUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = getFirebaseAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(true); // Set loading to true when auth state changes
      
      // If user is authenticated and we haven't exchanged the token yet,
      // try to exchange the Firebase token for a backend JWT token
      if (currentUser && !localStorage.getItem('authToken')) {
        try {
          const idToken = await currentUser.getIdToken();
          
          // Send the Firebase ID token to our backend to exchange for a JWT token
          const response = await fetch('http://localhost:5000/api/auth/firebase-login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idToken }),
          });
          
          // Check if response is actually HTML (error page)
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            console.error('Backend server is not running or route not found');
            setLoading(false);
            return;
          }
          
          if (response.ok) {
            const data = await response.json();
            // Store the backend JWT token in localStorage for API calls
            if (typeof window !== 'undefined') {
              localStorage.setItem('authToken', data.data.token);
            }
            // Update the backend user state
            setBackendUser(data.data.user);
          } else {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            console.error('Failed to authenticate with backend:', errorData.message);
            // If the backend rejected the token (e.g., unauthorized email), clear the Firebase auth
            if (response.status === 401) {
              await signOut(auth);
              localStorage.removeItem('authToken');
            }
          }
        } catch (error) {
          console.error('Error exchanging Firebase token for backend token:', error);
        } finally {
          setLoading(false); // Always set loading to false after attempt
        }
      } else if (currentUser && localStorage.getItem('authToken')) {
        // If user is authenticated and we already have a stored token
        try {
          // For now, we'll just set a basic backend user object
          // In a real app, you'd make an API call to get the full user info
          setBackendUser({
            id: currentUser.uid,
            name: currentUser.displayName || 'User',
            email: currentUser.email || '',
            role: 'STUDENT', // Default role, would be fetched from backend
            organization: 'default',
            permissions: []
          });
        } catch (error) {
          console.error('Error setting backend user:', error);
        } finally {
          setLoading(false);
        }
      } else if (!currentUser) {
        // If user is not authenticated, clear the stored token
        localStorage.removeItem('authToken');
        setBackendUser(null);
        setLoading(false);
      } else {
        setLoading(false); // Fallback to ensure loading is false
      }
    });

    return () => unsubscribe();
  }, [auth]);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      // For redirect, we need to handle the callback separately
      // So we'll just use popup for now to keep it simple
      const result = await signInWithPopup(auth, provider);
      
      // Get the Firebase ID token to send to our backend
      const idToken = await result.user.getIdToken();
      
      // Send the Firebase ID token to our backend to exchange for a JWT token
      const response = await fetch('http://localhost:5000/api/auth/firebase-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });
      
      // Check if response is actually HTML (error page)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Backend server is not running or route not found. Please start the backend server.');
      }
      
      if (!response.ok) {
        // Try to parse error response as JSON
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          // If we can't parse as JSON, get text content
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        throw new Error(errorData.message || 'Failed to authenticate with backend');
      }
      
      const data = await response.json();
      
      // Store the backend JWT token in localStorage/sessionStorage for API calls
      if (typeof window !== 'undefined') {
        localStorage.setItem('authToken', data.data.token);
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      // Handle specific Firebase auth errors
      if ((error as any).code === 'auth/popup-blocked' || (error as any).code === 'auth/cancelled-popup-request') {
        // If popup is blocked, fallback to redirect
        // For redirect, we'll need to handle the result in the onAuthStateChanged listener
        try {
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          await signInWithRedirect(auth, provider);
        } catch (redirectError) {
          console.error('Error with redirect fallback:', redirectError);
          throw redirectError;
        }
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // Clear the stored JWT token
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
      }
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, backendUser, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
