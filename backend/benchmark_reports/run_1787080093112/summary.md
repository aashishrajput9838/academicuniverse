# AU DIC Benchmark Evaluation Summary

**Run ID**: `run_1787080093112`  
**Timestamp**: `2026-08-18T22:37:42.190Z`  
**Dataset Path**: `C:\github\academicuniverse\ADBG\AU_DIC_Benchmark_v1.0`  
**Duration**: 12569.03s  

---

## 1. Overall Performance Metrics

| Metric | Score | Target Standard | Status |
| :--- | :---: | :---: | :---: |
| **Category Accuracy** | **85.00%** | ≥ 90.00% | WARNING |
| **Field F1 Score** | **18.20%** | ≥ 85.00% | WARNING |
| **Mean CER** | **86.79%** | ≤ 5.00% | WARNING |
| **Mean WER** | **88.92%** | ≤ 10.00% | WARNING |
| **Exact Match Rate** | **0.00%** | ≥ 80.00% | WARNING |

---

## 2. Quality Profile Degradation Breakdown

| Quality Profile | Evaluated Samples | Category Accuracy | Mean CER | Mean F1 Score | Exact Match Rate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **clean** | 8 | 87.50% | 90.37% | 13.60% | 0.00% |
| **scanner_copy** | 5 | 80.00% | 84.70% | 21.69% | 0.00% |
| **mobile_camera** | 6 | 83.33% | 84.23% | 22.04% | 0.00% |
| **rotated_90** | 1 | 100.00% | 83.97% | 14.63% | 0.00% |

---

## 3. Document Category Performance Breakdown

| Document Category | Evaluated Samples | Category Accuracy | Mean CER | Mean F1 Score | Exact Match Rate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **certificates** | 8 | 62.50% | 85.57% | 20.08% | 0.00% |
| **marksheets** | 3 | 100.00% | 96.70% | 4.93% | 0.00% |
| **student_ids** | 9 | 100.00% | 84.57% | 20.96% | 0.00% |
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
| **OCR_ERROR** | 2 | Misread characters/digits from raw scan/photo |
| **FIELD_MISSING** | 241 | Ground truth expected value omitted by model |
| **HALLUCINATION** | 0 | Model predicted value not present in ground truth |
| **FORMAT_ERROR** | 1 | Unparseable or invalid date/number string format |
| **NORMALIZATION_ERROR** | 0 | Post-canonical string representation mismatch |
| **PARTIAL_MATCH** | 17 | Partial character similarity (0.01 < CER <= 0.50) |
| **LOW_CONFIDENCE** | 0 | Prediction confidence score < 0.70 |
| **CATEGORY_ERROR** | 0 | Misclassified document type category |

---

## 6. Performance Diagnostics & Quality Profile Leaderboard

| Diagnostic Parameter | Identified Finding | Key Insight |
| :--- | :---: | :--- |
| **Best Performing Profile** | **clean** | Highest field F1 and category classification accuracy |
| **Worst Performing Profile** | **clean** | Profile exhibiting highest decay and error rate |
| **Most Difficult Field** | **enrollmentNumber** | Field with highest total extraction discrepancies |
| **Most Common Error Class** | **FIELD_MISSING** | Top error taxonomy category across benchmark dataset |
