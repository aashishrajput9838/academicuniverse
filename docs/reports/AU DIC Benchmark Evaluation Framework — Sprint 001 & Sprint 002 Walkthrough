# AU DIC Benchmark Evaluation Framework — Sprint 001 & Sprint 002 Walkthrough

## Sprint 002 Accomplishments

1. **Confidence Evaluation Subsystem**:
   - `ConfidenceMetrics`: Computes Average Confidence (Overall), Average Confidence (Correct Predictions), Average Confidence (Incorrect Predictions), and Overconfidence Gap.
   - Integrated into `MetricCalculator` and rendered into `summary.md` report tables.

2. **Structured Error Taxonomy Engine (`ErrorTaxonomyEvaluator.ts`)**:
   - Categorizes every field-level discrepancy into structured error classes:
     - `OCR_ERROR` (misread characters/digits from scan)
     - `FIELD_MISSING` (expected field omitted by model)
     - `HALLUCINATION` (unrequested or invented field returned)
     - `FORMAT_ERROR` (invalid date/number format)
     - `NORMALIZATION_ERROR` (post-canonical mismatch)
     - `PARTIAL_MATCH` (partial character similarity $0.01 < \text{CER} \le 0.50$)
     - `LOW_CONFIDENCE` (prediction confidence < 0.70)
     - `CATEGORY_ERROR` (document category mismatch)
   - Outputs complete `errorTaxonomySummary` frequency table in `metrics.json` and `summary.md`.

3. **Specialized Document Evaluators & Confusion Matrix**:
   - `CertificateEvaluator.ts`: Evaluates Candidate Name, Issuer, Degree Title, Issue Date, and Credential ID.
   - `MarksheetEvaluator.ts`: Evaluates Roll Number, Student Name, Institution, GPA/CGPA, Total Credits, and Subject Array.
   - `StudentIdEvaluator.ts`: Evaluates Student Name, Roll Number, Enrollment Number, Degree/Branch, and Expiry.
   - `ConfusionMatrixEvaluator.ts`: Generates document category confusion matrix.

4. **100% Verification & Test Suite Pass Rate**:
   - Executed Jest test suite: **5/5 test suites passed (21/21 unit tests passing)**.
   - Executed ADBG test suite: **86/86 unit/integration tests passed (100% pass rate)**.
