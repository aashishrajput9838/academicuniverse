/**
 * Verification script for Date Normalizer utility.
 *
 * Run with: npx ts-node -r tsconfig-paths/register backend/src/scripts/verify-date-normalizer.ts
 */

import { normalizeDate, normalizeScheduleDates } from '../shared/utils/dateNormalizer';

const testCases = [
  { input: '2024-01-15', expected: '2024-01-15', description: 'ISO YYYY-MM-DD' },
  { input: '2024-01-15T10:30:00Z', expected: '2024-01-15', description: 'ISO datetime' },
  { input: '15/01/2024', expected: '2024-01-15', description: 'DD/MM/YYYY' },
  { input: '01/15/2024', expected: '2024-01-15', description: 'MM/DD/YYYY (US)' },
  { input: '15-01-2024', expected: '2024-01-15', description: 'DD-MM-YYYY' },
  { input: 'January 15, 2024', expected: '2024-01-15', description: 'Month name format' },
  { input: 'Jan 15, 2024', expected: '2024-01-15', description: 'Abbreviated month name' },
  { input: 'Monday, January 15, 2024', expected: '2024-01-15', description: 'Day name format' },
  { input: new Date('2024-01-15'), expected: '2024-01-15', description: 'Date object' },
  { input: '2024-01-15T10:30:00+05:30', expected: '2024-01-15', description: 'ISO with timezone' },
  { input: '', expected: null, description: 'Empty string' },
  { input: null, expected: null, description: 'Null' },
  { input: undefined, expected: null, description: 'Undefined' },
  { input: 'invalid-date', expected: null, description: 'Invalid string' },
  { input: '15/13/2024', expected: null, description: 'Invalid month' },
];

console.log('=== Date Normalizer Verification ===\n');

let passCount = 0;
let failCount = 0;

for (const testCase of testCases) {
  const result = normalizeDate(testCase.input as any);
  const passed = result.iso === testCase.expected;

  if (passed) {
    passCount++;
    console.log(`[PASS] ${testCase.description}: "${testCase.input}" -> "${result.iso}"`);
  } else {
    failCount++;
    console.log(`[FAIL] ${testCase.description}: "${testCase.input}" -> expected "${testCase.expected}", got "${result.iso}"`);
  }
}

// Test schedule normalization
console.log('\n--- Schedule Normalization ---');
const rawSchedule = [
  { date: '15/01/2024', events: [{ timeSlot: '10:00', courseName: 'Math' }] },
  { date: '2024-01-16', events: [{ timeSlot: '11:00', courseName: 'Physics' }] },
  { date: 'invalid', events: [{ timeSlot: '12:00', courseName: 'Chemistry' }] },
];

const normalizedSchedule = normalizeScheduleDates(rawSchedule);
console.log('Original:', JSON.stringify(rawSchedule, null, 2));
console.log('Normalized:', JSON.stringify(normalizedSchedule, null, 2));

console.log(`\n=== Results: ${passCount} passed, ${failCount} failed ===`);
process.exit(failCount > 0 ? 1 : 0);
