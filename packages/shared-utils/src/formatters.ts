import { SCORE_GOOD_THRESHOLD, SCORE_OK_THRESHOLD } from '@/constants/app';

/**
 * Format a Date or ISO string into a human-readable locale date.
 */
export function formatDate(date: string | Date | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleDateString('en-IN', options ?? {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(date);
  }
}

/**
 * Format a Date or ISO string into a locale date+time string.
 */
export function formatDateTime(date: string | Date | undefined): string {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(date);
  }
}

/**
 * Returns Tailwind color class for a 0–100 score value.
 */
export function getScoreColorClass(score: number): string {
  if (score >= SCORE_GOOD_THRESHOLD) return 'text-emerald-400';
  if (score >= SCORE_OK_THRESHOLD) return 'text-amber-400';
  return 'text-red-400';
}

/**
 * Returns Tailwind background color class for a 0–100 score value.
 */
export function getScoreBgClass(score: number): string {
  if (score >= SCORE_GOOD_THRESHOLD) return 'bg-emerald-500/20 border-emerald-500/30';
  if (score >= SCORE_OK_THRESHOLD) return 'bg-amber-500/20 border-amber-500/30';
  return 'bg-red-500/20 border-red-500/30';
}

/**
 * Safely truncate a string to a maximum length.
 */
export function truncateText(text: string, maxLength: number, suffix: string = '…'): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + suffix;
}

/**
 * Capitalize the first letter of a string.
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
