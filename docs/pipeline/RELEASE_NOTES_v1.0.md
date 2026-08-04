# AU DIC Benchmark Evaluation Framework v1.0 — Release Notes (RC1)

**Release Version**: 1.0.0 (Release Candidate 1 - RC1)  
**Release Date**: August 4, 2026  
**Status**: **FROZEN & CERTIFIED**  

---

## Key Highlights

1. **ADBG v1.0 Data Fabricator & Degradation Engine**:
   - Synthetic data fabricator generating 360 multi-page PDF/PNG academic document specimens across 3 categories (*Degree Certificates*, *Academic Marksheets*, *Student ID Cards*).
   - 14 optical & physical degradation operators across 4 quality profiles (`clean`, `scanner_copy`, `mobile_camera`, `rotated_90`).
   - Deterministic seed management architecture guaranteeing 100% reproducible specimens.

2. **AU DIC Benchmark Subsystem (`backend/src/benchmark/`)**:
   - Strictly read-only evaluation framework decoupled from Express REST routes and MongoDB collections.
   - Dedicated **Normalization Layer** (`CanonicalNormalizer`, `DateNormalizer`, `RollNumberNormalizer`, `NumericNormalizer`, `DegreeNameNormalizer`, `UniversityAliasNormalizer`).
   - **Structured Error Taxonomy Engine** categorizing field discrepancies into 9 standard classes (`OCR_ERROR`, `FIELD_MISSING`, `HALLUCINATION`, `FORMAT_ERROR`, `NORMALIZATION_ERROR`, `PARTIAL_MATCH`, `LOW_CONFIDENCE`, `CATEGORY_ERROR`).
   - **Quality Profile Leaderboard**, **Field Robustness Matrix**, and **Error Heatmap** generators.

3. **Checkpoint, Resume & Parallel Execution**:
   - Automatic checkpointing (`checkpoint.json`) enabling seamless recovery from interrupted benchmark runs.
   - Thread-safe worker concurrency pool.
   - Automatic archiving of failed samples into `failed_samples/`.

4. **Scientific Publication Exporters**:
   - Automated export of publication-grade IEEE / Scopus LaTeX tables (`tables.tex`).
   - Statistical CSV export (`results.csv`) and reproducible run metadata (`reproducibility.json`).
   - Official Certification Report (`certification.md`).
