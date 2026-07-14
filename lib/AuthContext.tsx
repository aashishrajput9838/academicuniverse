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
  backendToken: string | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmailAndPassword: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:10000';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [backendUser, setBackendUser] = useState<any | null>(null);
  const [backendToken, setBackendToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const auth = getFirebaseAuth();

  useEffect(() => {
    const exchangeToken = async (currentUser: User) => {
      try {
        const idToken = await currentUser.getIdToken(true); // Force refresh to be safe

        // Send the Firebase ID token to our backend to exchange for a JWT token
        const response = await fetch(`${API_BASE_URL}/api/auth/firebase-login`, {
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
          return false;
        }

        if (response.ok) {
          const data = await response.json();
          // Store the backend JWT token in localStorage for API calls
          if (typeof window !== 'undefined') {
            localStorage.setItem('authToken', data.data.token);
          }
          setBackendToken(data.data.token);
          // Update the backend user state
          setBackendUser(data.data.user);
          return true;
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          console.error('Failed to authenticate with backend:', errorData.message);
          return false;
        }
      } catch (error) {
        console.error('Error exchanging Firebase token for backend token:', error);
        return false;
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(true);

      if (currentUser) {
        const storedToken = localStorage.getItem('authToken');
        
        if (!storedToken) {
          // No token, need to exchange
          await exchangeToken(currentUser);
          setLoading(false);
        } else {
          // Have token, verify it
          try {
            const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${storedToken}`
              },
            });

            if (response.ok) {
              const data = await response.json();
              setBackendUser(data.data);
              setBackendToken(storedToken);
              setAuthError(null);
              setLoading(false);
            } else {
              // Token invalid, try to re-exchange instead of logging out immediately
              console.warn('Backend token invalid, attempting to refresh using Firebase session...');
              const success = await exchangeToken(currentUser);
              
              if (!success) {
                console.error('Failed to refresh backend token, logging out');
                await signOut(auth);
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('authToken');
                }
                setBackendToken(null);
                setBackendUser(null);
                setUser(null);
                setAuthError('Session expired. Please sign in again.');
              }
              setLoading(false);
            }
          } catch (error) {
            console.error('Error fetching backend user data:', error);
            if (error instanceof TypeError && error.message.includes('fetch')) {
              setAuthError('Unable to connect to the backend. Please ensure it is running on localhost:5000.');
            } else {
              // For other errors, try to refresh once before giving up
              const success = await exchangeToken(currentUser);
              if (!success) {
                localStorage.removeItem('authToken');
                setBackendUser(null);
                setAuthError('Unexpected authentication error. Please refresh the page.');
              }
            }
            setLoading(false);
          }
        }
      } else {
        // No Firebase user
        const storedToken = localStorage.getItem('authToken');
        if (storedToken) {
          // Might be a custom login (no Firebase)
          try {
            const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${storedToken}`
              },
            });

            if (response.ok) {
              const data = await response.json();
              setBackendUser(data.data);
              setBackendToken(storedToken);
              setAuthError(null);
              
              // Mock user for UI consistency; do not treat backend JWT as Firebase ID token.
              const mockUser: any = {
                uid: data.data.id,
                email: data.data.email,
                displayName: data.data.name,
                photoURL: null,
                emailVerified: true,
                getIdToken: async () => {
                  throw new Error('Backend JWT is not a Firebase ID token');
                },
              };
              setUser(mockUser);
            } else {
              console.error('Invalid custom token, clearing session');
              localStorage.removeItem('authToken');
              setBackendToken(null);
              setBackendUser(null);
              setUser(null);
            }
          } catch (error) {
            console.error('Error restoring custom session:', error);
            if (typeof window !== 'undefined') {
              localStorage.removeItem('authToken');
            }
            setBackendToken(null);
            setBackendUser(null);
            setUser(null);
          }
        } else {
          // Truly logged out
          setBackendToken(null);
          setBackendUser(null);
          setUser(null);
          setAuthError(null);
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  const signInWithGoogle = async () => {
    try {
      setAuthError(null);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      // For redirect, we need to handle the callback separately
      // So we'll just use popup for now to keep it simple
      const result = await signInWithPopup(auth, provider);

      // Get the Firebase ID token to send to our backend
      const idToken = await result.user.getIdToken();

      // Send the Firebase ID token to our backend to exchange for a JWT token
      const response = await fetch(`${API_BASE_URL}/api/auth/firebase-login`, {
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
      setBackendToken(data.data.token);

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
      setBackendToken(null);
      setBackendUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const signInWithEmailAndPassword = async (email: string, password: string) => {
    try {
      setLoading(true);
      setAuthError(null);

      // Send email and password to backend for authentication
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
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
      setBackendToken(data.data.token);

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
        getIdToken: async () => {
          throw new Error('Backend JWT is not a Firebase ID token');
        },
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
      setAuthError((error as Error)?.message || 'Authentication failed.');
      console.error('Error signing in with email and password:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider value={{ user, backendUser, backendToken, loading, authError, clearAuthError, signInWithGoogle, signInWithEmailAndPassword, logout }}>
      <div className="relative">
        {authError && (
          <div className="fixed inset-x-0 top-0 z-50 bg-amber-500 text-slate-950 shadow-xl">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm sm:text-base">
                <span className="font-semibold">Connection issue:</span>
                <span>{authError}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={clearAuthError}
                  className="rounded-lg border border-slate-950 bg-white/10 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white/20"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
        {children}
      </div>
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
