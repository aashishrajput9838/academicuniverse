'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface UseGitHubOAuthOptions {
  backendToken?: string | null;
  onConnected?: () => Promise<void> | void;
}

interface UseGitHubOAuthReturn {
  connect: () => Promise<void>;
  triggerDirectConnect: (customUsername?: string) => Promise<void>;
  exchangeCode: (code: string, state: string) => Promise<void>;
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

  const triggerDirectConnect = useCallback(async (customUsername?: string) => {
    if (!backendToken) return;
    setConnecting(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/github/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${backendToken}`,
        },
        body: JSON.stringify({ mode: 'direct', username: customUsername }),
      });
      const data = await response.json();
      if (data?.success) {
        setConnecting(false);
        await onConnected?.();
      } else {
        throw new Error(data?.message || 'Direct GitHub sync failed');
      }
    } catch (err: any) {
      console.error('Direct GitHub sync error:', err);
      setError(err.message || 'Direct sync failed');
      setConnecting(false);
    }
  }, [backendToken, onConnected]);

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
      if (data?.success && data?.data?.connected) {
        setConnecting(false);
        await onConnected?.();
      } else if (data?.success && data?.data?.authUrl) {
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
          // If popup blocked, auto-fallback to direct sync
          await triggerDirectConnect();
        } else {
          let codeHandled = false;
          pollTimerRef.current = setInterval(async () => {
            if (codeHandled) return;

            // Attempt to inspect popup URL for code and state
            try {
              if (popup && !popup.closed) {
                let currentHref = '';
                try {
                  currentHref = popup.location.href;
                } catch (e) {
                  // Cross-origin restriction while on github.com
                }

                if (currentHref && currentHref.includes('code=')) {
                  const urlObj = new URL(currentHref);
                  const codeParam = urlObj.searchParams.get('code');
                  const stateParam = urlObj.searchParams.get('state');

                  if (codeParam && stateParam) {
                    codeHandled = true;
                    clearInterval(pollTimerRef.current!);
                    pollTimerRef.current = null;
                    try { popup.close(); } catch (e) {}

                    await fetch(`${API_BASE_URL}/api/github/callback?code=${encodeURIComponent(codeParam)}&state=${encodeURIComponent(stateParam)}`, {
                      method: 'GET',
                      headers: { 'Authorization': `Bearer ${backendToken}` }
                    }).catch(() => null);

                    setConnecting(false);
                    await onConnected?.();
                    return;
                  }
                }
              }
            } catch (err) {
              // Ignore popup read error
            }

            if (popup.closed) {
              clearInterval(pollTimerRef.current!);
              pollTimerRef.current = null;
              if (!codeHandled) {
                await triggerDirectConnect();
              }
            }
          }, 600);
        }
      } else {
        await triggerDirectConnect();
      }
    } catch (err) {
      console.error('GitHub connect error:', err);
      await triggerDirectConnect();
    }
  }, [backendToken, onConnected, triggerDirectConnect]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current!);
      }
    };
  }, []);

  const exchangeCode = useCallback(async (codeParam: string, stateParam: string) => {
    if (!backendToken) return;
    setConnecting(true);
    setError(null);
    try {
      await fetch(`${API_BASE_URL}/api/github/callback?code=${encodeURIComponent(codeParam)}&state=${encodeURIComponent(stateParam)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${backendToken}`,
        },
      });
      setConnecting(false);
      await onConnected?.();
    } catch (err: any) {
      console.error('Exchange code error:', err);
      setError(err.message || 'Failed to exchange authorization code');
      setConnecting(false);
    }
  }, [backendToken, onConnected]);

  return { connect, triggerDirectConnect, exchangeCode, connecting, error };
}
