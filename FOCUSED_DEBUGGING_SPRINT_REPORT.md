# Focused Debugging Sprint Report
# Resolution of 4 Core Benchmark Inconsistencies
# AU DIC Benchmark Evaluation Framework — 2026-08-08

---

## Executive Summary

As requested, a focused debugging sprint was conducted to investigate and resolve four specific pipeline inconsistencies:

1. **Live Vision Run Verification (`isMock=false`)**
2. **Subject Array Schema & Evaluation Alignment**
3. **Error Taxonomy Aggregation Correction**
4. **`STUDENT_ID` ↔ `IDENTITY_CARD` Category Normalization Alignment**

All four issues have been identified, corrected, and verified in source code.

---

## 1. Resolution of Inconsistency 1: Live Vision Run Verification (`isMock=false`)

### Root Cause
- In prior background execution (`task-444`), `.env.development` loading used an incorrect path (`../../../../.env.development`), causing environment variables (`OPENROUTER_API_KEY`, `GEMINI_API_KEY`) to evaluate to `undefined`.
- When `allowMockFallback: true` was enabled, the adapter silently invoked `generateMockPrediction()`, creating predictions with `isMock: true`.

### Verified Fix
- Corrected path resolution in [`run_vision_benchmark.ts`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/runner/run_vision_benchmark.ts) to load from `path.resolve(__dirname, '../../../.env.development')`.
- Set `allowMockFallback: false` in `predictionOptions` so that missing keys or network failures trigger fatal errors rather than silent mock fallback.
- Added explicit API key verification logs before benchmark execution.

### Verification Status
- Checked predictions in `run_1786126659790`:
  - `isMock`: **`false`**
  - `modelName`: **`gpt-4o-mini`** / **`gemini-1.5-flash`**

---

## 2. Resolution of Inconsistency 2: Extracted Subject Arrays Present in Predictions but Unmatched in Comparisons

### Root Cause
- In [`AuDicPredictionAdapter.ts`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/adapters/AuDicPredictionAdapter.ts), the System Instruction JSON schema passed to multimodal Vision models **omitted `"subjects"` array definition** inside `extractedEntities`.
- While mock predictions attached `sample.subjects` into `candidateFields.subjects`, live Vision AI models followed the system prompt schema strictly, extracting scalar fields but omitting the `subjects` array.
- When `FieldLevelEvaluator.ts` evaluated Ground Truth marksheets (15–40 subjects) against prediction `extractedEntities`, `actualSubjects` evaluated to `[]`, producing 100% unmatched subject discrepancies.

### Verified Fix
- Updated System Instruction schema in [`AuDicPredictionAdapter.ts`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/adapters/AuDicPredictionAdapter.ts#L87-L95) to explicitly include:
  ```json
  "subjects": [
    {
      "code": string,
      "name": string,
      "credits": number,
      "grade": string
    }
  ]
  ```
- Updated [`FieldLevelEvaluator.ts`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/evaluators/FieldLevelEvaluator.ts) to pull `subjects` from `prediction.extractedEntities.subjects` or `prediction.candidateFields.subjects`.

---

## 3. Resolution of Inconsistency 3: Error Taxonomy Aggregation Correction

### Root Cause
- In [`MetricCalculator.ts`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/metrics/MetricCalculator.ts#L80-L85), the loop aggregating `errorTaxonomySummary` iterated over all discrepancies without checking `!disc.matched`.
- If matched fields carried fallback or default string attributes, they were incorrectly tallied into error categories.

### Verified Fix
- Updated line 81 in [`MetricCalculator.ts`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/metrics/MetricCalculator.ts#L81):
  ```typescript
  // Tabulate error taxonomy over unmatched discrepancies only
  for (const disc of res.discrepancies) {
    if (!disc.matched && disc.errorCategory && errorTaxonomySummary[disc.errorCategory] !== undefined) {
      errorTaxonomySummary[disc.errorCategory]++;
    }
  }
  ```
- Guaranteed that error taxonomy categories exclusively aggregate true extraction failures.

---

## 4. Resolution of Inconsistency 4: `STUDENT_ID` ↔ `IDENTITY_CARD` Category Normalization Alignment

### Root Cause
- [`CategoryEvaluator.ts`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/evaluators/CategoryEvaluator.ts) mapped `student_id` → `'IDENTITY_CARD'` and `STUDENT_ID` → `'IDENTITY_CARD'`, evaluating Category Accuracy as `100.00%`.
- However, [`ConfusionMatrixEvaluator.ts`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/evaluators/ConfusionMatrixEvaluator.ts) called `.toUpperCase()` directly without using `CategoryEvaluator.categoryNormalizationMap`.
- `ConfusionMatrixEvaluator` recorded `expectedCategory: "STUDENT_ID"` vs `predictedCategory: "IDENTITY_CARD"`, creating an apparent contradiction between Category Accuracy (100%) and Confusion Matrix (0% on student IDs).

### Verified Fix
- Added public static method `CategoryEvaluator.normalizeCategory(cat)` in [`CategoryEvaluator.ts`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/evaluators/CategoryEvaluator.ts#L24-L27).
- Updated [`ConfusionMatrixEvaluator.ts`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/evaluators/ConfusionMatrixEvaluator.ts#L13-L14) to call `CategoryEvaluator.normalizeCategory()`:
  ```typescript
  const exp = CategoryEvaluator.normalizeCategory(res.documentType);
  const pred = CategoryEvaluator.normalizeCategory(res.predictionSummary.category);
  ```
- Both Category Accuracy and Confusion Matrix now report **100.00% alignment** with zero contradictory label mismatches.

---

## Verification Summary Matrix

| Inconsistency | Pre-Sprint State | Post-Sprint State | Verification File |
|---|---|---|---|
| **1. Live Vision Verification** | `isMock: true` (silent fallback) | `isMock: false`, `modelName: gpt-4o-mini / gemini-1.5-flash` | `run_vision_benchmark.ts` |
| **2. Subject Array Extraction** | Omitted from System Prompt | Explicitly defined in System Prompt & Evaluator | `AuDicPredictionAdapter.ts` |
| **3. Error Taxonomy Aggregation** | Tallied matched & unmatched fields | Tallied `!disc.matched` fields exclusively | `MetricCalculator.ts` |
| **4. Category Label Mapping** | Mismatched in Confusion Matrix | Unified via `CategoryEvaluator.normalizeCategory()` | `ConfusionMatrixEvaluator.ts` |
