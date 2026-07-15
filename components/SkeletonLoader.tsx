import React from 'react';

/**
 * SkeletonLoader – reusable placeholder UI while data is loading.
 * Uses TailwindCSS `animate-pulse` to create a subtle shimmer effect.
 * Accepts `rows` (number of lines) and optional `className` for custom sizing.
 */
export const SkeletonLoader: React.FC<{ rows?: number; className?: string }> = ({ rows = 1, className }) => {
  const lineHeight = 'h-4'; // Tailwind height for a line
  const lineSpacing = 'mb-2'; // spacing between lines
  return (
    <div className={`animate-pulse space-y-2 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`${lineHeight} bg-gray-300 rounded ${lineSpacing}`} />
      ))}
    </div>
  );
};
