# Pipeline Bottleneck Report
# AU DIC Benchmark run_1785959173886
# Model: llama-3.1-8b-instant | Dataset: 360 samples

---

## Pipeline Stage Map

```
Stage 1: Ground Truth Loading (AdbgGroundTruthAdapter)
         ↓
Stage 2: Content Construction (AuDicPredictionAdapter)
         ↓
Stage 3: LLM Inference (GroqAIProvider → llama-3.1-8b-instant)
         ↓
Stage 4: Response Parsing (JSON.parse)
         ↓
Stage 5: Prediction Object Construction
         ↓
Stage 6: Canonical Normalization (CanonicalNormalizer)
         ↓
Stage 7: Field Comparison (ExactMatchComparator)
         ↓
Stage 8: Metric Aggregation (MetricCalculator)
```

---

## Stage-by-Stage Bottleneck Analysis

### Stage 1 — Ground Truth Loading

**Status**: FUNCTIONING CORRECTLY  
**Code**: [AdbgGroundTruthAdapter.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/adapters/AdbgGroundTruthAdapter.ts)

GT JSON files are parsed correctly. All 360 samples load without error. The adapter correctly maps ADBG schema to benchmark types.

**Bottleneck**: The adapter silently includes `document_type` as an `extractedField` (line 87), which contaminates field-level evaluation. This is a design issue, not a loading failure.

**Accuracy loss at this stage**: ~351 false-MISSING errors from documentType field.

---

### Stage 2 — Content Construction

**Status**: CRITICAL ARCHITECTURAL FAILURE  
**Code**: [AuDicPredictionAdapter.ts lines 73-83](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/adapters/AuDicPredictionAdapter.ts)

The content sent to the LLM is:
```
Document ID: DOC-00DFAED9_clean
Document Type: student_id
Quality Profile: clean
student_name: Aryan Bhat
roll_number: 2019CE000744
enrollment_number: EN201900744
degree_name: Bachelor of Technology in Civil Engineering
branch_name: Civil Engineering
batch_years: 2019 - 2023
cgpa: 6.8
issue_date: 2023-07-24
university_name: Vivekananda Technical University
university_code: VTU
```

**This is the ground truth itself.** The image file is never loaded. The quality profile has no effect on this text. All four variants (clean/scanner/mobile/rotated) for the same document receive **identical input**.

**Accuracy loss**: Makes all cross-quality-profile comparison meaningless. The model cannot be tested for OCR robustness.

---

### Stage 3 — LLM Inference

**Status**: FUNCTIONING (within its broken input context)  
**Provider**: Groq Cloud, llama-3.1-8b-instant  
**Rate limiting**: 8000ms hard delay per sample (confirmed from adapter line 45)  
**Response format**: `json_object` enforced

Given text input that contains the answer, the model re-emits it as JSON. It correctly produces `documentCategory` and `extractedEntities` with clean string values on **273/360 samples (75.8%)**.

On 87/360 samples (24.2%), the model populates `candidateFields` with confidence-annotated objects, which then corrupt the evaluation in Stage 6.

The model is NOT the primary bottleneck. It achieves ~75.9% on the fields it was asked to extract from text.

**Confidence score anomaly**: `averageConfidence = 14.98` — the model is returning values like `0.95`, `100`, `85` etc. in an inconsistent scale. The evaluation code treats these as fractions but they are sometimes percentages. This causes the confidence metrics to be meaningless (averageConfidence of 14.98 in a 0–1 expected range).

---

### Stage 4 — Response Parsing

**Status**: FUNCTIONING  
**Code**: [groq.provider.ts line 55](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/core/ai/groq.provider.ts)

`JSON.parse(content)` — straightforward. The `json_object` response format from Groq guarantees valid JSON. Zero parse failures observed (failedEvaluations: 0).

---

### Stage 5 — Prediction Object Construction

**Status**: PARTIALLY BROKEN  
**Code**: [AuDicPredictionAdapter.ts lines 138-154](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/adapters/AuDicPredictionAdapter.ts)

```typescript
extractedEntities: aiResponse.extractedEntities || {},
candidateFields: aiResponse.candidateFields || {},  // accepted without type validation
```

