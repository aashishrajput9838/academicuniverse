# AU DIC Benchmark Evaluation Summary

**Run ID**: `run_phase_b_1786135089489`  
**Timestamp**: `2026-08-07T21:17:09.093Z`  
**Dataset Path**: `C:\github\academicuniverse.com\academicuniverse\ADBG\AU_DIC_Benchmark_v1.0`  
**Duration**: 2339.58s  

---

## 1. Overall Performance Metrics

| Metric | Score | Target Standard | Status |
| :--- | :---: | :---: | :---: |
| **Category Accuracy** | **100.00%** | ≥ 90.00% | PASS |
| **Field F1 Score** | **1.21%** | ≥ 85.00% | WARNING |
| **Mean CER** | **95.78%** | ≤ 5.00% | WARNING |
| **Mean WER** | **98.96%** | ≤ 10.00% | WARNING |
| **Exact Match Rate** | **0.00%** | ≥ 80.00% | WARNING |

---

## 2. Quality Profile Degradation Breakdown

| Quality Profile | Evaluated Samples | Category Accuracy | Mean CER | Mean F1 Score | Exact Match Rate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **clean** | 2 | 100.00% | 95.58% | 0.70% | 0.00% |
| **scanner_copy** | 2 | 100.00% | 95.96% | 0.69% | 0.00% |
| **mobile_camera** | 2 | 100.00% | 95.81% | 0.00% | 0.00% |
| **rotated_90** | 1 | 100.00% | 95.78% | 5.71% | 0.00% |

---

## 3. Document Category Performance Breakdown

| Document Category | Evaluated Samples | Category Accuracy | Mean CER | Mean F1 Score | Exact Match Rate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **certificates** | 0 | 0.00% | 0.00% | 0.00% | 0.00% |
| **marksheets** | 3 | 100.00% | 97.54% | 0.93% | 0.00% |
| **student_ids** | 4 | 100.00% | 94.46% | 1.43% | 0.00% |
---

## 4. Confidence Calibration Metrics

| Confidence Metric | Score | Explanation |
| :--- | :---: | :--- |
| **Average Confidence (Overall)** | **100.00%** | Mean confidence across all evaluations |
| **Average Confidence (Correct)** | **0.00%** | Mean confidence for accurate predictions |
| **Average Confidence (Incorrect)**| **100.00%** | Mean confidence for inaccurate predictions |
| **Overconfidence Gap** | **100.00%** | Calibration discrepancy penalty |

---

## 5. Structured Error Taxonomy Frequency Breakdown

| Error Category | Frequency Count | Description |
| :--- | :---: | :--- |
| **OCR_ERROR** | 15 | Misread characters/digits from raw scan/photo |
| **FIELD_MISSING** | 83 | Ground truth expected value omitted by model |
| **HALLUCINATION** | 0 | Model predicted value not present in ground truth |
| **FORMAT_ERROR** | 3 | Unparseable or invalid date/number string format |
| **NORMALIZATION_ERROR** | 0 | Post-canonical string representation mismatch |
| **PARTIAL_MATCH** | 15 | Partial character similarity (0.01 < CER <= 0.50) |
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
