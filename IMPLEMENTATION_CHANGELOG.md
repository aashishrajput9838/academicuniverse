# Implementation Changelog
# Evaluator Fixes Post-Implementation
# AU DIC Benchmark Evaluation Framework — 2026-08-07

---

## Overview

Strictly conforming to the implementation mission rules, **ONLY the three verified evaluator fixes were implemented**. No changes were made to prompts, Vision models, OCR pipelines, Ground Truth data, metrics formulas, statistical parameters, or model configurations.

---

## Summary of Evaluator Modifications

### Fix 1: Subject Array Pass-Through in `FieldLevelEvaluator.ts`

- **File**: [`backend/src/benchmark/evaluators/FieldLevelEvaluator.ts`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/evaluators/FieldLevelEvaluator.ts)
- **Lines Modified**: Lines 40–42
- **Change**: Added `else if (Array.isArray(v)) { cleanRawPred[k] = v; }`
- **Rationale**: Prevents non-string `candidateFields.subjects` arrays from being discarded during scalar extraction. Preserves the full subject array structure for subsequent normalization and comparator evaluation.

---

### Fix 2: Deterministic Course-Code Keyed Subject Matching in `SubjectArrayComparator.ts`

- **File**: [`backend/src/benchmark/comparators/SubjectArrayComparator.ts`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/comparators/SubjectArrayComparator.ts)
- **Lines Modified**: Lines 45–95
- **Change**: Implemented course-code indexed lookup map (`getCodeKey(obj)`). Replaced strict positional-only index matching (`exp[i]` vs `act[i]`) with a two-pass algorithm:
  1. Direct positional check if course codes match at index `i`.
  2. Course-code keyed lookup fallback to match predictions by course code even if row ordering differs.
- **Rationale**: Eliminates array ordering mismatches and index shift cascade errors.

---

### Fix 3: Recursive Subject Array Normalization in `CanonicalNormalizer.ts`

- **File**: [`backend/src/benchmark/normalizers/CanonicalNormalizer.ts`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/normalizers/CanonicalNormalizer.ts)
- **Lines Modified**: Lines 45–68
- **Change**: Added `else if (Array.isArray(val))` handler to recursively traverse subject array elements and normalize:
  - Course codes (`code`, `courseCode` → trimmed & uppercased)
  - Subject grades (`grade` → trimmed & uppercased)
  - Credits & Grade points (`credits`, `gradePoints` → `NumericNormalizer.normalize`)
  - Semester / Term labels (`term`, `semester` → `StringNormalizer.normalize`)
- **Rationale**: Ensures domain-specific normalizers apply consistently to array elements as well as scalar fields.

---

## Non-Interference Verification

- [x] Ground Truth schema untouched.
- [x] Vision model & system instructions untouched.
- [x] OCR pipeline untouched.
- [x] Metric formulas untouched.
- [x] Model hyperparameters untouched.
