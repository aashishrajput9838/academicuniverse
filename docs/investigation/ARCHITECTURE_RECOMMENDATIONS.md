# Architecture Recommendations
# AU DIC Document Intelligence Pipeline
# Based on run_1785959173886 audit

---

## Current Architecture

```
GT JSON
  └─> AdbgGroundTruthAdapter (load GT fields)
         └─> AuDicPredictionAdapter (build text from GT fields)
                └─> Groq LLM (llama-3.1-8b-instant) — text reformatting only
                       └─> FieldLevelEvaluator (merge extractedEntities + candidateFields)
                              └─> CanonicalNormalizer (snake_case → camelCase, date/number types)
                                     └─> ExactMatchComparator (Levenshtein CER/WER + exact match)
                                            └─> MetricCalculator (sample-averaged P=R=F1)
```

**Critical flaw**: The pipeline never touches the document image. The "document intelligence" is not intelligence — it is LLM JSON reformatting of text it already received.

---

## Required Architectural Changes

### Change 1 — CRITICAL: Replace Text Input with Actual Image Input

**Current (broken)**:
```typescript
// AuDicPredictionAdapter.ts line 73-83
const ef = sample.extractedFields;  // GT fields sent as text
const contentToAnalyze = summaryLines.join('\n');
```

**Required**:
```typescript
// Load the actual document image
const imagePath = path.resolve(baseDatasetDir, sample.pngPath);
const imageBytes = fs.readFileSync(imagePath);
const imageBase64 = imageBytes.toString('base64');
// Send to a vision-capable model with the image
```

This change requires:
- Switching to a vision-language model (VLM) or an OCR + LLM pipeline
- llama-3.1-8b-instant cannot process images — it is a text-only model

**Impact**: Makes the benchmark measure what it claims to measure. The current F1 of 17.19% becomes uninterpretable; a new baseline must be established.

### Change 2 — CRITICAL: Fix candidateFields Overwrite Bug

**Current (broken)**:
```typescript
// FieldLevelEvaluator.ts line 38-41
const canonicalPred = CanonicalNormalizer.normalizeFields({
  ...prediction.extractedEntities,
  ...prediction.candidateFields,  // overwrites with potentially untyped objects
});
```

**Required** (Option A — safest):
```typescript
// Extract only extractedEntities for field comparison
const canonicalPred = CanonicalNormalizer.normalizeFields(
  prediction.extractedEntities  // do not merge candidateFields
);
```

**Required** (Option B — if candidateFields data is useful):
```typescript
function flattenCandidateFields(cf: Record<string, any>): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(cf)) {
    if (typeof v === 'string') flat[k] = v;
    else if (typeof v === 'object' && v !== null && typeof v.value === 'string') flat[k] = v.value;
  }
  return flat;
}
const canonicalPred = CanonicalNormalizer.normalizeFields({
  ...flattenCandidateFields(prediction.candidateFields),
  ...prediction.extractedEntities,  // extractedEntities takes priority
});
```

**Impact**: Eliminates 714 false mismatches. Recovers ~2.9 pp F1 immediately.

### Change 3 — MAJOR: Exclude documentType from Field-Level Evaluation

**Current (broken)**:
```typescript
// AdbgGroundTruthAdapter.ts line 87
if (rawGt.document_type) extractedFields['document_type'] = rawGt.document_type;
```

**Required**: Remove this line entirely. `document_type` is the classification label, evaluated separately by `CategoryEvaluator.evaluateCategoryMatch()`.

**Impact**: Eliminates 351 false MISSING errors. Recovers ~1.4 pp F1.

### Change 4 — MAJOR: Fix Precision/Recall Calculation

**Current (incorrect)**:
```typescript
// FieldLevelEvaluator.ts line 78-79
const precision = totalFields > 0 ? matchedFields / totalFields : 0.0;
const recall    = totalFields > 0 ? matchedFields / totalFields : 0.0;
```

**Required**:
```typescript
const predictedFields = Object.keys(canonicalPred).length;
const precision = predictedFields > 0 ? matchedFields / predictedFields : 0.0;
const recall    = totalFields > 0 ? matchedFields / totalFields : 0.0;
const f1Score   = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0.0;
```

**Impact**: Makes precision and recall independent metrics. Enables detection of hallucinations (predicted but not in GT).

