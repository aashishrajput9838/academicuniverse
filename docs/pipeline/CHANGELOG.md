# Changelog — AU DIC & ADBG v1.0

All notable changes to the AU DIC Benchmark Evaluation Framework and ADBG v1.0 will be documented in this file.

---

## [1.0.0-RC1] - 2026-08-04

### Added
- **Sprint 005**: Executed full read-only benchmark run across all 360 ground truth samples in `AU_DIC_Benchmark_v1.0`. Generated `certification.md`, `reproducibility.json`, `tables.tex`, and `results.csv`.
- **Sprint 004**: Implemented Checkpoint & Resume engine (`checkpoint.json`), worker pool concurrency, failed sample archiving (`failed_samples/`), dataset SHA-256 hashing, IEEE LaTeX table exporter (`LatexTableExporter`), and CSV exporter (`CsvExporter`).
- **Sprint 003**: Built Quality Profile Leaderboard, Field Robustness Matrix, Error Heatmap, Performance Diagnostics, and `GradeIntegrityEvaluator`.
- **Sprint 002**: Built specialized document evaluators (`CertificateEvaluator`, `MarksheetEvaluator`, `StudentIdEvaluator`), `ConfusionMatrixEvaluator`, Confidence Calibration metrics (`ConfidenceMetrics`), and Structured Error Taxonomy Engine (`ErrorTaxonomyEvaluator`).
- **Normalization Layer**: Created dedicated canonical normalization layer (`CanonicalNormalizer`, `StringNormalizer`, `DateNormalizer`, `RollNumberNormalizer`, `NumericNormalizer`, `DegreeNameNormalizer`, `UniversityAliasNormalizer`).
- **Sprint 001**: Created isolated read-only benchmark subsystem under `backend/src/benchmark/` with zero MongoDB database side-effects.

### Changed
- Restructured generated dataset hierarchy under `AU_DIC_Benchmark_v1.0` into clean `pdf/`, `images/`, `groundtruth/`, and `metadata/` subdirectories.

### Frozen
- **ADBG v1.0 Engine & Benchmark Dataset**: Frozen as immutable upstream dependency.
- **AU DIC Benchmark Subsystem**: Frozen as Release Candidate 1 (RC1).
