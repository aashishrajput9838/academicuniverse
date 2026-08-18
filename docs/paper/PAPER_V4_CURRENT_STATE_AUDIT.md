# SCIENTIFIC CONSISTENCY AUDIT REPORT: PAPER V4 VS. CURRENT CODEBASE

**Audited Manuscript**: [`docs/paper/PaperV4_Final_Submission.docx`](file:///c:/github/academicuniverse/docs/paper/PaperV4_Final_Submission.docx) (and source [`docs/paper/Paper_V3.md`](file:///c:/github/academicuniverse/docs/paper/Paper_V3.md))  
**Associated Commit**: `ca20671` / `8c69b56`  
**Audit Date**: August 18, 2026  
**Auditor**: Antigravity AI — Scientific Verification & Software Audit Subsystem  

---

## A. Executive Verdict

**Verdict Status**: **`INCONSISTENCIES DETECTED — REPRODUCIBILITY ARTIFACTS DIVERGED`**

The manuscript [`PaperV4_Final_Submission.docx`](file:///c:/github/academicuniverse/docs/paper/PaperV4_Final_Submission.docx) accurately reflects the **Phase 15 live benchmark run (`run_1785959173886`)** executed around commit `ca20671`. However, subsequent pipeline overhauls, test runs, and dry-run executions (commit `8c69b56` and subsequent `run_phase_b_*` runs) have caused the active repository state to diverge from the manuscript in three major ways:

1. **Local Statistical Artifact Overwrite**: The active dataset on disk (`research/statistics/results/paired_field_observations.csv`) was overwritten by a 24,120-row mock/dry-run ground-truth alignment dataset (where CER = 0.00% and Match = 100%), which contradicts both the manuscript's reported live metrics ($N=24,480$, Raw Exact Match = 10.16%, CER = 82.76%) and the `STATISTICAL_REPRODUCIBILITY_REPORT.md` file.
2. **Hardcoded Session Artifact Paths**: `run_full_benchmark.py` (Line 70) currently references a hardcoded brain session scratch path (`C:/Users/.../brain/bae1c6d3-6817-4888-9477-7935d97c3f3c/scratch/create_perprofile_gt.py`), rendering full single-command reproduction broken out-of-the-box on clean environments.
3. **Multi-Provider Engine Expansion**: Commit `8c69b56` introduced multi-LLM provider support (Groq, OpenRouter, Gemini), whereas the manuscript claims a singular primary Groq Llama-3.2-11b-Vision execution.

---

## B. Itemized Audit of 26 Scope Areas

### 1. Benchmark Dataset — ✅ VALID
- **Paper Claim**: ADBG v1.0 benchmark dataset covering 5 academic document types (Degree Certificates, Marksheets, Transcripts, Student IDs, Timetables).
- **Current Codebase State**: Ground truth templates and schema generators in `ADBG/AU_DIC_Benchmark_v1.0/` fully implement all 5 document categories with 90 per-profile GT files.

### 2. 360 Specimens — ✅ VALID
- **Paper Claim**: 360 synthetic specimens (72 per document category across 4 quality degradation profiles: `clean`, `scanner_copy`, `mobile_camera`, `rotated_90`).
- **Current Codebase State**: Confirmed. `run_full_benchmark.py` and `src/benchmark/runner/run_live_benchmark.ts` generate and evaluate 360 distinct specimen files.

### 3. 24,480 Paired Field Observations — ⚠️ OUTDATED / ❌ CONTRADICTED ON DISK
- **Paper Claim**: $N = 24,480$ total paired field observations across all evaluated document specimens and fields.
- **Current Codebase State**: `STATISTICAL_REPRODUCIBILITY_REPORT.md` logs $N = 24,480$. However, `research/statistics/results/paired_field_observations.csv` currently sitting on disk contains **24,120 rows** due to a dry-run mock overwrite.

### 4. Ground-Truth Definitions — ✅ VALID
- **Paper Claim**: Ground truth JSON files contain canonicalized field keys (`studentName`, `rollNumber`, `cgpa`, `courseCode`, etc.).
- **Current Codebase State**: Ground truth files in `ADBG/AU_DIC_Benchmark_v1.0/groundtruth/` match exact schema contracts.

### 5. Evaluator Implementation — ⚠️ OUTDATED
- **Paper Claim**: TypeScript-based `AcademicUniverseDICRunner` with `run_live_benchmark.ts`.
- **Current Codebase State**: Commit `8c69b56` refactored evaluator logic, moving providers under `backend/src/core/ai/` and adding `benchmarks/evaluators/`.

### 6. Subject-Array Evaluation — ✅ VALID
- **Paper Claim**: Nested array field evaluation for marksheets and timetables (evaluating individual subject rows, course codes, and grades).
- **Current Codebase State**: Supported in `backend/src/services/normalizers/` and `generate_field_dataset.py`.

### 7. Course-Code Matching — ✅ VALID
- **Paper Claim**: Standardized matching for course codes (e.g., `CSE-101` vs `CSE101`).
- **Current Codebase State**: String canonicalizer in `backend/src/services/` strips whitespace, hyphens, and casing for normalized comparison.

### 8. Recursive Normalization — ✅ VALID
- **Paper Claim**: Multi-pass recursive normalization pipeline applying date standardizers, grade lookups, and text canonicalization.
- **Current Codebase State**: Implemented across `backend/src/services/` and `utils/`.

### 9. Predicted-Field Counting — ✅ VALID
- **Paper Claim**: Field extraction counts all expected vs. predicted key-value pairs.
- **Current Codebase State**: Code in `generate_field_dataset.py` accurately unpacks nested dictionaries and arrays into flat field rows.

### 10. Precision / Recall / F1 Formulas — ✅ VALID
- **Paper Claim**: Standard micro-averaged Precision, Recall, and F1 definitions applied per field.
- **Current Codebase State**: Mathematical formulas in `benchmarks/metrics/` match standard definitions.

### 11. CER / WER — ✅ VALID
- **Paper Claim**: Character Error Rate (Levenshtein distance / max length) and Word Error Rate.
- **Current Codebase State**: Implemented via `editdistance` / Levenshtein calculations in `research/statistics/generate_field_dataset.py`.

### 12. Exact Match — ❌ CONTRADICTED ON DISK
- **Paper Claim**: Raw Exact Match = `10.16%`, Normalized Field Match = `10.84%`.
- **Current Codebase State**: On-disk `paired_field_observations.csv` lists `100.00%` exact match due to dry-run overwrite.

### 13. Category Accuracy — ✅ VALID
- **Paper Claim**: Document category classification accuracy = `100.00%`.
- **Current Codebase State**: Classification accuracy remains 100.00% across all live and mock runs.

### 14. Error Taxonomy — ✅ VALID
- **Paper Claim**: 9-class diagnostic error taxonomy (`OCR_ERROR`, `FIELD_MISSING`, `FORMAT_ERROR`, `HALLUCINATION`, etc.).
- **Current Codebase State**: Implemented in `generate_field_dataset.py` and `run_statistical_tests.py`.

### 15. Confusion Matrix — 🔍 UNVERIFIED
- **Paper Claim**: Category confusion matrix showing zero off-diagonal misclassifications.
- **Current Codebase State**: Supported by 100% classification accuracy, but individual confusion matrix CSV artifacts are not checked in.

### 16. Statistical Tests — ✅ VALID
- **Paper Claim**: McNemar’s $\chi^2$ test ($\chi^2 = 165.01, p < 0.0001$), Wilcoxon signed-rank test ($W = 14028.0$), and Bootstrap CIs ($B=10,000$).
- **Current Codebase State**: Implemented in `research/statistics/run_statistical_tests.py` using `scipy.stats`.

### 17. Vision Inference Provider — ⚠️ OUTDATED
- **Paper Claim**: Benchmark relies strictly on Groq API (`Llama-3.2-11b-Vision-Instruct`).
- **Current Codebase State**: Codebase expanded in `8c69b56` to support multi-provider routing (OpenRouter, Gemini, Groq).

### 18. isMock / Live Inference Provenance — ⚠️ OUTDATED
- **Paper Claim**: All reported paper metrics originate from live API execution.
- **Current Codebase State**: Current files on disk mixed live run logs with mock dry-run dataset exports.

### 19. Model Names — ⚠️ OUTDATED
- **Paper Claim**: Evaluated primary model is `Llama-3.2-11b-Vision-Instruct`.
- **Current Codebase State**: Codebase references `gemini-2.5-flash`, `gpt-4o-mini`, and `llama-3.2-11b-vision`.

### 20. Raw Benchmark Results — ❌ CONTRADICTED ON DISK
- **Paper Claim**: Raw Mean CER = `89.27%`, Raw Field Match = `10.16%`.
- **Current Codebase State**: Active CSV on disk shows Raw CER = `0.00%` (dry-run artifact).

### 21. Normalized Benchmark Results — ❌ CONTRADICTED ON DISK
- **Paper Claim**: Normalized Mean CER = `82.76%`, Normalized Field Match = `10.84%`.
- **Current Codebase State**: Active CSV on disk shows Normalized Match = `100.00%`.

### 22. All Tables in Manuscript — ⚠️ OUTDATED / NEEDS RESYNCHRONIZATION
- **Paper Claim**: Tables I, II, III, IV, IX in [`PaperV4_Final_Submission.docx`](file:///c:/github/academicuniverse/docs/paper/PaperV4_Final_Submission.docx).
- **Current Codebase State**: Tables reflect run `1785959173886`. Must be resynchronized after live rerun.

### 23. All Numerical Claims in Results Section — ⚠️ OUTDATED
- **Paper Claim**: Section 5 reports $N=24,480$, $\chi^2=165.01$, Exact Match = 10.16% -> 10.84%.
- **Current Codebase State**: Valid for run `1785959173886`, but unverified against the current active CSV on disk.

### 24. Appendix Reproducibility Information — ❌ CONTRADICTED
- **Paper Claim**: `python run_full_benchmark.py` runs end-to-end without path errors.
- **Current Codebase State**: `run_full_benchmark.py` fails on Step 1 due to hardcoded scratch session path (`bae1c6d3-6817-4888-9477-7935d97c3f3c`).

### 25. Git Commit / Version Information — ⚠️ OUTDATED
- **Paper Claim**: Paper reports commit `823334b` / `88140d1` / `ca20671`.
- **Current Codebase State**: Current HEAD is `8c69b56`.

### 26. Hardware / Software Environment — ✅ VALID
- **Paper Claim**: Node.js v18+, Python 3.11+, TypeScript 5.0+.
- **Current Codebase State**: Fully matches active dev setup.

---

## C. Summary of Discrepancies

### 1. Numerical Discrepancies
- Manuscript: $N = 24,480$ observations. On-disk CSV: $N = 24,120$ rows.
- Manuscript: Raw Exact Match = `10.16%`, Normalized Match = `10.84%`. On-disk CSV: Exact Match = `100.00%` (dry-run artifact).
- Manuscript: Mean CER = `82.76%`. On-disk CSV: Mean CER = `0.00%`.

### 2. Evaluator / Metric Discrepancies
- Dry-run mock dataset overwrote `research/statistics/results/paired_field_observations.csv`.
- `generate_gt_jsons.py` / `create_perprofile_gt.py` script path in `run_full_benchmark.py` points to a non-existent temporary brain directory.

### 3. Vision-Model / Inference Discrepancies
- Codebase updated to support multi-provider architecture (Groq + OpenRouter + Gemini), while paper specifies single-provider Groq setup.

### 4. Reproducibility Appendix Discrepancies
- Single-command execution `python run_full_benchmark.py` currently crashes at Step 1 due to path dependency on old session scratch folder.

---

## D. Exact Sections & Tables Requiring Update

1. **Section 4.1 & 4.2 (Experimental Setup & Provider Architecture)**: Update to reflect multi-provider LLM support if benchmarking OpenRouter/Gemini alongside Groq.
2. **Section 5.1 - 5.4 (Results & Analysis)**: Re-run live benchmark to generate clean 24,480 observation CSV and verify McNemar $\chi^2$ / Bootstrap CIs.
3. **Table III & Table IV (Live Performance & Ablation Breakdown)**: Resynchronize numbers directly from new benchmark run artifact.
4. **Appendix A (Reproducibility & Execution Protocol)**: Update commit hash to current HEAD and fix `run_full_benchmark.py` path references.

---

## E. Recommended Next Research Steps

1. **Fix `run_full_benchmark.py`**: Remove hardcoded brain directory path on Line 70 and make script strictly self-contained within repository paths (`ADBG/` and `research/statistics/`).
2. **Execute Full Live Benchmark Rerun**: Run `python run_full_benchmark.py` (or `--from-existing` if using a valid live run) to produce a clean, untainted `paired_field_observations.csv` ($N=24,480$).
3. **Re-generate Statistical Report**: Execute `python research/statistics/run_statistical_tests.py` to produce fresh `STATISTICAL_REPRODUCIBILITY_REPORT.md`.
4. **Synchronize Manuscript**: Update [`PaperV4_Final_Submission.docx`](file:///c:/github/academicuniverse/docs/paper/PaperV4_Final_Submission.docx) with verified metrics and updated commit hash.

---

## F. Final Conclusion

**Paper should NOT be updated yet because `run_full_benchmark.py` has a broken hardcoded path and the active on-disk CSV (`paired_field_observations.csv`) contains mock/dry-run ground-truth data (100% accuracy, 0 CER) rather than live VLM inference results.**
