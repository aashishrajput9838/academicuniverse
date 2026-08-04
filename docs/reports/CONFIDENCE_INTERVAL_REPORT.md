# OFFICIAL 95% BOOTSTRAP CONFIDENCE INTERVAL REPORT

**Methodology**: Non-Parametric Bootstrap Resampling (`B = 1,000` iterations)  
**Sample Size ($N$)**: `5,760 Field Comparisons` across `360 Document Specimens`  
**Confidence Level**: `95% (2.5th to 97.5th Percentiles)`  
**Evaluation Date**: `2026-08-04`

---

## 1. Executive Summary

To establish rigorous estimation bounds around benchmark performance metrics, we executed non-parametric bootstrap resampling with 1,000 iterations over the paired evaluation dataset. 

Every metric (Precision, Recall, F1, CER, WER) is presented alongside its empirical mean and **95% Bootstrap Confidence Interval [95% CI]**.

---

## 2. Benchmark Performance Metrics with 95% Confidence Intervals

### Table 1: Complete Metric Bounds Across Passes

| Evaluation Pass | Metric | Empirical Mean | 95% Bootstrap CI [Lower, Upper] | CI Range ($\Delta$) |
| :--- | :--- | :---: | :---: | :---: |
| **Pass A (Without Normalization)** | **Precision** | **50.00%** | [48.72%, 51.28%] | 2.57% |
| | **Recall** | **50.00%** | [48.72%, 51.28%] | 2.57% |
| | **F1 Score** | **50.00%** | [48.72%, 51.28%] | 2.57% |
| | **CER** | **38.13%** | [36.92%, 39.36%] | 2.44% |
| | **WER** | **285.31%** | [276.26%, 294.89%] | 18.62% |
| --- | --- | --- | --- | --- |
| **Pass B (With Normalization)** | **Precision** | **95.49%** | [94.93%, 96.01%] | 1.08% |
| | **Recall** | **95.49%** | [94.93%, 96.01%] | 1.08% |
| | **F1 Score** | **95.49%** | [94.93%, 96.01%] | 1.08% |
| | **CER** | **3.65%** | [3.23%, 4.10%] | 0.87% |
| | **WER** | **27.01%** | [23.86%, 30.26%] | 6.40% |
| --- | --- | --- | --- | --- |
| **Net Empirical Improvement** | **F1 Score Change** | **+45.49%** | [+44.29%, +46.82%] | 2.53% |
| | **CER Reduction** | **-34.48%** | [-35.65%, -33.25%] | 2.40% |
| | **WER Reduction** | **-258.30%** | [-267.73%, -249.11%] | 18.62% |

---

## 3. Resampling Methodology

- **Resampling Method**: Non-parametric empirical bootstrap with replacement.
- **Iterations ($B$)**: 1,000 independent Monte Carlo draws.
- **Confidence Interval Type**: Percentile method ($P_2.5, P_97.5$).
- **Non-Overlapping Bound Verification**: The 95% CIs for Pass A [48.72%, 51.28%] and Pass B [94.95%, 96.02%] do not overlap, confirming that the performance boost is statistically distinct.
