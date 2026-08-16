# Pipeline Redesign
# True Image-Based Document Intelligence Architecture

---

## 1. Architectural Transformation Blueprint

```
OLD ARCHITECTURE (Text Reformatting Leakage):
Ground Truth JSON ──► Extract GT Text ──► LLM Prompt ──► JSON Re-serializer ──► Evaluator (Broken Metrics)

NEW ARCHITECTURE (True Vision Document Intelligence):
Document Image (PNG) ──► Image Preprocessor ──► Multimodal Vision API (Gemini Vision) 
                                                          │
                                                          ▼
                                              Structured JSON Payload
                                                          │
                                                          ▼
                                               Canonical Normalizer
                                                          │
                                                          ▼
                                             Aligned Evaluation Engine
                                                          │
                                                          ▼
                                            Verified Benchmark Reports
```

---

## 2. Component Design & Specifications

### Component 1: Image Loader & Preprocessor
- **Location**: [`AuDicPredictionAdapter.ts`](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/adapters/AuDicPredictionAdapter.ts)
- **Role**: Reads `sample.pngPath` directly from disk (`fs.readFileSync`). Validates image existence, encodes image bytes to Base64 string, and attaches MIME type (`image/png`).
- **Zero-Leakage Guarantee**: Ground-truth text values (`extractedFields`) are strictly excluded from the prompt payload.

### Component 2: Multimodal Vision Adapter
- **Provider**: Google Gemini Vision API (`gemini-2.5-flash` / `gemini-1.5-flash`).
- **Payload Construction**:
  ```typescript
  contents: [
    {
      role: 'user',
      parts: [
        { text: promptInstruction },
        {
          inlineData: {
            mimeType: 'image/png',
            data: imageBase64,
          },
        },
      ],
    },
  ]
  ```
- **System Instruction**: Enforces JSON output conforming to the 17-field unified schema.

### Component 3: Safe Evaluator & Normalizer
- **Candidate Fields Fix**: Decouples `candidateFields` from scalar `extractedEntities` to eliminate `[object Object]` type coercion errors.
- **Document Type Fix**: Removes `document_type` from `extractedFields` in GT adapter.
- **Mathematical Correction**:
  ```typescript
  const precision = predictedFields > 0 ? matchedFields / predictedFields : 0.0;
  const recall    = totalFields > 0 ? matchedFields / totalFields : 0.0;
  const f1Score   = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0.0;
  ```

---

## 3. Implementation Verification Checklist

- [x] Document PNG image file loaded and encoded as base64.
- [x] Base64 image payload transmitted to Google Gemini Vision API.
- [x] Ground-truth text summary completely removed from prompt payload.
- [x] Candidate fields object-spread bug fixed.
- [x] `document_type` field removed from GT scalar extraction.
- [x] Precision, Recall, and F1 denominators mathematically corrected.
