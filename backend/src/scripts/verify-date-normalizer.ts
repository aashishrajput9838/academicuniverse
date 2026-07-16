/**
 * Complete Date Normalization Runtime Verification
 *
 * Tests the exact inputs requested by the user and shows the full pipeline.
 */

import { normalizeDate, normalizeScheduleDates } from '../shared/utils/dateNormalizer';

const testInputs = [
  { input: '2026-07-15', expected: '2026-07-15', description: 'ISO YYYY-MM-DD' },
  { input: '15/07/2026', expected: '2026-07-15', description: 'DD/MM/YYYY' },
  { input: '07/15/2026', expected: '2026-07-15', description: 'MM/DD/YYYY (US)' },
  { input: '15-07-2026', expected: '2026-07-15', description: 'DD-MM-YYYY' },
  { input: 'July 15, 2026', expected: '2026-07-15', description: 'Month name format' },
  { input: 'Wed, July 15, 2026', expected: '2026-07-15', description: 'Day name format' },
  { input: 44900, expected: '2022-12-04', description: 'Excel serial 44900 (days since 1899-12-30)' },
  { input: 1723651200000, expected: '2024-08-14', description: 'Unix timestamp ms (2024-08-14)' },
  { input: new Date('2026-07-15T00:00:00+05:30'), expected: '2026-07-15', description: 'Date object IST midnight preserved as local date' },
  { input: '', expected: null, description: 'Empty string (fallback)' },
  { input: null, expected: null, description: 'Null (fallback)' },
  { input: 'not-a-date-xyz', expected: null, description: 'Malformed string (fallback)' },
];

console.log('=== Date Normalization Runtime Verification ===\n');
console.log('Testing exact inputs requested:\n');

let passCount = 0;
let failCount = 0;

for (const testCase of testInputs) {
  const normalized = normalizeDate(testCase.input as any);

  const passed = normalized.iso === testCase.expected;

  if (passed) {
    passCount++;
    console.log(`[PASS] ${testCase.description}`);
    console.log(`         Raw: ${JSON.stringify(testCase.input)}`);
    console.log(`         Normalized: ${normalized.iso}`);
  } else {
    failCount++;
    console.log(`[FAIL] ${testCase.description}`);
    console.log(`         Raw: ${JSON.stringify(testCase.input)}`);
    console.log(`         Expected: ${testCase.expected}`);
    console.log(`         Got: ${normalized.iso}`);
  }
  console.log('');
}

// Test schedule normalization with mixed formats
console.log('--- Schedule Array Normalization (Mixed Formats) ---');
const mixedSchedule = [
  { date: '2026-07-15', events: [{ timeSlot: '10:00', courseName: 'Math' }] },
  { date: '15/07/2026', events: [{ timeSlot: '11:00', courseName: 'Physics' }] },
  { date: 'July 15, 2026', events: [{ timeSlot: '12:00', courseName: 'Chemistry' }] },
  { date: '15-07-2026', events: [{ timeSlot: '13:00', courseName: 'Biology' }] },
  { date: 'invalid', events: [{ timeSlot: '14:00', courseName: 'Invalid Date Course' }] },
];

const normalizedSchedule = normalizeScheduleDates(mixedSchedule);
console.log('Input dates:', mixedSchedule.map(d => d.date).join(', '));
console.log('Normalized:', normalizedSchedule.map(d => d.date).join(', '));
console.log('');

const allDatesValid = normalizedSchedule.every(d => d.date === '2026-07-15' || d.date === 'invalid');
if (allDatesValid) {
  console.log('[PASS] Valid dates normalized to 2026-07-15, invalid date preserved');
} else {
  console.log('[FAIL] Some dates did not normalize correctly');
}
console.log('');

// Timezone verification
console.log('--- Timezone Stability Verification ---');
const dateInIST = new Date('2026-07-15T00:00:00+05:30');
const normalizedIST = normalizeDate(dateInIST);
console.log(`Input: 2026-07-15T00:00:00+05:30 (IST)`);
console.log(`Normalized: ${normalizedIST.iso}`);
console.log(`Expected: 2026-07-15`);
console.log(`Timezone shift: ${normalizedIST.iso === '2026-07-15' ? 'NONE' : 'SHIFTED'}`);
console.log('');

const dateInUTC = new Date('2026-07-15T00:00:00Z');
const normalizedUTC = normalizeDate(dateInUTC);
console.log(`Input: 2026-07-15T00:00:00Z (UTC)`);
console.log(`Normalized: ${normalizedUTC.iso}`);
console.log(`Expected: 2026-07-15`);
console.log(`Timezone shift: ${normalizedUTC.iso === '2026-07-15' ? 'NONE' : 'SHIFTED'}`);
console.log('');

// Final results
console.log('=== Final Results ===');
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
console.log(`Total: ${testInputs.length}`);

if (failCount > 0) {
  process.exit(1);
}
