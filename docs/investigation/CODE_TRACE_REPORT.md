# Code Trace Report
# End-to-End Pipeline Execution Trace
# AU DIC Benchmark Evaluation Framework

---

## 1. Complete Pipeline Execution Trace

The pipeline execution flow spans eight distinct stages from dataset discovery to final metric report generation.

```
Stage 1: Ground Truth Discovery & Loading
  │  File: backend/src/benchmark/runner/BenchmarkRunner.ts (lines 54-100)
  │  File: backend/src/benchmark/adapters/AdbgGroundTruthAdapter.ts (lines 33-119)
  ▼
Stage 2: Sample Prediction Payload Assembly
  │  File: backend/src/benchmark/adapters/AuDicPredictionAdapter.ts (lines 72-119)
  ▼
Stage 3: AI Inference Provider Dispatch
  │  File: backend/src/core/ai/groq.provider.ts (lines 20-56)
  ▼
Stage 4: AI Response Deserialization
  │  File: backend/src/core/ai/groq.provider.ts (line 55)
  ▼
Stage 5: Benchmark Prediction Record Construction
  │  File: backend/src/benchmark/adapters/AuDicPredictionAdapter.ts (lines 138-154)
  ▼
Stage 6: Canonical Field & Key Normalization
  │  File: backend/src/benchmark/evaluators/FieldLevelEvaluator.ts (lines 37-41)
  │  File: backend/src/benchmark/normalizers/CanonicalNormalizer.ts (lines 20-61)
  ▼
Stage 7: Field Comparison & String Distance Metrics
  │  File: backend/src/benchmark/evaluators/FieldLevelEvaluator.ts (lines 44-76)
  │  File: backend/src/benchmark/comparators/ExactMatchComparator.ts (lines 14-69)
  │  File: backend/src/benchmark/comparators/StringDistanceComparator.ts (lines 44-76)
  ▼
Stage 8: Benchmark Report & Metric Aggregation
     File: backend/src/benchmark/metrics/MetricCalculator.ts (lines 26-151)
     File: backend/src/benchmark/reports/ReportGenerator.ts (lines 20-85)
```

---

## 2. Detailed Stage Transformation Map

### Stage 1: Ground Truth Loading
- **Input**: Rel path to ADBG GT JSON file (e.g. `groundtruth/certificates/DOC-00DFAED9_clean.json`).
- **Processing**: Reads file content via `fs.readFileSync`, parses JSON. Maps `student.*`, `university.*`, `cgpa`, `issue_date`, `document_type` to `extractedFields` dictionary.
- **Output**: `BenchmarkGroundTruth` object containing `sampleId`, `documentType`, `qualityProfile`, `pngPath`, `pdfPath`, `extractedFields`.

### Stage 2: Prompt Construction (The Critical Leakage Point)
- **Input**: `BenchmarkGroundTruth` object from Stage 1.
- **Processing**: Reads keys `student_name`, `roll_number`, `enrollment_number`, `degree_name`, `branch_name`, `batch_years`, `cgpa`, `issue_date`, `university_name`, `university_code` directly from `sample.extractedFields` and concatenates them into a text prompt.
- **Output**: Text prompt string `Analyze document:\nDocument ID: ...\nstudent_name: ...`.

### Stage 3: LLM Inference
- **Input**: User text prompt + System instruction string.
- **Processing**: Sends HTTP POST request to `https://api.groq.com/openai/v1/chat/completions` with model `llama-3.1-8b-instant` and `response_format: { type: 'json_object' }`.
- **Output**: Raw HTTP response JSON string containing assistant message choices.

### Stage 4 & 5: Deserialization & Prediction Packaging
- **Input**: Assistant response string.
- **Processing**: Executes `JSON.parse(content)`. Packages resulting object into `BenchmarkPrediction` containing `documentCategory`, `extractedEntities`, `candidateFields`.
- **Output**: `BenchmarkPrediction` object.

### Stage 6: Canonical Normalization & Candidate Overwrite
- **Input**: `groundTruth.extractedFields` and `prediction.extractedEntities` / `prediction.candidateFields`.
- **Processing**: Executes `{ ...prediction.extractedEntities, ...prediction.candidateFields }`. Normalizes keys from `snake_case` to `camelCase`. Applies date, numeric, string normalizers. Non-string objects pass through unnormalized.
- **Output**: `canonicalGt` and `canonicalPred` dictionaries.

### Stage 7: Exact Matching & Error Categorization
- **Input**: Pair of canonical GT and Prediction values per field key.
- **Processing**: Runs `ExactMatchComparator.compareField`. If types mismatch (e.g. string vs object), computes CER/WER on stringified representations. Classifies failures into error taxonomy (`FIELD_MISSING`, `OCR_ERROR`, `FORMAT_ERROR`).
- **Output**: Array of `FieldComparisonDetail` objects.

### Stage 8: Metric Aggregation
- **Input**: Array of `SampleComparisonResult` items across 360 benchmark samples.
- **Processing**: Sums precision, recall, F1, CER, WER. Computes macro-averages. Writes `metrics.json`, `comparisons.json`, `predictions.json`, `summary.md`.
- **Output**: `BenchmarkRunReport` directory.
