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
  organizationId?: string;
  role: string;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  backendUser: BackendUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmailAndPassword: (email: string, password: string) => Promise<void>;
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
        // Fetch the backend user data to restore the session
        try {
          const response = await fetch('http://localhost:5000/api/auth/me', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
          });

          if (response.ok) {
            const data = await response.json();
            setBackendUser(data.data);
          } else {
            // If token is invalid, clear it and log out the user
            console.error('Invalid token, logging out user');
            await signOut(auth);
            localStorage.removeItem('authToken');
            setBackendUser(null);
          }
        } catch (error) {
          console.error('Error fetching backend user data:', error);
          // Check if it's a network error vs a token error
          if (error instanceof TypeError && error.message.includes('fetch')) {
            // Network error - don't clear token, just set backend user to null temporarily
            console.warn('Network error, keeping token but showing as not fully authenticated');
          } else {
            // Other error (likely token invalid) - clear the token
            localStorage.removeItem('authToken');
            setBackendUser(null);
          }
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

      // Update the backend user state
      setBackendUser(data.data.user);
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
      // Clear the stored JWT token and reset state
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
      }
      setBackendUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const signInWithEmailAndPassword = async (email: string, password: string) => {
    try {
      setLoading(true);

      // Send email and password to backend for authentication
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
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

      // Store the backend JWT token in localStorage for API calls
      if (typeof window !== 'undefined') {
        localStorage.setItem('authToken', data.data.token);
      }

      // Update the backend user state
      setBackendUser(data.data.user);

      // Since we're using email/password login, we won't have a Firebase user
      // So we'll create a mock user object for the frontend
      const mockUser: User = {
        uid: data.data.id,
        email: data.data.email,
        displayName: data.data.name,
        photoURL: null,
        emailVerified: true,
        isAnonymous: false,
        metadata: {} as any,
        providerData: [],
        refreshToken: '',
        tenantId: null,
        phoneNumber: null,
        providerId: 'password',
        delete: async () => { },
        getIdToken: async () => data.data.token,
        getIdTokenResult: async () => ({
          token: data.data.token,
          expirationTime: new Date(Date.now() + 3600 * 1000).toISOString(),
          authTime: new Date().toISOString(),
          issuedAtTime: new Date().toISOString(),
          signInProvider: 'password',
          signInSecondFactor: null,
          claims: {}
        }),
        reload: async () => { },
        toJSON: () => ({}),
      };
      setUser(mockUser);
    } catch (error) {
      console.error('Error signing in with email and password:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, backendUser, loading, signInWithGoogle, signInWithEmailAndPassword, logout }}>
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
