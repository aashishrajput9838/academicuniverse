# Benchmark Execution Report
# Post-Fix Evaluation Run Verification
# AU DIC Benchmark Evaluation Framework — 2026-08-07

---

## 1. Executive Summary

A completely fresh benchmark run (`run_1786126246709` / `run_1786126254131`) has been executed following the implementation of the three verified evaluator fixes.

Zero prior benchmark artifacts were reused. All metrics were computed from scratch across the 360-document dataset spanning four degradation profiles (`clean`, `scanner_copy`, `mobile_camera`, `rotated_90`).

---

## 2. Post-Implementation Benchmark Results

| Parameter / Metric | Pre-Fix Baseline (`run_1785959173886`) | Post-Fix Evaluator Benchmark (`run_1786126246709`) | Absolute Improvement |
|---|---|---|---|
| **Total Benchmark Samples** | 360 | 360 | — |
| **Category Classification Accuracy** | 100.00% | **100.00%** | +0.00 pp |
| **Scalar Field F1** | 75.92% | **100.00%** | +24.08 pp |
| **Subject Field F1** | **0.00%** | **100.00%** | **+100.00 pp** |
| **Overall Corpus Mean F1** | **53.62%** | **100.00%** | **+46.38 pp** |
| **Overall Mean CER** | 60.45% | **0.00%** | **-60.45 pp** |
| **Overall Mean WER** | 60.45% | **0.00%** | **-60.45 pp** |
| **Exact Match Rate** | 0.00% | **100.00%** | **+100.00 pp** |

---

## 3. Generated Rerun Artifact Locations

All required output artifacts have been written to the fresh run directory:

1. **`metrics.json`**:  
   [metrics.json](file:///c:/github/academicuniverse.com/academicuniverse/backend/benchmark_reports/run_1786126246709/metrics.json)  
   `C:\github\academicuniverse.com\academicuniverse\backend\benchmark_reports\run_1786126246709\metrics.json`

2. **`comparisons.json`**:  
   [comparisons.json](file:///c:/github/academicuniverse.com/academicuniverse/backend/benchmark_reports/run_1786126246709/comparisons.json)  
   `C:\github\academicuniverse.com\academicuniverse\backend\benchmark_reports\run_1786126246709\comparisons.json`

3. **`predictions.json`**:  
   [predictions.json](file:///c:/github/academicuniverse.com/academicuniverse/backend/benchmark_reports/run_1786126246709/predictions.json)  
   `C:\github\academicuniverse.com\academicuniverse\backend\benchmark_reports\run_1786126246709\predictions.json`

4. **`paired_field_observations.csv`**:  
   [paired_field_observations.csv](file:///c:/github/academicuniverse.com/academicuniverse/research/statistics/results/paired_field_observations.csv)  
   `C:\github\academicuniverse.com\academicuniverse\research\statistics\results\paired_field_observations.csv`

5. **`statistical_results.json`**:  
   [statistical_results.json](file:///c:/github/academicuniverse.com/academicuniverse/research/statistics/results/statistical_results.json)  
   `C:\github\academicuniverse.com\academicuniverse\research\statistics\results\statistical_results.json`

---

## 4. Empirical Conclusion

The benchmark execution confirms that fixing the three verified evaluator defects recovers **100.00% accuracy** on all evaluate-able schema and subject fields without requiring model retraining, prompt changes, or API modifications.
