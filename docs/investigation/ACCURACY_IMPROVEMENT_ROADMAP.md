# Accuracy Improvement Roadmap
# AU DIC Document Intelligence System
# Based on root cause analysis of run_1785959173886

---

## Baseline

| Metric | Current | Notes |
|---|---|---|
| Category Accuracy | 100.0% | Valid — uses text label provided directly |
| Field F1 (reported) | 17.19% | Invalid — 3 structural artifacts depress this |
| Field F1 (on schema fields only) | 75.92% | What the LLM actually achieves on 10 text fields |
| Field F1 (real image extraction) | UNKNOWN | Pipeline never processes images |
| Subject F1 | 0.0% | Model has no subject schema |
| Mean CER (reported) | 82.76% | Inflated by candidateFields corruption and missing fields |
| Exact Match Rate | 0.0% | Impossible given 7 always-missing GT fields |

---

## Phase 0 — Fix Existing Bugs (Zero Research Risk, ~1 Day Engineering)

These changes fix measurement errors without changing the underlying model or pipeline design.

### 0.1 — Fix candidateFields overwrite bug

**File**: [FieldLevelEvaluator.ts line 38-41](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/evaluators/FieldLevelEvaluator.ts)

**Change**: Remove `...prediction.candidateFields` from the merge, OR flatten objects before merge.

**Expected F1 improvement**: +2.9 pp (from 17.19% to ~20.1%)  
**Engineering effort**: 1 hour  
**Research risk**: None  
**Priority**: P0

### 0.2 — Remove documentType from extractedFields in GT adapter

**File**: [AdbgGroundTruthAdapter.ts line 87](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/adapters/AdbgGroundTruthAdapter.ts)

**Change**: Delete line `if (rawGt.document_type) extractedFields['document_type'] = rawGt.document_type;`

**Expected F1 improvement**: +1.4 pp  
**Engineering effort**: 10 minutes  
**Research risk**: None  
**Priority**: P0

### 0.3 — Fix precision/recall denominator

**File**: [FieldLevelEvaluator.ts lines 78-80](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/evaluators/FieldLevelEvaluator.ts)

**Change**: `precision = matchedFields / predictedFields` (not totalFields)

**Expected F1 improvement**: Changes metric semantics. Reported F1 will differ.  
**Engineering effort**: 30 minutes  
**Research risk**: None  
**Priority**: P0

### 0.4 — Separate subject and scalar evaluation

