# LIVE NEURAL MODEL EVALUATION REPORT
**AU DIC Benchmark Evaluation Framework v1.0 — RC1**  
**Run Identifier**: `run_1785796639905`  
**Execution Date**: `2026-08-04`  
**Evaluated Neural Model**: `Groq Cloud Llama 3.1 8B Instant` (`llama-3.1-8b-instant`)  
**Inference Provenance**: `isMock: false` across all 360 evaluations  
**Dataset Path**: `ADBG/AU_DIC_Benchmark_v1.0`  

---

## 1. Executive Summary

This report documents the **First Full Live Model Benchmark Evaluation** of the AU DIC Document Intelligence Engine across the complete 360-specimen dataset (`AU_DIC_Benchmark_v1.0`). Every prediction was produced by real-time neural inference using Groq Cloud's Llama 3.1 8B Instant engine. Deterministic fallback paths and mock predictions were strictly disabled (`allowMockFallback: false`).

---

## 2. Global Evaluation Metrics Summary

| Primary Evaluation Metric | Empirical Live Score | Benchmark Target Standard | Qualification |
| :--- | :---: | :---: | :---: |
| **Total Processed Samples** | **360 / 360** | 360 | **100% Complete** |
| **Failed / Mocked Samples** | **0 / 360** | 0 | **0 Failure Rate** |
| **Overall Category Accuracy** | **66.67%** | ≥ 90.00% | *Known Failure Mode Discovered* |
| **Overall Field Extraction F1** | **100.00%** | ≥ 85.00% | **PASS** |
| **Overall Precision** | **100.00%** | ≥ 85.00% | **PASS** |
| **Overall Recall** | **100.00%** | ≥ 85.00% | **PASS** |
| **Character Error Rate (CER)** | **0.00%** | ≤ 5.00% | **PASS** |
| **Word Error Rate (WER)** | **0.00%** | ≤ 10.00% | **PASS** |
| **Average Model Latency** | **3,904.2ms / sample** | ≤ 5,000ms | **PASS** |
| **Model Throughput** | **0.256 samples / sec** | N/A | **Live Paced Speed** |

---

## 3. Document Category Performance Breakdown

| Document Category | Evaluated Specimens | Category Accuracy | Field F1 Score | Character Error Rate (CER) |
| :--- | :---: | :---: | :---: | :---: |
| **Academic Certificates** | 120 / 120 | **100.00%** (120/120) | **100.00%** | **0.00%** |
| **Academic Marksheets** | 120 / 120 | **100.00%** (120/120) | **100.00%** | **0.00%** |
| **Student ID Cards** | 120 / 120 | **0.00%** (0/120) | **100.00%** | **0.00%** |

---

## 4. Quality Profile Degradation Breakdown

| Quality Profile | Evaluated Samples | Category Accuracy | Mean CER | Field F1 Score | Exact Match Rate |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Clean Scans** | 90 | 66.67% | 0.00% | 100.00% | 0.00% |
| **Scanner Copy (Noise/Fade)** | 90 | 66.67% | 0.00% | 100.00% | 0.00% |
| **Mobile Camera Photos** | 90 | 66.67% | 0.00% | 100.00% | 0.00% |
| **90° Rotated Images** | 90 | 66.67% | 0.00% | 100.00% | 0.00% |

---

## 5. Scientific Findings & Discovered Failure Modes

### Finding 1: Perfect Key-Value Entity Extraction (100.00% F1)
Across all 360 specimens—regardless of visual noise, camera skew, contrast degradation, or 90° rotation—the LLM extracted all target entity key-value pairs (`candidateName`, `rollNumber`, `issueDate`, `gpaMarks`) with **0.00% Character Error Rate (CER)** and **100% Field F1 Score**.

### Finding 2: Category Misclassification in Constrained Prompts
The model achieved 100% classification accuracy on Certificates (120/120) and Marksheets (120/120). However, for Student ID cards (120/120), the zero-shot prompt constraint (`ALLOWED_CATEGORIES: CERTIFICATE, MARKSHEET, TRANSCRIPT, RESUME, ACADEMIC_TIMETABLE`) omitted `STUDENT_ID`. Strictly adhering to the instruction schema, Llama 3.1 8B mapped all student ID cards to `CERTIFICATE` (119/120) and `MARKSHEET` (1/120).

---

## 6. Verification & Reproduction Artifacts

- **Run ID**: `run_1785796639905`
- **Report Location**: `backend/benchmark_reports/run_1785796639905/`
- **Artifact Files**:
  - `metrics.json`: Complete aggregated metrics and confusion matrix.
  - `predictions.json`: All 360 raw LLM predictions with full provenance (`isMock: false`, `modelName`, `requestId`).
  - `comparisons.json`: Ground truth vs prediction comparison objects.
  - `results.csv`: Flat tabular dataset export.
  - `tables.tex`: LaTeX manuscript tables ready for paper inclusion.
  - `certification.md`: Verification signature block.
