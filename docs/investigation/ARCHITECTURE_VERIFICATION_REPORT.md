# Architecture Verification Report
# AU DIC Benchmark Evaluation Framework
# Verification Audit: 2026-08-07

---

## 1. Executive Summary

This Architecture Verification Report disproves the assumption that the AU DIC benchmark executes image-based visual document intelligence. A complete source-code verification confirms that **the pipeline does NOT load, process, or transmit document images to any AI inference backend**.

Instead, the prediction adapter extracts ground-truth field values from the ground-truth JSON files, packages them into a plain text summary string, and sends that ground-truth text summary to a text LLM (`llama-3.1-8b-instant` via Groq Cloud API).

---

## 2. Mandatory Verification Claims & Code Evidence

### Claim 1: Payload Type Verification (Image vs Ground-Truth Text)

| Attribute | Verified Code Reality |
|---|---|
| Payload Type | **Option B: Ground-Truth Text Summary** |
| Image Path Reading | Missing / Bypassed in prediction adapter |
| Base64 Image Encoding | None |
| Visual Vision API Invocation | None |
| Text Leakage Source | `sample.extractedFields` (GT dictionary) |

#### Source Code Evidence

**File**: [`backend/src/benchmark/adapters/AuDicPredictionAdapter.ts`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/adapters/AuDicPredictionAdapter.ts)  
**Lines**: 72–83, 119, 121–125

```typescript
// Lines 73-83 in AuDicPredictionAdapter.ts
const ef = sample.extractedFields;  // ← Ground truth fields loaded from GT JSON
const summaryLines: string[] = [
  `Document ID: ${sample.sampleId}`,
  `Document Type: ${sample.documentType}`,
  `Quality Profile: ${sample.qualityProfile}`,
];
const keyFields = ['student_name','roll_number','enrollment_number','degree_name','branch_name','batch_years','cgpa','issue_date','university_name','university_code'];
for (const k of keyFields) {
  if (ef[k] !== undefined) summaryLines.push(`${k}: ${ef[k]}`); // ← GT VALUES appended directly!
}
const contentToAnalyze = summaryLines.join('\n');

// Line 119
const prompt = `Analyze document:\n${contentToAnalyze}`;

// Lines 121-125
const aiResponse = await activeProvider.generateJSON(prompt, {
  systemInstruction,
  temperature: 0.2,
  maxTokens: 8192,
});
```

#### Why Images Are Not Sent
The prediction options construct `contentToAnalyze` exclusively from `sample.extractedFields`. `sample.pngPath` and `sample.pdfPath` are constructed by `AdbgGroundTruthAdapter.ts` (lines 53–54) but are never opened or read by `AuDicPredictionAdapter.ts`.

---

## 3. Structural Defect Analysis

### Defect 1: Ground-Truth Leakage
Because the LLM receives the exact ground-truth values in its prompt text, it is merely acting as a JSON re-serializer. This explains why **Category Accuracy is 100%** and why quality profiles (`clean`, `scanner_copy`, `mobile_camera`, `rotated_90`) show identical input prompts and identical LLM behaviour.

### Defect 2: Candidate Fields Corruption
In [`FieldLevelEvaluator.ts`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/evaluators/FieldLevelEvaluator.ts) (lines 38–41), the evaluator merges `extractedEntities` and `candidateFields`:

```typescript
const canonicalPred = CanonicalNormalizer.normalizeFields({
  ...prediction.extractedEntities,
  ...prediction.candidateFields,
});
```

When Groq returns `candidateFields` containing nested confidence objects (e.g. `{"value": "Aryan Bhat", "confidence": 100}`), spreading `candidateFields` overwrites clean string scalars in `extractedEntities`. `CanonicalNormalizer.ts` (line 47) passes non-string objects through untouched. When `ExactMatchComparator.ts` (line 56) casts this object to string (`String(actual)`), it evaluates to `"[object Object]"` or `"{'value': ...}"`, causing **714 false-failure comparison errors**.

### Defect 3: Ground Truth vs Model Schema Mismatch
- **Ground Truth Schema**: Contains 18 scalar fields + up to 40 subject objects per marksheet.
- **Model Schema**: Prompt requests only 10 fields (`student_name`, `roll_number`, `enrollment_number`, `degree_name`, `branch_name`, `batch_years`, `cgpa`, `issue_date`, `university_name`, `university_code`).
- **Result**: 8 scalar GT fields (`father_name`, `mother_name`, `date_of_birth`, `email`, `phone`, `blood_group`, `university_tagline`, `document_type`) + 18,000 subject attributes evaluate to **0% F1**, dragging down average precision/recall.

### Defect 4: Document Type Contamination
[`AdbgGroundTruthAdapter.ts`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/adapters/AdbgGroundTruthAdapter.ts) line 87 includes `document_type` inside `extractedFields`. The model returns `documentCategory` at the root JSON level, not inside `extractedEntities.document_type`. This causes **351 MISSING field failures** for `documentType`.

### Defect 5: Evaluation Mathematics Flaw
In [`FieldLevelEvaluator.ts`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/evaluators/FieldLevelEvaluator.ts) lines 78–80:
```typescript
const precision = totalFields > 0 ? matchedFields / totalFields : 0.0;
const recall    = totalFields > 0 ? matchedFields / totalFields : 0.0;
```
Both Precision and Recall use `totalFields` (Ground Truth field count) as denominator. This mathematically forces **Precision == Recall == F1** for every sample, making precision calculation invalid.

---

## 4. Verification Conclusion

The benchmark in its un-repaired state is **scientifically invalid as a document vision benchmark**. It must be rebuilt to:
1. Load and transmit actual document PNG images to a Vision-Language API.
2. Align model prompt schemas with ground-truth schema definitions.
3. Fix object-spread corruption in the evaluator.
4. Separate document classification labels from field extraction evaluation.
5. Compute mathematically valid Precision, Recall, and F1.
