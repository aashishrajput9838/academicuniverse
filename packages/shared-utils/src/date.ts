/**
 * Date Normalization Utility
 *
 * All date parsing and formatting across Frontend and Backend.
 */

export type DateInput = string | number | Date | null | undefined;

export interface NormalizedDate {
  iso: string | null;
  isoDateTime: string | null;
  isValid: boolean;
  raw: string | number | Date | null | undefined;
}

function parseNumericDate(value: number): NormalizedDate {
  let date: Date;
  if (value > 1000000000 && value < 9999999999) {
    if (value < 50000) {
      date = new Date((value - 1) * 86400 * 1000 + Date.UTC(1899, 11, 30));
    } else {
      date = new Date(value * 1000);
    }
  } else if (value > 1000000000000 && value < 9999999999999) {
    date = new Date(value);
  } else {
    date = new Date((value - 1) * 86400 * 1000 + Date.UTC(1899, 11, 30));
  }

  if (isNaN(date.getTime())) {
    console.warn('[DateNormalizer] Invalid numeric date received', { raw: value });
    return { iso: null, isoDateTime: null, isValid: false, raw: value };
  }
  return {
    iso: date.toISOString().split('T')[0],
    isoDateTime: date.toISOString(),
    isValid: true,
    raw: value,
  };
}

function tryParseDateString(trimmed: string): NormalizedDate | null {
  const raw = trimmed;

  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?(?:Z|[+-]\d{2}:?\d{2})?))?$/);
  if (isoMatch) {
    const datePart = isoMatch[1];
    const timePart = isoMatch[2] || '00:00:00.000Z';
    const isoDateTime = `${datePart}T${timePart}`;
    const date = new Date(isoDateTime);
    if (!isNaN(date.getTime())) {
      return { iso: datePart, isoDateTime: date.toISOString(), isValid: true, raw };
    }
  }

  const rfcMatch = trimmed.match(/^([A-Z][a-z]{2},\s)?(\d{1,2})\s+([A-Z][a-z]{2})\s+(\d{4})/i);
  if (rfcMatch) {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return {
        iso: date.toISOString().split('T')[0],
        isoDateTime: date.toISOString(),
        isValid: true,
        raw,
      };
    }
  }

  const monthNameMatch = trimmed.match(/^([A-Z][a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (monthNameMatch) {
    const monthName = monthNameMatch[1];
    const day = parseInt(monthNameMatch[2], 10);
    const year = parseInt(monthNameMatch[3], 10);

    const monthMap: Record<string, number> = {
      january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
      jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8,
      oct: 9, nov: 10, dec: 11,
    };

    const monthIndex = monthMap[monthName.toLowerCase()];
    if (monthIndex !== undefined) {
      const date = new Date(Date.UTC(year, monthIndex, day));
      if (!isNaN(date.getTime())) {
        return {
          iso: `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          isoDateTime: date.toISOString(),
          isValid: true,
          raw,
        };
      }
    }
  }

  const dayNameMatch = trimmed.match(/^[A-Z][a-z]+,\s+([A-Z][a-z]+\s+\d{1,2},\s+\d{4})$/i);
  if (dayNameMatch) {
    const inner = dayNameMatch[1];
    const innerMatch = inner.match(/^([A-Z][a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/i);
    if (innerMatch) {
      const monthName = innerMatch[1];
      const day = parseInt(innerMatch[2], 10);
      const year = parseInt(innerMatch[3], 10);

      const monthMap: Record<string, number> = {
        january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
        july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
        jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8,
        oct: 9, nov: 10, dec: 11,
      };

      const monthIndex = monthMap[monthName.toLowerCase()];
      if (monthIndex !== undefined) {
        const date = new Date(Date.UTC(year, monthIndex, day));
        if (!isNaN(date.getTime())) {
          return {
            iso: `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
            isoDateTime: date.toISOString(),
            isValid: true,
            raw,
          };
        }
      }
    }
  }

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const first = parseInt(slashMatch[1], 10);
    const second = parseInt(slashMatch[2], 10);
    const year = parseInt(slashMatch[3], 10);

    if (first > 12) {
      const date = new Date(`${year}-${String(second).padStart(2, '0')}-${String(first).padStart(2, '0')}`);
      if (!isNaN(date.getTime())) {
        return {
          iso: `${year}-${String(second).padStart(2, '0')}-${String(first).padStart(2, '0')}`,
          isoDateTime: date.toISOString(),
          isValid: true,
          raw,
        };
      }
    } else if (second > 12) {
      const date = new Date(`${year}-${String(first).padStart(2, '0')}-${String(second).padStart(2, '0')}`);
      if (!isNaN(date.getTime())) {
        return {
          iso: `${year}-${String(first).padStart(2, '0')}-${String(second).padStart(2, '0')}`,
          isoDateTime: date.toISOString(),
          isValid: true,
          raw,
        };
      }
    } else {
      const dateDDMM = new Date(`${year}-${String(second).padStart(2, '0')}-${String(first).padStart(2, '0')}`);
      if (!isNaN(dateDDMM.getTime())) {
        return {
          iso: `${year}-${String(second).padStart(2, '0')}-${String(first).padStart(2, '0')}`,
          isoDateTime: dateDDMM.toISOString(),
          isValid: true,
          raw,
        };
      }
      const dateMMDD = new Date(`${year}-${String(first).padStart(2, '0')}-${String(second).padStart(2, '0')}`);
      if (!isNaN(dateMMDD.getTime())) {
        return {
          iso: `${year}-${String(first).padStart(2, '0')}-${String(second).padStart(2, '0')}`,
          isoDateTime: dateMMDD.toISOString(),
          isValid: true,
          raw,
        };
      }
    }
  }

  const dashMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const first = parseInt(dashMatch[1], 10);
    const second = parseInt(dashMatch[2], 10);
    const year = parseInt(dashMatch[3], 10);

    if (first > 12) {
      const date = new Date(`${year}-${String(second).padStart(2, '0')}-${String(first).padStart(2, '0')}`);
      if (!isNaN(date.getTime())) {
        return {
          iso: `${year}-${String(second).padStart(2, '0')}-${String(first).padStart(2, '0')}`,
          isoDateTime: date.toISOString(),
          isValid: true,
          raw,
        };
      }
    } else {
      const date = new Date(`${year}-${String(first).padStart(2, '0')}-${String(second).padStart(2, '0')}`);
      if (!isNaN(date.getTime())) {
        return {
          iso: `${year}-${String(first).padStart(2, '0')}-${String(second).padStart(2, '0')}`,
          isoDateTime: date.toISOString(),
          isValid: true,
          raw,
        };
      }
    }
  }

  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return {
      iso: date.toISOString().split('T')[0],
      isoDateTime: date.toISOString(),
      isValid: true,
      raw,
    };
  }

  return null;
}

