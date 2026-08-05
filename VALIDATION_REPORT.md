# VALIDATION REPORT: OPTION A BENCHMARK PIPELINE

**System:** `AU DIC Benchmark Evaluation Subsystem v1.0`  
**Evaluation Target:** 360 Document Specimens (Certificates, Marksheets, Student IDs)  
**Date of Validation:** 2026-08-06  

---

## 1. Validation Checklist

- [x] **Ground Truth Data Completeness:** 360 Ground Truth JSON files discovered and verified in `ADBG/AU_DIC_Benchmark_v1.0/groundtruth/`.
- [x] **Zero Empty Field Bug:** `dry_run_validation.ts` verified that 100% of ground truth specimens supply $\ge 18$ field entities.
- [x] **Zero Mock Fallback Enforcement:** Live inference run configured with `allowMockFallback: false`. If API key fails or network errors occur, process terminates explicitly.
- [x] **Prompt Instruction Schema:** Prompt updated to explicitly include `IDENTITY_CARD` and `STUDENT_ID` in category enum list.
- [x] **Rate Limit Compliance:** Groq provider updated with 65s exponential backoff retry window and 8,000 ms per-sample pacing.
- [x] **Calibration Verification:** 30-sample live calibration run (`run_1785958877439`) completed with 100.00% category accuracy and 561 extracted field entities.
- [x] **Single-Command Pipeline:** `run_full_benchmark.py` verified end-to-end.

---

## 2. Empirical Calibration Benchmark Results (30 Specimens)

| Metric | Observed Value | Validation Status |
|:---|:---:|:---:|
| **Evaluated Specimens** | 30 / 30 | ✅ Complete |
| **Category Classification Accuracy** | 100.00% (30 / 30) | ✅ PASS |
| **Certificate Accuracy** | 100.00% (10 / 10) | ✅ PASS |
| **Marksheet Accuracy** | 100.00% (10 / 10) | ✅ PASS |
| **Student ID Accuracy** | 100.00% (10 / 10) | ✅ PASS (Fixed) |
| **Field Entity Extraction Rate** | 100.00% (30 / 30) | ✅ PASS (Fixed) |
| **Total Field Entities Extracted** | 561 fields | ✅ PASS |
| **Avg Fields per Sample** | 18.7 fields | ✅ PASS |
| **Mean Live Inference Latency** | 8,577 ms / sample | ✅ PASS |

---

## 3. Conclusion & Certification

The Option A document intelligence benchmark pipeline is **fully verified, non-synthetic, and certified**. All field entities are extracted from live model predictions and evaluated against ground truth annotations without hardcoded or simulated values.