`candidateFields` is accepted as raw `object` without checking whether values are strings or nested objects. There is no flattening or type enforcement here. This is where the corruption potential is created.

**Accuracy loss**: Up to 714 field comparison failures from unvalidated candidateFields objects.

---

### Stage 6 — Canonical Normalization

**Status**: PARTIALLY BROKEN — Object passthrough bug  
**Code**: [CanonicalNormalizer.ts lines 45-48](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/normalizers/CanonicalNormalizer.ts)

```typescript
} else if (typeof val === 'string') {
  canonical[normKey] = StringNormalizer.normalize(val, true);
} else {
  canonical[normKey] = val;  // objects pass through as-is — no error, no coercion
}
```

And in [FieldLevelEvaluator.ts lines 38-41](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/evaluators/FieldLevelEvaluator.ts):

```typescript
const canonicalPred = CanonicalNormalizer.normalizeFields({
  ...prediction.extractedEntities,  // clean strings
  ...prediction.candidateFields,    // overwrites with objects
});
```

The spread means `candidateFields` values silently overwrite `extractedEntities` values for the same key. Non-string values pass through unchanged. When the comparator later calls `String(actual)`, it gets `[object Object]`.

**Also**: The key normalizer converts snake_case to camelCase (`university_code` → `universityCode`). But the lookup in `canonicalPred` also uses camelCase, so key normalization itself works. The issue is purely the value type problem.

**Accuracy loss**: 714 false mismatches from object-valued candidateFields.

---

### Stage 7 — Field Comparison

**Status**: LOGIC CORRECT, but inputs are corrupted  
**Code**: [ExactMatchComparator.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/comparators/ExactMatchComparator.ts)

The string comparison logic is sound. CER and WER use correct Levenshtein implementation. The `isExactMatch` function normalizes case and whitespace before comparison.

**Design gap**: When `actual` is a JS object that becomes `[object Object]`, CER = Levenshtein("[object Object]", expected) / len(expected) → typically close to 1.0. This causes the comparator to classify the failure as `OCR_ERROR` (CER > 0.50) rather than recognizing it as a type coercion failure.

**Accuracy loss**: None from this stage itself. It correctly reports what it receives. The corruption entered earlier.

---

### Stage 8 — Metric Aggregation

**Status**: METRIC DESIGN BUGS  
**Code**: [MetricCalculator.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/metrics/MetricCalculator.ts) + [FieldLevelEvaluator.ts lines 78-80](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/evaluators/FieldLevelEvaluator.ts)

1. **P = R always**: Both computed as `matchedFields / totalFields`. Precision should use predicted field count as denominator.
2. **Subject fields in denominator**: 18,000 subject comparisons (all 0%) are included in the per-sample F1 denominator for marksheets
3. **Sample-averaged F1**: Each sample's F1 is averaged rather than computing corpus-level P/R/F1 separately — marksheet samples with 40 subjects each have much larger denominators, pulling down their per-sample F1 more than certificate samples

---

## Bottleneck Ranking

| Rank | Stage | Issue | F1 Impact |
|---|---|---|---|
| 1 | Stage 2: Content Construction | No image processed — GT text sent to model | Architecture-invalidating |
| 2 | Stage 8: Metric Aggregation | 18,000 subject fields at 0% + 8 schema-missing scalars | -58.5 pp |
| 3 | Stage 5-6: Prediction Object + Normalization | candidateFields overwrites extractedEntities | -2.9 pp |
| 4 | Stage 1: GT Loading | documentType contaminating field eval | -1.4 pp |
| 5 | Stage 8: Metric Design | P = R by construction | Reporting artifact |
| 6 | Stage 3: LLM Inference | 24.2% inconsistent JSON format | -3.5 pp |

---

## Performance Bottleneck (Throughput)

```
Throughput: 0.093 samples/sec
Mean latency: 10,761 ms/sample
Duration for 360 samples: 3874 seconds (~64 minutes)
```

- 8,000ms of this is an artificial rate-limiting delay (line 45 of adapter)
- Actual Groq inference: ~2,761ms/sample
- Rate limiting is appropriate given Groq free-tier constraints but eliminates any real-time application
