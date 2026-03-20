'use client'; // Error components must be Client Components

import { useEffect, useRef } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Use a ref to ensure we only send the same error once per mount
  const hasSentError = useRef(false);

  useEffect(() => {
    // Log the error to our AI Log Analyzer backend proxy
    const sendErrorToAI = async () => {
        if (hasSentError.current) return;
        
        try {
            // We use the same API base URL logic that the rest of the Academic Universe Next.js app uses
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';
            
            await fetch(`${API_BASE_URL}/logs/frontend`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    route: window.location.pathname,
                    message: error.message || 'Unknown React Error',
                    stack: error.stack
                })
            });
            hasSentError.current = true;
        } catch(err) {
            // Silently fail if telemetry cannot be sent
            console.error('Failed to dispatch error telemetry', err);
        }
    };
    
    sendErrorToAI();
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-200 p-4">
      <div className="bg-slate-800/80 border border-slate-700/50 backdrop-blur-md rounded-2xl p-8 max-w-lg shadow-2xl text-center">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Something went wrong</h2>
        <p className="text-slate-400 mb-8 leading-relaxed">
            An unexpected error occurred in your browser. Our AI Error System has automatically captured the exact crash trace and reported it to the developers.
        </p>
        <button
          className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:scale-105 active:scale-95 rounded-xl text-white font-medium transition-all shadow-lg shadow-emerald-500/20"
          onClick={() => reset()}
        >
          Try recovering page
        </button>
      </div>
    </div>
  );
}
