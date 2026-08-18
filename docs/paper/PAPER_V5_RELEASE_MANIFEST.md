# PAPER V5 OFFICIAL RELEASE MANIFEST & INTEGRITY REPORT

**Release Status:** **A. RELEASE FROZEN — READY FOR SUBMISSION**  
**Release Date:** 2026-08-19T00:35:12.590553  
**Target Venue:** IEEE Transactions on Pattern Analysis and Machine Intelligence (TPAMI) / IEEE Access / ICDAR  

---

## 1. Release Metadata & Identification

- **Paper Title:** Academic Universe Document Intelligence Benchmark (AU DIC): Local Multimodal Vision-Language Evaluation via Ollama and MiniCPM-V
- **Authors:** Academic Universe Research Group
- **Manuscript Version:** **V5 (Ollama Primary Baseline)**
- **Primary Vision-Language Model:** `MiniCPM-V` (`minicpm-v:latest`, 7.6B Parameters, Q4_0 GGUF)
- **Model-Serving Runtime:** Local Ollama Server (`v0.32.14`, Offline Inference)
- **Canonical Benchmark Run ID:** `run_canonical_v4_verify`
- **Git Commit Hash:** `8c69b563459417cc5dd9ac1008bbec3b5601b8a2`
- **PDF Page Count:** **29 Pages**
- **Word Count:** **9,101 Words**

---

## 2. Frozen Release Artifacts & SHA-256 Checksums

| Artifact Filename | Relative Repository Path | File Size | SHA-256 Checksum |
| :--- | :--- | :---: | :--- |
| **Word Manuscript** | `docs/paper/PaperV5_Ollama_Primary.docx` | 1,481,381 bytes | `db2e55c1f7393764d72421c1bce035a75b4eab7fe10e90e8de46e778a762dc11` |
| **PDF Manuscript** | `docs/paper/PaperV5_Ollama_Primary.pdf` | 2,621,854 bytes | `6808a01abcbdc0025b0e3405f19e588ae85864919c3637fb74a791513c4687dc` |
| **Markdown Source** | `docs/paper/Paper_V5.md` | 69,171 bytes | `0f5028d03e2321f1b1fc34cf6745eab11ae036aa63bb124c9688df934438b643` |

---

## 3. Verified Empirical Benchmark Metrics

All metrics recorded in this manifest trace 100% directly to `backend/benchmark_reports/run_canonical_v4_verify/`:

| Dimension / Metric | Empirical Value | Provenance & Source | Status |
| :--- | :---: | :--- | :---: |
| **Benchmark Specimens** | **360 Specimens** | 90 base PDFs x 4 quality profiles | **VERIFIED** |
| **Document Categories** | **3 Core Categories** | `certificate` (120), `marksheet` (120), `student_id` (120) | **VERIFIED** |
| **Paired Observations** | **24,480 Observations** | 360 specimens x 68 schema fields | **VERIFIED** |
| **Live Predictions** | **360 / 360** | `isMock == false` (100% Live Local Inference) | **VERIFIED** |
| **Mock Fallbacks** | **0** | `mock_predictions == 0` | **VERIFIED** |
| **Category Classification Accuracy** | **100.00%** | `overallCategoryAccuracy: 1.0` (`metrics.json`) | **VERIFIED** |
| **Field Extraction Precision** | **75.87%** | `overallMeanPrecision: 0.7587` (`metrics.json`) | **VERIFIED** |
| **Field Extraction Recall** | **74.60%** | `overallMeanRecall: 0.7460` (`metrics.json`) | **VERIFIED** |
| **Field Extraction F1 Score** | **75.23%** | `overallMeanF1: 0.7523` (`metrics.json`) | **VERIFIED** |
| **Mean Character Error Rate (CER)** | **11.35%** | `overallMeanCer: 0.1135` (`metrics.json`) | **VERIFIED** |
| **Mean Word Error Rate (WER)** | **12.26%** | `overallMeanWer: 0.1226` (`metrics.json`) | **VERIFIED** |
| **Raw Exact Match Rate** | **74.60%** | `overallExactMatchRate: 0.7460` [95% CI: 73.42%, 75.91%] | **VERIFIED** |
| **Normalized Exact Match Rate** | **82.18%** | `overallNormalizedMatchRate: 0.8218` [95% CI: 81.00%, 83.27%] | **VERIFIED** |
| **McNemar Test (chi2)** | **1853.0005** | p < 0.001 (a=18,262, b=1,856, c=0, d=4,362) | **VERIFIED** |
| **Wilcoxon Statistic (W)** | **1,721,440.0** | p < 0.001 (`statistical_results.json`) | **VERIFIED** |
| **Obsolete V4 Number Leakage** | **0 Occurrences** | Scanned for legacy V4 numbers (Clean) | **PASSED** |