### Change 5 — MAJOR: Decouple Subject Evaluation from Scalar Field Evaluation

**Current**: Subject comparisons inflate the totalFields denominator for every marksheet sample, pulling per-sample F1 from ~75% to ~5.5% for marksheets.

**Required**: Report subject-level metrics separately from scalar field metrics.

```typescript
// In BenchmarkRunReport, add:
scalarFieldMetrics: { precision, recall, f1, cer, wer }
subjectFieldMetrics: { precision, recall, f1 }
```

**Impact**: Makes field-level and subject-level accuracy independently interpretable.

### Change 6 — MODERATE: Add Extractable Fields to Model Schema

Fields currently in GT but absent from model schema that are extractable from student ID cards and certificates:

| Field | Extractable from Image | Difficulty |
|---|---|---|
| father_name | Yes (student ID cards) | Medium |
| mother_name | Yes (student ID cards) | Medium |
| date_of_birth | Yes (student ID cards) | Medium |
| email | Yes (student ID cards) | Easy |
| phone | Yes (student ID cards) | Easy |
| blood_group | Yes (student ID cards) | Easy |
| university_tagline | Yes (certificates, marksheets) | Easy |

Adding these to the model schema (once image input is working) would make the evaluation schema complete.

### Change 7 — MODERATE: Expand Normalizer for More Field Types

The `CanonicalNormalizer` handles: date, roll/enrollment, GPA/numeric, degree/course, university, generic string.

Missing normalizers needed once real image extraction begins:
- **Email normalizer**: lowercase + trim
- **Phone normalizer**: strip country code prefix variants (+91/0091/0), normalize to 10-digit
- **Blood group normalizer**: A+/A positive/A(+) all → A+
- **Name normalizer**: title case, collapse double spaces

### Change 8 — MINOR: Constrain candidateFields Type in Prompt

In `AuDicPredictionAdapter.ts` system instruction, change:
```
"candidateFields": object
```
To:
```
"candidateFields": {}
```
Or remove entirely until real image extraction is implemented.

---

## Target Architecture (Production Grade)

```
Document Image (PNG/PDF)
  └─> Image Preprocessing
       - Deskew (for rotated_90)
       - Denoise (for scanner_copy)
       - Contrast enhancement (for mobile_camera)
       - Layout detection
         └─> Vision-Language Model
              Option A: Qwen2.5-VL-7B (open-source, strong at document OCR)
              Option B: Google Gemini 1.5 Flash (API, very strong on Indian academic docs)
              Option C: PaddleOCR (OCR stage) + llama-3.1-8b (extraction stage)
               └─> Field Extraction (structured JSON with constrained schema)
                    └─> Post-processing
                         - Phone normalization
                         - Date normalization
                         - Blood group normalization
                         - Name casing
                         - University alias resolution
                          └─> FieldLevelEvaluator (scalar + subject separate)
                               └─> MetricCalculator (proper P/R/F1)
```

---

## Unnecessary Stages in Current Pipeline

| Stage | Necessary Now | Reason |
|---|---|---|
| Image preprocessing | No (but critical for future) | Images never loaded |
| candidateFields merge | No | Causes corruption, provides no value |
| suggestedModule logic | No | Not evaluated, wastes tokens |
| primaryTargetModule construction | No | Not evaluated |
| confidenceScore | Partially | Scale is broken (0-1 vs 0-100) |
| summary generation | No | Never evaluated, wastes tokens |

---

## Summary of Architectural Debt

| Priority | Change | Effort | Impact |
|---|---|---|---|
| P0 | Add image input to prediction adapter | High | Entire benchmark validity |
| P0 | Switch to VLM (Qwen2.5-VL or Gemini Flash) | High | Unlocks real F1 measurement |
| P1 | Fix candidateFields overwrite bug | Low (1 line) | +2.9 pp F1 |
| P1 | Remove documentType from GT extractedFields | Low (1 line) | +1.4 pp F1 |
| P1 | Fix P/R denominator | Low (3 lines) | Metric accuracy |
| P2 | Separate subject and scalar evaluation | Medium | Interpretability |
| P2 | Add 7 missing fields to model schema | Medium | Schema completeness |
| P3 | Expand normalizers | Medium | Future accuracy |
| P3 | Constrain candidateFields type in prompt | Low | Prompt cleanliness |