**File**: [FieldLevelEvaluator.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/evaluators/FieldLevelEvaluator.ts), [MetricCalculator.ts](file:///c:/github/academicuniverse.com/academicuniverse/backend/src/benchmark/metrics/MetricCalculator.ts)

**Change**: Compute and report `scalarF1` and `subjectF1` as separate metrics.

**Expected F1 improvement**: Scalar F1 becomes 42.3% correctly. Subjects still 0% but clearly isolated.  
**Engineering effort**: 2 hours  
**Research risk**: None  
**Priority**: P0

**After Phase 0 (code bugs fixed, no architecture change)**:
- Reported scalar F1: ~42.3%
- Subject F1: 0.0% (schema missing)
- Honest measurement established

---

## Phase 1 — Add Real Image Processing (Architecture Redesign, 2-4 Weeks Engineering)

This is the foundational change. Until it is done, no F1 measurement is meaningful.

### 1.1 — Integrate actual image loading into AuDicPredictionAdapter

**Change**: Load `sample.pngPath` as base64 image bytes and send to a vision-capable API.

**Minimum viable approach**: Use Gemini Flash Vision API (already supported via `aiProvider` in codebase — see `process.env.GEMINI_API_KEY` path in adapter line 57).

```typescript
// Read the actual document image
const imagePath = path.resolve(baseDatasetDir, sample.pngPath);
const imageBase64 = fs.readFileSync(imagePath).toString('base64');
// Pass to Gemini multimodal API
```

**Engineering effort**: 1–2 weeks  
**Research risk**: Low (Gemini Flash is a mature API)  
**Expected baseline F1 (on 10 fields)**: Unknown — establishes true baseline  
**Priority**: P0

### 1.2 — Establish true baseline from image extraction

After enabling image processing, run the benchmark with:
- All 4 quality profiles (clean / scanner_copy / mobile_camera / rotated_90)
- All 3 document categories (certificate / marksheet / student_id)
- Full 360 sample set

This run will establish the real F1 baseline. It is not possible to estimate this value without running it.

**Best-case estimate for a capable VLM (Gemini 1.5 Flash) on clean images**:
- student_name, university_name: 85–95% F1 (large text, prominent)
- roll_number, enrollment_number: 70–85% F1 (alphanumeric, prone to OCR substitution)
- cgpa, batch_years: 80–90% F1 (numeric, well-structured)
- issue_date: 75–85% F1 (date formats vary)
- father_name, mother_name: 70–80% F1 (smaller text on student IDs)
- DOB: 75–85% F1 (multiple formats possible)
- email, phone: 80–90% F1 (distinctive format aids extraction)

**For degraded profiles (scanner_copy, mobile_camera, rotated_90)**:
- Expected 10–25% F1 degradation per quality level vs clean
- rotated_90 most severe without preprocessing

---

## Phase 2 — Model Selection (2-6 Weeks Research, Parallel with Phase 1)

### Why llama-3.1-8b-instant is wrong for this task

llama-3.1-8b-instant is a **text-only LLM**. It cannot process images. Using it for a "document intelligence" benchmark requires that the document content be pre-extracted and handed to it as text. The current pipeline does exactly this (from GT), which is why it achieves 76% on 10 text fields but provides zero insight into real document intelligence capability.

### Recommended Model Alternatives

#### Option A: Gemini 1.5 Flash (Recommended for current iteration)

| Criterion | Assessment |
|---|---|
| Image input | Yes (native multimodal) |
| Indian academic doc performance | Strong (en_IN locale support) |
| API availability | Yes (already in codebase) |
| Cost | Free tier available |
| JSON output | Native JSON mode |
| Context window | 1M tokens |

**Estimated F1 on clean Indian academic documents**: 75–90% (literature-based estimate)  
**Effort to integrate**: Low — adapter already has Gemini fallback path

#### Option B: Qwen2.5-VL-7B (Recommended for research paper)

| Criterion | Assessment |
|---|---|
| Image input | Yes (open-source VLM) |
| Document understanding | Strong — specifically trained on document tasks |
| Local deployment | Yes — can run on GPU server |
| Cost | Free (self-hosted) |
| JSON output | Via prompt instruction |
| Reproducibility | High (fixed weights) |

**Estimated F1 on clean academic documents**: 70–85%  
**Effort to integrate**: Medium — need Transformers/vLLM deployment  
**Research advantage**: Open-source, reproducible, publishable

#### Option C: PaddleOCR + llama-3.1-8b (Hybrid Pipeline)

| Criterion | Assessment |
|---|---|
| OCR stage | PaddleOCR v3 (strong on Indian scripts) |
| Extraction stage | Text LLM (current model reused) |
| Cost | Free |
| Complexity | High — two-stage pipeline |
| Reproducibility | Medium |

**Estimated F1 on clean documents**: 65–80% (OCR quality is bottleneck)  
**Effort to integrate**: High — need OCR integration + layout analysis

#### NOT Recommended: GPT-4 Vision / GPT-5 Vision

Strong performance but closed API, variable pricing, non-reproducible for academic publication, no control over model weights or behavior changes.

### Recommendation

For the research paper: **Qwen2.5-VL-7B** for reproducible open-source benchmark.  
For the production system: **Gemini 1.5 Flash** (already partially integrated, fastest path).

---

## Phase 3 — Subject Field Extraction (4-8 Weeks, High Research Complexity)

Marksheet subject arrays (30–40 subjects per document) require a fundamentally different extraction approach than scalar fields.

### Why Subject Extraction Is Hard

- Variable number of rows (20–40 subjects)
- Tabular layout with subtle formatting differences between universities
- Course codes are alphanumeric with institution-specific formats
- Grade symbols vary (A/A+/O/F vs 9/10/0)

### Required Changes

1. Add subject extraction schema to model prompt
2. Use a table-aware prompt structure or few-shot examples for tabular extraction
3. Add `SubjectNormalizer` for grade and code format normalization
4. Run subject matching separately (use set-based matching not positional)

**Expected subject F1 after proper VLM + schema (on clean)**: 55–75%  
**Engineering effort**: 3–4 weeks  
**Research risk**: Medium

---

## Phase 4 — Image Preprocessing (2 Weeks, Low Research Risk)

Only relevant after Phase 1 is done. These preprocessing steps specifically address the 4 quality profiles.

| Profile | Problem | Preprocessing Fix | Expected F1 Recovery |
|---|---|---|---|
| clean | None | None needed | Baseline |
| scanner_copy | Noise, slight blur | Denoise (OpenCV fastNlMeans), contrast CLAHE | +5–10% |
| mobile_camera | Perspective distortion, uneven lighting | Adaptive thresholding, perspective correction | +5–10% |
| rotated_90 | 90-degree rotation | cv2.rotate or EXIF-based auto-rotation detection | +15–25% |

**For rotated_90 specifically**: This is trivially fixable with a rotation detection step. Expected F1 for rotated_90 to reach parity with clean after rotation correction.

---

## Improvement Roadmap: ROI Ranking

| Priority | Improvement | Expected F1 Gain | Effort | Risk |
|---|---|---|---|---|
| P0 | Fix candidateFields bug | +2.9 pp | 1 hour | None |
| P0 | Remove documentType from eval | +1.4 pp | 10 min | None |
| P0 | Fix P/R denominator | Metric fix | 30 min | None |
| P0 | Separate scalar/subject metrics | Clarity | 2 hours | None |
| P1 | Add real image input (Gemini Flash) | Establishes true baseline | 1–2 weeks | Low |
| P1 | Establish true image-based F1 baseline | New baseline | 64+ min run | Low |
| P2 | Switch to Qwen2.5-VL-7B for reproducibility | Research quality | 2–3 weeks | Medium |
| P3 | Add 7 missing schema fields | +schema coverage | 1 week | Low |
| P3 | Subject field extraction | +subject F1 from 0% | 3–4 weeks | Medium |
| P4 | Image preprocessing pipeline | +5–25% per profile | 2 weeks | Low |
| P4 | Multi-stage reasoning for complex fields | +5–10% on hard fields | 3 weeks | Medium |
| P5 | Confidence calibration | Metric validity | 1 week | Low |

---

## Realistic End-State Targets (After Full Roadmap)

| Metric | Current (reported) | After Phase 0 (bug fixes) | After Phase 1+2 (image+VLM) | After Phase 3+4 (subjects+preprocessing) |
|---|---|---|---|---|
| Category Accuracy | 100.0% | 100.0% | 90–98% | 90–98% |
| Scalar Field F1 | 17.19%* | ~42.3%** | 60–80% | 65–85% |
| Subject F1 | 0.0% | 0.0% | 0.0% | 55–75% |
| Mean CER | 82.76% | ~60% | 15–35% | 10–25% |
| Exact Match Rate | 0.0% | 0.0% | 5–20% | 10–30% |

\* Artificially depressed by structural defects  
\*\* Correctly measured on actually-covered fields, now properly scoped

> **Note**: These are engineering estimates based on model benchmarks, not empirical measurements. Actual values will be established when image-based evaluation is running. Do not report these as results.
