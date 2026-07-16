'use client';

import { useEffect } from 'react';

export function useModuleRefresh(moduleIds: string[], onRefresh: () => void) {
  useEffect(() => {
    if (moduleIds.length === 0) return;

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ modules: string[] }>;
      if (customEvent.detail?.modules?.some((m: string) => moduleIds.includes(m))) {
        onRefresh();
      }
    };

    window.addEventListener('au-module-updated', handler);
    return () => window.removeEventListener('au-module-updated', handler);
  }, [moduleIds, onRefresh]);
}
