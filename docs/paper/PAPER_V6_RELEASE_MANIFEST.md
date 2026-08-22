# PAPER V6 RELEASE MANIFEST & SCIENTIFIC ARTIFACT AUDIT

**Release Version:** V6 (Primary Publication Manuscript with Restructured Sections 1, 2, 3, and 4)  
**Date of Release:** August 21, 2026  
**Venue Target:** IEEE Access / ICDAR 2026  
**Status:** **OFFICIAL V6 PRODUCTION BUILD** (V5 Frozen & Intact)

---

## 1. Artifact Verification & Integrity Hashes

| Artifact File | Size (Bytes) | SHA-256 Checksum | Verification Status |
| :--- | :---: | :--- | :---: |
| `docs/paper/PaperV6_Ollama_Primary.docx` | 2,115,387 | `4f7e10b8232dbdf20700118c1a1ad3d5eb79490a515c76bb1498fbd7e48b9e04` | **VERIFIED** |
| `docs/paper/PaperV6_Ollama_Primary.pdf` | 1,616,684 | `d7f35db242f2d7821fbaf2ed4361b613b9269462c55c751c84ab288712a5ec53` | **VERIFIED (27 Pages)** |
| `docs/paper/Paper_V6.md` | 51,059 | `3f130b3b79099b46bf324b0e2372a847bcd928649bd16fa2406b58b90fc960bf` | **VERIFIED** |

---

## 2. Section 4 Restructuring Summary

### Section 4 — Experimental Setup
- **4.1 Experimental Environment:** Documents verified computing hardware (HP EliteBook 840 G8, Intel Core i7, 16 GB DDR4 RAM, CPU-only inference) and software runtime (Windows 11 Pro 64-bit, Python 3.14.x, Node.js v18.x, npm v9.x, Ollama v0.32.14 local model serving engine, MiniCPM-V ~7.6B Q4_0 GGUF). Accompanied by **Table II: Experimental Computing Environment**.
- **4.2 Dataset and Benchmark Composition:** Explains the hierarchical dataset structure (90 original templates -> 360 rendered specimens -> 24,480 paired field observations across Certificates, Marksheets, and Student ID Cards; weighted mean of 68.0 fields/specimen). Accompanied by **Table III: Dataset and Benchmark Composition** and **Table IV: Optical Quality Degradation Profiles** (`clean`, `scanner_copy`, `mobile_camera`, `rotated_90`).
- **4.3 Experimental Configuration and Parameters:** Comprehensive parameter matrix detailing zero-shot evaluation, decoding temperature T = 0.2, max tokens 8192, seed 42, `allowMockFallback: false`, `isReadOnly: true`, bootstrap B = 10,000, and significance alpha = 0.05. Accompanied by **Table V: Canonical Experimental Configuration Parameters**.
- **4.4 Experimental Procedure and Evaluation Protocol:** Complete fifteen-step execution lifecycle detailing deterministic entity synthesis, Typst compilation, ground-truth assembly, optical degradation, zero-shot neural inference, two-pass normalization, error taxonomist routing, and statistical validation.
- **4.5 Evaluation Metrics and Mathematical Formulation:** Rigorous prose defining all mathematical symbols and consolidated **Table VI: Quantitative Evaluation Metrics and Mathematical Formulation** (16 metrics with exact formulas).
- **4.6 Reproducibility Information:** Summarizes verified provenance metadata including canonical execution timestamp (`2026-08-05T20:50:48.067Z`), run identifier (`run_1785959173886`), Git commit (`88140d1`), repository URL, dataset SHA-256 hash (`17c136ef76dd0f82`), and cross-references to Appendix A.

---

## 3. Scientific Invariance & Frozen V5 Baseline Verification

- **Paper V5 Frozen Status:** `PaperV5_Ollama_Primary.docx`, `PaperV5_Ollama_Primary.pdf`, `Paper_V5.md`, and `PAPER_V5_RELEASE_MANIFEST.md` are unmodified.
- **Empirical Metrics Invariance:** Field F1 (75.23%), Raw Exact Match (74.60%), Normalized Exact Match (82.18%), CER (11.35%), WER (8.21%), Total Observations (24,480), Evaluated Specimens (360), Category Accuracy (100.00%).

**Audit Sign-off:** Automated Release Audit completed successfully with zero defects.
