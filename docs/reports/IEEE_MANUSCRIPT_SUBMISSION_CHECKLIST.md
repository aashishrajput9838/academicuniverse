# IEEE MANUSCRIPT SUBMISSION CHECKLIST

**Manuscript Title**: *ADBG v1.0 & AU DIC Benchmark Evaluation Framework: A Reproducible Synthetic Benchmark Suite and Normalization Pipeline for Academic Document Intelligence*  
**Target Venue**: IEEE Access / ICDAR 2026  
**Auditor**: Publication Quality Assurance Auditor  
**Date**: `2026-08-04`  

---

## 1. Submission Component Verification

| Submission Item | Required File / Location | Status | Verification Detail |
| :--- | :--- | :---: | :--- |
| **Primary Manuscript** | `Paper_V3.md` | **COMPLETE** | Formatted in formal IEEE two-column structure with full metrics |
| **Supplementary Material** | `backend/benchmark_reports/run_1785796639905/` | **COMPLETE** | Contains raw JSON predictions, comparisons, and LaTeX tables |
| **Benchmark Dataset** | `ADBG/AU_DIC_Benchmark_v1.0/` | **COMPLETE** | 360 specimens with Ground Truth and Metadata JSONs |
| **Source Code Suite** | `backend/src/benchmark/` | **COMPLETE** | TypeScript framework with 8 passing Jest test suites |
| **Reproducibility Guide** | `REPRODUCIBILITY_GUIDE.md` | **COMPLETE** | Complete step-by-step CLI execution instructions |
| **Project README** | `README.md` | **COMPLETE** | High-level system overview and installation guide |
| **Open Source License** | `LICENSE` | **COMPLETE** | MIT Open Source License |
| **Citation File** | `CITATION.cff` | **COMPLETE** | Standard CFF citation format |

---

## 2. IEEE Manuscript Formatting & Content Checklist

- [x] **Title**: Concise, academic, free of promotional hype.
- [x] **Abstract**: Under 250 words, contains problem, methodology, empirical results, and key findings.
- [x] **Keywords**: 5–7 standard IEEE index terms included.
- [x] **Equations**: All mathematical formulas numbered sequentially with standard LaTeX delimiters.
- [x] **Figures**: High-resolution Mermaid architecture diagrams embedded with descriptive captions.
- [x] **Tables**: Numbered sequentially (Table 0, Table 1, Table 2) with explicit headers and footnotes.
- [x] **Empirical Metrics**: 100% traceably generated from real inference (`isMock: false`, Run `run_1785796639905`).
- [x] **Ethics Statement**: Full FERPA and GDPR compliance statement included.
- [x] **Reproducibility Specification**: SHA-256 hash (`17c136ef76dd0f82`) and Git commit hash (`823334b`) recorded.

---

## 3. Pre-Flight Verification Sign-Off

```text
============================================================
SUBMISSION PACKAGE PRE-FLIGHT VERIFICATION: PASSED
============================================================
All 8 submission items verified present, valid, and synchronized.
No missing files or unverified claims detected.
============================================================
```
