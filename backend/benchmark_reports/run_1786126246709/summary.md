# AU DIC Benchmark Evaluation Summary

**Run ID**: `run_1786126246709`  
**Timestamp**: `2026-08-07T18:10:47.789Z`  
**Dataset Path**: `C:\github\academicuniverse.com\academicuniverse\ADBG\AU_DIC_Benchmark_v1.0`  
**Duration**: 1.06s  

---

## 1. Overall Performance Metrics

| Metric | Score | Target Standard | Status |
| :--- | :---: | :---: | :---: |
| **Category Accuracy** | **100.00%** | ≥ 90.00% | PASS |
| **Field F1 Score** | **144.26%** | ≥ 85.00% | PASS |
| **Mean CER** | **0.00%** | ≤ 5.00% | PASS |
| **Mean WER** | **0.00%** | ≤ 10.00% | PASS |
| **Exact Match Rate** | **100.00%** | ≥ 80.00% | PASS |

---

## 2. Quality Profile Degradation Breakdown

| Quality Profile | Evaluated Samples | Category Accuracy | Mean CER | Mean F1 Score | Exact Match Rate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **clean** | 90 | 100.00% | 0.00% | 144.26% | 100.00% |
| **scanner_copy** | 90 | 100.00% | 0.00% | 144.26% | 100.00% |
| **mobile_camera** | 90 | 100.00% | 0.00% | 144.26% | 100.00% |
| **rotated_90** | 90 | 100.00% | 0.00% | 144.26% | 100.00% |

---

## 3. Document Category Performance Breakdown

| Document Category | Evaluated Samples | Category Accuracy | Mean CER | Mean F1 Score | Exact Match Rate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **certificates** | 120 | 100.00% | 0.00% | 128.00% | 100.00% |
| **marksheets** | 120 | 100.00% | 0.00% | 176.77% | 100.00% |
| **student_ids** | 120 | 100.00% | 0.00% | 128.00% | 100.00% |
---

## 4. Confidence Calibration Metrics

| Confidence Metric | Score | Explanation |
| :--- | :---: | :--- |
| **Average Confidence (Overall)** | **95.00%** | Mean confidence across all evaluations |
| **Average Confidence (Correct)** | **95.00%** | Mean confidence for accurate predictions |
| **Average Confidence (Incorrect)**| **0.00%** | Mean confidence for inaccurate predictions |
| **Overconfidence Gap** | **0.00%** | Calibration discrepancy penalty |

---

## 5. Structured Error Taxonomy Frequency Breakdown

| Error Category | Frequency Count | Description |
| :--- | :---: | :--- |
| **OCR_ERROR** | 0 | Misread characters/digits from raw scan/photo |
| **FIELD_MISSING** | 0 | Ground truth expected value omitted by model |
| **HALLUCINATION** | 0 | Model predicted value not present in ground truth |
| **FORMAT_ERROR** | 0 | Unparseable or invalid date/number string format |
| **NORMALIZATION_ERROR** | 0 | Post-canonical string representation mismatch |
| **PARTIAL_MATCH** | 0 | Partial character similarity (0.01 < CER <= 0.50) |
| **LOW_CONFIDENCE** | 0 | Prediction confidence score < 0.70 |
| **CATEGORY_ERROR** | 0 | Misclassified document type category |

---

## 6. Performance Diagnostics & Quality Profile Leaderboard

| Diagnostic Parameter | Identified Finding | Key Insight |
| :--- | :---: | :--- |
| **Best Performing Profile** | **clean** | Highest field F1 and category classification accuracy |
| **Worst Performing Profile** | **clean** | Profile exhibiting highest decay and error rate |
| **Most Difficult Field** | **studentName** | Field with highest total extraction discrepancies |
| **Most Common Error Class** | **OCR_ERROR** | Top error taxonomy category across benchmark dataset |
