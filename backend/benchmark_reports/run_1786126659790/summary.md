# AU DIC Benchmark Evaluation Summary

**Run ID**: `run_1786126659790`  
**Timestamp**: `2026-08-07T19:17:04.624Z`  
**Dataset Path**: `C:\github\academicuniverse.com\academicuniverse\ADBG\AU_DIC_Benchmark_v1.0`  
**Duration**: 3564.82s  

---

## 1. Overall Performance Metrics

| Metric | Score | Target Standard | Status |
| :--- | :---: | :---: | :---: |
| **Category Accuracy** | **100.00%** | ≥ 90.00% | PASS |
| **Field F1 Score** | **4.28%** | ≥ 85.00% | WARNING |
| **Mean CER** | **91.51%** | ≤ 5.00% | WARNING |
| **Mean WER** | **95.23%** | ≤ 10.00% | WARNING |
| **Exact Match Rate** | **0.00%** | ≥ 80.00% | WARNING |

---

## 2. Quality Profile Degradation Breakdown

| Quality Profile | Evaluated Samples | Category Accuracy | Mean CER | Mean F1 Score | Exact Match Rate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **clean** | 5 | 100.00% | 91.45% | 4.34% | 0.00% |
| **scanner_copy** | 5 | 100.00% | 91.37% | 4.34% | 0.00% |
| **mobile_camera** | 5 | 100.00% | 91.43% | 4.34% | 0.00% |
| **rotated_90** | 5 | 100.00% | 91.80% | 4.08% | 0.00% |

---

## 3. Document Category Performance Breakdown

| Document Category | Evaluated Samples | Category Accuracy | Mean CER | Mean F1 Score | Exact Match Rate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **certificates** | 4 | 100.00% | 82.70% | 12.24% | 0.00% |
| **marksheets** | 8 | 100.00% | 97.37% | 0.49% | 0.00% |
| **student_ids** | 8 | 100.00% | 90.06% | 4.08% | 0.00% |
---

## 4. Confidence Calibration Metrics

| Confidence Metric | Score | Explanation |
| :--- | :---: | :--- |
| **Average Confidence (Overall)** | **95.00%** | Mean confidence across all evaluations |
| **Average Confidence (Correct)** | **0.00%** | Mean confidence for accurate predictions |
| **Average Confidence (Incorrect)**| **95.00%** | Mean confidence for inaccurate predictions |
| **Overconfidence Gap** | **95.00%** | Calibration discrepancy penalty |

---

## 5. Structured Error Taxonomy Frequency Breakdown

| Error Category | Frequency Count | Description |
| :--- | :---: | :--- |
| **OCR_ERROR** | 79 | Misread characters/digits from raw scan/photo |
| **FIELD_MISSING** | 162 | Ground truth expected value omitted by model |
| **HALLUCINATION** | 0 | Model predicted value not present in ground truth |
| **FORMAT_ERROR** | 33 | Unparseable or invalid date/number string format |
| **NORMALIZATION_ERROR** | 0 | Post-canonical string representation mismatch |
| **PARTIAL_MATCH** | 43 | Partial character similarity (0.01 < CER <= 0.50) |
| **LOW_CONFIDENCE** | 0 | Prediction confidence score < 0.70 |
| **CATEGORY_ERROR** | 0 | Misclassified document type category |

---

## 6. Performance Diagnostics & Quality Profile Leaderboard

| Diagnostic Parameter | Identified Finding | Key Insight |
| :--- | :---: | :--- |
| **Best Performing Profile** | **clean** | Highest field F1 and category classification accuracy |
| **Worst Performing Profile** | **clean** | Profile exhibiting highest decay and error rate |
| **Most Difficult Field** | **studentName** | Field with highest total extraction discrepancies |
| **Most Common Error Class** | **FIELD_MISSING** | Top error taxonomy category across benchmark dataset |
