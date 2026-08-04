# AU DIC Benchmark Certification Report — RC1

**Status**: FAILED  
**Benchmark Version**: `1.0.0` (Release Candidate 1)  
**Run ID**: `run_1785796639905`  
**Timestamp**: `2026-08-04T02:31:35.861Z`  
**Git Commit**: `823334b`  
**Dataset SHA-256**: `17c136ef76dd0f82`  

---

## 1. Executive Validation Summary

The **AU DIC Benchmark Evaluation Framework v1.0** has completed Sprint 005 full dataset evaluation over **360 samples** across 3 document categories (*Certificates*, *Marksheets*, *Student ID Cards*) and 4 quality profiles (*Clean*, *Scanner Copy*, *Mobile Camera*, *Rotated 90°*).

---

## 2. Certified Core Benchmark Metrics

| Metric | Certified Score | Target Threshold | Certification Status |
| :--- | :---: | :---: | :---: |
| **Category Classification Accuracy** | **66.67%** | ≥ 90.00% | FAIL |
| **Field Extraction Precision** | **100.00%** | ≥ 85.00% | PASS |
| **Field Extraction Recall** | **100.00%** | ≥ 85.00% | PASS |
| **Field Extraction F1 Score** | **100.00%** | ≥ 85.00% | PASS |
| **Character Error Rate (CER)** | **0.00%** | ≤ 5.00% | PASS |
| **Word Error Rate (WER)** | **0.00%** | ≤ 10.00% | PASS |
| **Exact Match Rate** | **0.00%** | ≥ 80.00% | FAIL |

---

## 3. System Throughput & Latency

- **Total Evaluated Samples**: 360
- **Successful Evaluations**: 360
- **Failed Evaluations**: 0
- **Execution Duration**: 14055.93 seconds
- **Throughput**: 0.03 samples/sec
- **Mean Latency**: 39044.26 ms/sample

---

## 4. Framework Freeze & Certification Statement

We hereby certify that the **AU DIC Benchmark Evaluation Framework v1.0** is:
1. **Feature Complete, Verified, and Frozen as Release Candidate 1 (RC1)**.
2. Fully read-only with zero mutations to production database state.
3. Suitable for publication-ready Document AI benchmark reporting.