export function normalizeDate(value: DateInput): NormalizedDate {
  if (value === null || value === undefined || value === '') {
    return { iso: null, isoDateTime: null, isValid: false, raw: value };
  }

  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      console.warn('[DateNormalizer] Invalid Date object received', { raw: value });
      return { iso: null, isoDateTime: null, isValid: false, raw: value };
    }

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    const seconds = String(value.getSeconds()).padStart(2, '0');
    const ms = String(value.getMilliseconds()).padStart(3, '0');

    return {
      iso: `${year}-${month}-${day}`,
      isoDateTime: `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}`,
      isValid: true,
      raw: value,
    };
  }

  if (typeof value === 'number') {
    return parseNumericDate(value);
  }

  if (typeof value !== 'string') {
    console.warn('[DateNormalizer] Unsupported date type', { raw: value, type: typeof value });
    return { iso: null, isoDateTime: null, isValid: false, raw: value };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { iso: null, isoDateTime: null, isValid: false, raw: value };
  }

  const parsed = tryParseDateString(trimmed);
  if (parsed) return parsed;

  console.warn('[DateNormalizer] Unable to normalize date', { raw: value });
  return { iso: null, isoDateTime: null, isValid: false, raw: value };
}

export function normalizeScheduleDates(schedule: any[]): any[] {
  if (!Array.isArray(schedule)) return schedule;

  return schedule.map((day, dayIndex) => {
    if (!day || typeof day !== 'object') return day;

    const normalizedDay = { ...day };

    if (day.date !== undefined && day.date !== null) {
      const normalized = normalizeDate(day.date);
      if (normalized.isValid) {
        normalizedDay.date = normalized.iso;
      } else {
        normalizedDay.date = normalized.raw ?? 'Unknown Date';
      }
    }

    if (Array.isArray(day.events)) {
      normalizedDay.events = day.events.map((event: any, eventIndex: number) => {
        if (!event || typeof event !== 'object') return event;

        const normalizedEvent = { ...event };

        const dateFields = ['date', 'startDate', 'endDate', 'examDate', 'submissionDate'];
        for (const field of dateFields) {
          if (event[field] !== undefined && event[field] !== null) {
            const normalized = normalizeDate(event[field]);
            if (normalized.isValid) {
              normalizedEvent[field] = normalized.iso;
            } else {
              normalizedEvent[field] = normalized.raw ?? 'Unknown Date';
            }
          }
        }

        return normalizedEvent;
      });
    }

    return normalizedDay;
  });
}

export function formatDateForDisplay(value: DateInput): string {
  const normalized = normalizeDate(value);
  if (!normalized.isValid || !normalized.iso) {
    if (normalized.raw && typeof normalized.raw === 'string') {
      return normalized.raw;
    }
    return 'Unknown Date';
  }

  const [year, month, day] = normalized.iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (isNaN(date.getTime())) {
    return normalized.iso;
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
