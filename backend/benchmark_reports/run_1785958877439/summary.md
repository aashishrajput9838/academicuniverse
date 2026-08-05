# AU DIC Benchmark Evaluation Summary

**Run ID**: `run_1785958877439`  
**Timestamp**: `2026-08-05T19:45:34.748Z`  
**Dataset Path**: `C:\github\academicuniverse.com\academicuniverse\ADBG\AU_DIC_Benchmark_v1.0`  
**Duration**: 257.30s  

---

## 1. Overall Performance Metrics

| Metric | Score | Target Standard | Status |
| :--- | :---: | :---: | :---: |
| **Category Accuracy** | **100.00%** | ≥ 90.00% | PASS |
| **Field F1 Score** | **17.71%** | ≥ 85.00% | WARNING |
| **Mean CER** | **82.35%** | ≤ 5.00% | WARNING |
| **Mean WER** | **84.20%** | ≤ 10.00% | WARNING |
| **Exact Match Rate** | **0.00%** | ≥ 80.00% | WARNING |

---

## 2. Quality Profile Degradation Breakdown

| Quality Profile | Evaluated Samples | Category Accuracy | Mean CER | Mean F1 Score | Exact Match Rate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **clean** | 8 | 100.00% | 84.35% | 15.53% | 0.00% |
| **scanner_copy** | 7 | 100.00% | 80.74% | 19.39% | 0.00% |
| **mobile_camera** | 8 | 100.00% | 82.17% | 17.87% | 0.00% |
| **rotated_90** | 7 | 100.00% | 81.86% | 18.35% | 0.00% |

---

## 3. Document Category Performance Breakdown

| Document Category | Evaluated Samples | Category Accuracy | Mean CER | Mean F1 Score | Exact Match Rate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **certificates** | 12 | 100.00% | 70.29% | 30.30% | 0.00% |
| **marksheets** | 10 | 100.00% | 95.58% | 4.35% | 0.00% |
| **student_ids** | 8 | 100.00% | 83.88% | 15.53% | 0.00% |
---

## 4. Confidence Calibration Metrics

| Confidence Metric | Score | Explanation |
| :--- | :---: | :--- |
| **Average Confidence (Overall)** | **1744.33%** | Mean confidence across all evaluations |
| **Average Confidence (Correct)** | **0.00%** | Mean confidence for accurate predictions |
| **Average Confidence (Incorrect)**| **1744.33%** | Mean confidence for inaccurate predictions |
| **Overconfidence Gap** | **1744.33%** | Calibration discrepancy penalty |

---

## 5. Structured Error Taxonomy Frequency Breakdown

| Error Category | Frequency Count | Description |
| :--- | :---: | :--- |
| **OCR_ERROR** | 64 | Misread characters/digits from raw scan/photo |
| **FIELD_MISSING** | 239 | Ground truth expected value omitted by model |
| **HALLUCINATION** | 0 | Model predicted value not present in ground truth |
| **FORMAT_ERROR** | 16 | Unparseable or invalid date/number string format |
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
| **Most Difficult Field** | **fatherName** | Field with highest total extraction discrepancies |
| **Most Common Error Class** | **FIELD_MISSING** | Top error taxonomy category across benchmark dataset |
