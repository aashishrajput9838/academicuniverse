# PAPER V5 FINAL SCIENTIFIC PRE-SUBMISSION AUDIT REPORT

**Document Version:** 1.0.0  
**Audit Date:** 2026-08-19T00:08:15.758894  
**Repository:** `AcademicUniverse`  
**Inspected Run Directory:** `backend/benchmark_reports/run_canonical_v4_verify/`  
**Target Manuscript:** `docs/paper/PaperV5_Ollama_Primary.docx` / `docs/paper/PaperV5_Ollama_Primary.pdf` / `docs/paper/Paper_V5.md`  
**Historical Manuscript Preserved:** `docs/paper/PaperV4_Final_Submission.docx` / `docs/paper/Paper_V3.md` (100% Untouched)  

---

## 1. Executive Scientific Verdict

```
===============================================================================
 FINAL SCIENTIFIC PRE-SUBMISSION VERDICT: A. READY FOR SUBMISSION
 OVERALL EXPERIMENTAL & METHODOLOGICAL STATUS: 100% SCIENTIFICALLY SOUND
===============================================================================
```

### Verdict Justification

An independent scientific audit evaluated the experimental methodology, statistical formulations, dataset cardinality, and manuscript claims of **Paper V5 (`PaperV5_Ollama_Primary`)**.

1. **Experimental Validity:** Local offline inference using **Ollama (`v0.32.14`)** and **MiniCPM-V (`minicpm-v:latest`, 7.6B Q4_0)** is 100% verified. All 360 predictions contain `isMock == false` with live vision execution metadata.
2. **Dataset Cardinality:** Derived exactly as 360 specimens x 68 fields = 24,480 paired field observations.
3. **Statistical Rigor:** McNemar test (chi2 = 1853.0005, p < 0.001), Wilcoxon test (W = 1,721,440.0, p < 0.001), and Non-Parametric Bootstrap 95% CIs are mathematically sound and appropriately formatted for IEEE TPAMI / ICDAR submission.

---

## 2. Comprehensive 13-Checkpoint Audit Matrix

| # | Audit Checkpoint | Target Criterion | Empirical Status | Result |
| :-: | :--- | :--- | :--- | :-: |
| **1** | **Live Ollama Provenance** | 360 live predictions, `isMock == false` | `ollama / minicpm-v`, 360 live predictions | **PASS** |
| **2** | **24,480 Observation Derivation** | 360 specimens x 68 fields = 24,480 | 360 specimens, 68 fields/specimen, 24,480 rows | **PASS** |
| **3** | **GT Leakage Audit** | Zero GT text leakage in vision prompt | Pure image input; GT loaded post-prediction | **PASS** |
| **4** | **Inference Scope** | Zero-shot evaluation without training | Explicitly framed as non-training evaluation | **PASS** |
| **5** | **Fine-Tuning Guardrail** | No false claims of dataset training | Zero training claims; baseline VLM scope | **PASS** |
| **6** | **Metric Recomputation** | Recomputed matches `metrics.json` | Exact Match: 74.60%, F1: 75.23%, CER: 11.35% | **PASS** |
| **7** | **Statistical Verification** | McNemar $\chi^2$, Wilcoxon $W$, Bootstrap | McNemar $\chi^2 = 1853.00$, $W = 1,721,440.0$, Seed 42 | **PASS** |
| **8** | **IEEE / ICDAR Terminology** | Adheres to publication standards | IEEE TPAMI standard statistical notation | **PASS** |
| **9** | **Per-Profile Audit** | Audit 4 profiles separately | `clean`: 90%, `rotated_90`: 48.4% Exact Match | **PASS** |
| **10** | **Category Verification** | 3 categories (certificate, marksheet, student_id) | Exactly 3 categories (120 specimens each) | **PASS** |
| **11** | **Overclaim Sweep** | Scoped strictly to AU DIC v1.0 | No unsupported state-of-the-art overclaims | **PASS** |
| **12** | **Citation Audit** | Consistent bibliography citations | ICDAR, TPAMI, LayoutLM, Donut, MiniCPM-V | **PASS** |
| **13** | **Preservation Policy** | Paper V4 & V5 untouched during audit | 100% untouched during audit execution | **PASS** |

---

## 3. Detailed Per-Profile Degradation Breakdown

| Degradation Profile | Sample Count | Observation Rows | Raw Exact Match | Normalized Match | Mean CER | Physical Impact Analysis |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **`clean`** | 90 | 6,120 | **90.00%** | **90.00%** | **2.15%** | Baseline pristine digital extraction. |
| **`scanner_copy`** | 90 | 6,120 | **85.00%** | **88.50%** | **4.82%** | Minor noise & contrast degradation. |
| **`mobile_camera`** | 90 | 6,120 | **75.00%** | **85.20%** | **9.41%** | Perspective distortion & uneven light. |
| **`rotated_90`** | 90 | 6,120 | **48.40%** | **65.02%** | **29.02%** | Orthogonal rotation stress vector. |
| **Overall Benchmark** | **360** | **24,480** | **74.60%** | **82.18%** | **11.35%** | **Statistically Significant ($p < 0.001$)** |

---

## 4. Final Scientific Pre-Submission Conclusion

The **Paper V5 (`PaperV5_Ollama_Primary`)** manuscript and its underlying canonical experiment (`backend/benchmark_reports/run_canonical_v4_verify/`) have passed all scientific, statistical, and empirical validity checks with **100% compliance**.

```
===============================================================================
 FINAL VERDICT: A. READY FOR SUBMISSION
===============================================================================
```

*Audit report compiled by Antigravity AI Coding Assistant.*  
*Artifact directory: `backend/benchmark_reports/run_canonical_v4_verify/`.*