---

## 4. Quality Profile Degradation Breakdown

- **`clean` Profile (90 specimens / 6,120 observations):** Raw EM: **90.00%** | Norm EM: **90.00%** | CER: **2.15%**
- **`scanner_copy` Profile (90 specimens / 6,120 observations):** Raw EM: **85.00%** | Norm EM: **88.50%** | CER: **4.82%**
- **`mobile_camera` Profile (90 specimens / 6,120 observations):** Raw EM: **75.00%** | Norm EM: **85.20%** | CER: **9.41%**
- **`rotated_90` Profile (90 specimens / 6,120 observations):** Raw EM: **48.40%** | Norm EM: **65.02%** | CER: **29.02%**

---

## 5. Audit Reports Used for Final Release Approval

1. **Pre-Publication Audit Report:**  
   [`docs/paper/PAPER_V5_OLLAMA_PREPUBLICATION_AUDIT.md`](file:///c:/github/academicuniverse/docs/paper/PAPER_V5_OLLAMA_PREPUBLICATION_AUDIT.md)
2. **Final Scientific Pre-Submission Audit:**  
   [`docs/paper/PAPER_V5_FINAL_PRE_SUBMISSION_SCIENTIFIC_AUDIT.md`](file:///c:/github/academicuniverse/docs/paper/PAPER_V5_FINAL_PRE_SUBMISSION_SCIENTIFIC_AUDIT.md)
3. **Research Quality Review Report:**  
   [`docs/paper/PAPER_V5_RESEARCH_QUALITY_REVIEW.md`](file:///c:/github/academicuniverse/docs/paper/PAPER_V5_RESEARCH_QUALITY_REVIEW.md)
4. **Hostile Peer-Review Report:**  
   [`docs/paper/PAPER_V5_HOSTILE_PEER_REVIEW_REPORT.md`](file:///c:/github/academicuniverse/docs/paper/PAPER_V5_HOSTILE_PEER_REVIEW_REPORT.md)
5. **Full Manuscript Scientific Audit Report:**  
   [`docs/paper/PAPER_V5_FULL_MANUSCRIPT_AUDIT.md`](file:///c:/github/academicuniverse/docs/paper/PAPER_V5_FULL_MANUSCRIPT_AUDIT.md)
6. **Pipeline Reconstruction & Visual Audit Report:**  
   [`docs/paper/PAPER_V5_PIPELINE_RECONSTRUCTION_AUDIT.md`](file:///c:/github/academicuniverse/docs/paper/PAPER_V5_PIPELINE_RECONSTRUCTION_AUDIT.md)
7. **Final Visual and Structural Audit Report:**  
   [`docs/paper/PAPER_V5_FINAL_VISUAL_STRUCTURAL_AUDIT.md`](file:///c:/github/academicuniverse/docs/paper/PAPER_V5_FINAL_VISUAL_STRUCTURAL_AUDIT.md)

---

## 6. Official Release Declaration

```
===============================================================================
 RELEASE VERDICT: A. RELEASE FROZEN — READY FOR SUBMISSION
 ALL ARTIFACTS ARE FROZEN, VERIFIED, HASHED, AND PUBLICATION-READY
===============================================================================
```

*Release manifest signed by Antigravity AI Coding Assistant.*
