# Scientific Publication Checklist — AU DIC Benchmark v1.0

**Target Venues**: IEEE Access, IEEE Transactions on Pattern Analysis and Machine Intelligence (TPAMI), Elsevier Pattern Recognition, Scopus Indexed Document Analysis Conferences (ICDAR, DAS).

---

## Publication Component Audit

- [x] **1. Dataset Artifacts**: 360 PDF specimens, 360 PNG renders, 360 Ground Truth JSON files, 360 Metadata JSON files organized cleanly under `pdf/`, `images/`, `groundtruth/`, and `metadata/`.
- [x] **2. Ground Truth Schema**: Fully normalized JSON schema (v1.0.0) capturing student metadata, university details, degree titles, and structured course mark arrays.
- [x] **3. Benchmark Metric Equations**: Formally defined Character Error Rate (CER), Word Error Rate (WER), Exact Match (EM), Precision, Recall, and F1 Score equations.
- [x] **4. Degradation Engine**: 14 optical and physical degradation operators spanning 4 standardized quality profiles (`clean`, `scanner_copy`, `mobile_camera`, `rotated_90`).
- [x] **5. Canonical Normalization Layer**: 6 domain-specific semantic normalizers (`String`, `Date`, `RollNumber`, `Numeric`, `DegreeName`, `UniversityAlias`).
- [x] **6. Error Taxonomy Engine**: 9 structured error categories (`OCR_ERROR`, `NORMALIZATION_ERROR`, `FORMAT_ERROR`, `HALLUCINATION`, `FIELD_MISSING`, `FIELD_EXTRA`, `PARTIAL_MATCH`, `LOW_CONFIDENCE`, `CATEGORY_ERROR`).
- [x] **7. Reproducibility Guarantee**: Deterministic seed architecture, dataset SHA-256 hash (`17c136ef76dd0f82`), Git commit hash (`823334b`), and Node.js/Python environment specifications.
- [x] **8. IEEE LaTeX Exporters**: Automated generation of `tables.tex` rendering Quality Profile Degradation and Error Taxonomy breakdown tables.
- [x] **9. Statistical Export**: CSV exporter generating `results.csv` for Pandas / R statistical significance testing.
- [x] **10. Official Certification**: Self-contained RC1 Certification Report (`certification.md`) verifying 100% pass status.
