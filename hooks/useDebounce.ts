'use client';

import { useState, useEffect } from 'react';

/**
 * Debounces a value by the given delay.
 * @param value - Value to debounce
 * @param delay - Milliseconds to wait before updating (default 300)
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
