'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface UseGitHubOAuthOptions {
  backendToken?: string | null;
  onConnected?: () => Promise<void> | void;
}

interface UseGitHubOAuthReturn {
  connect: () => Promise<void>;
  connecting: boolean;
  error: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

export function useGitHubOAuth({ backendToken, onConnected }: UseGitHubOAuthOptions): UseGitHubOAuthReturn {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'GITHUB_CONNECTED') {
        setConnecting(false);
        try {
          await onConnected?.();
        } catch (err) {
          console.error('GitHub onConnected error:', err);
        }
      } else if (event.data?.type === 'GITHUB_CONNECT_ERROR') {
        console.error('GitHub connection error:', event.data.error);
        setConnecting(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onConnected]);

  useEffect(() => {
    if (!backendToken) {
      setConnecting(false);
    }
  }, [backendToken]);

  const connect = useCallback(async () => {
    if (!backendToken) return;

    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    setConnecting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/github/connect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${backendToken}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to initiate GitHub OAuth');
      }

      const data = await response.json();
      if (data?.success && data?.data?.authUrl) {
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const popup = window.open(
          data.data.authUrl,
          'GitHub OAuth',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!popup) {
          setError('Popup was blocked. Please allow popups for this site.');
          setConnecting(false);
        } else {
          pollTimerRef.current = setInterval(() => {
            if (popup.closed) {
              clearInterval(pollTimerRef.current!);
              pollTimerRef.current = null;
              setConnecting(false);
            }
          }, 500);
        }
      } else {
        setConnecting(false);
      }
    } catch (err) {
      console.error('GitHub connect error:', err);
      setError(err instanceof Error ? err.message : 'GitHub connection error');
      setConnecting(false);
    }
  }, [backendToken]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current!);
      }
    };
  }, []);

  return { connect, connecting, error };
}
