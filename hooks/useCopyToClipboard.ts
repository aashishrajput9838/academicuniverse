'use client';

import { useState, useCallback } from 'react';

/**
 * Reusable hook for copying text to clipboard with feedback state.
 * @param resetDelay - milliseconds before `copied` resets to false (default 2000)
 */
export function useCopyToClipboard(resetDelay: number = 2000) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), resetDelay);
      return true;
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      return false;
    }
  }, [resetDelay]);

  return { copied, copyToClipboard };
}
