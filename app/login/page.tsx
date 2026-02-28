'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const { user, signInWithGoogle, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const hasRedirected = useRef(false);

  const [postLoginRedirect, setPostLoginRedirect] = useState(false);
  
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithGoogle();
      // Set a flag to trigger redirect after successful login
      setPostLoginRedirect(true);
    } catch (err) {
      setError('Failed to sign in with Google. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle redirect after successful login or if already logged in
  useEffect(() => {
    if ((user && !authLoading) || postLoginRedirect) {
      // Wait a brief moment to ensure auth state is settled before redirecting
      const timer = setTimeout(() => {
        router.push('/');
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [user, authLoading, postLoginRedirect, router]);
  
  // Show redirecting message when redirect is triggered
  if ((user && !authLoading) || postLoginRedirect) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400 border-opacity-50 mx-auto mb-4" />
          <p className="text-white">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400 border-opacity-50" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 overflow-hidden relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Animated Gradient Orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Main Content */}
      <div className="relative min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Card Container */}
          <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-700 p-8 shadow-2xl">
            {/* Logo Section */}
            <div className="mb-8 text-center">
              <Link href="/" className="inline-block mb-4">
                <img
                  src="/new_logo_2.png"
                  alt="Sharda University"
                  className="h-12 w-auto mx-auto"
                />
              </Link>
              <h1 className="text-3xl font-bold text-white mb-2">
                Welcome Back
              </h1>
              <p className="text-slate-400">
                Sign in to unlock your academic growth potential
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-3 mb-4"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032 c0-3.331,2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.461,2.268,15.365,1,12.545,1 C6.986,1,2.573,5.413,2.573,11c0,5.587,4.413,10,10.972,10c6.3,0,10.852-4.864,10.852-11.425c0-0.996-0.109-1.795-0.805-2.539 H12.545z" />
              </svg>
              {loading ? 'Signing in...' : 'Continue with Google'}
            </button>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-800/80 text-slate-400">
                  or
                </span>
              </div>
            </div>

            {/* Email/Password Form (Optional Placeholder) */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-slate-300 font-medium text-sm mb-2">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  disabled
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2 text-slate-300 placeholder-slate-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium text-sm mb-2">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  disabled
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-2 text-slate-300 placeholder-slate-500 disabled:opacity-50"
                />
              </div>
              <button
                disabled
                className="w-full bg-slate-700/50 text-slate-400 font-semibold py-2 px-6 rounded-lg cursor-not-allowed opacity-50"
              >
                Sign in (Coming Soon)
              </button>
            </div>

            {/* Footer Links */}
            <div className="space-y-3 text-center text-sm">
              <p className="text-slate-400">
                Don't have an account?{' '}
                <Link
                  href="/login"
                  className="text-emerald-400 hover:text-emerald-300 font-semibold transition"
                >
                  Sign up
                </Link>
              </p>
              <p>
                <Link
                  href="/"
                  className="text-slate-400 hover:text-slate-300 transition"
                >
                  Back to home
                </Link>
              </p>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="bg-slate-800/40 rounded-lg p-4 border border-slate-700/50">
              <div className="text-2xl font-bold text-emerald-400">10K+</div>
              <div className="text-xs text-slate-400 mt-1">Students</div>
            </div>
            <div className="bg-slate-800/40 rounded-lg p-4 border border-slate-700/50">
              <div className="text-2xl font-bold text-emerald-400">500+</div>
              <div className="text-xs text-slate-400 mt-1">Faculty</div>
            </div>
            <div className="bg-slate-800/40 rounded-lg p-4 border border-slate-700/50">
              <div className="text-2xl font-bold text-emerald-400">95%</div>
              <div className="text-xs text-slate-400 mt-1">Growth Rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
