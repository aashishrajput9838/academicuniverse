# Academic Universe DIC — Experimental Results Report
**Experiment ID:** EXP-20260728204014  
**Generated:** 2026-07-28T21:21:55.443Z

## Table II: System Accuracy Comparison
| System | Precision | Recall | F1 | Mean Lat (ms) | P95 Lat (ms) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Tesseract OCR v5.0 | 0.000 | 0.000 | 0.000 | 0 | 0 |
| Gemini 1.5 Pro (Single) | 1.000 | 0.279 | 0.436 | 3880 | 4639 |
| OpenRouter gpt-4o-mini | 0.000 | 0.000 | 0.000 | 0 | 0 |
| AU DIC Hybrid (Proposed) | 0.000 | 0.000 | 0.000 | 0 | 0 |

## Statistical Significance Tests
| Metric | Test | p-value | Significant | Cohen's d |
| :--- | :--- | :---: | :---: | :---: |
| F1-Score (vs SYS-BASE-1) | Paired t-test | 1.0000 | No | 0.000 (Negligible) |
| F1-Score (vs SYS-BASE-2) | Wilcoxon signed-rank test | 0.0007 | Yes (p<0.05) | 0.568 (Medium) |
| F1-Score (vs SYS-BASE-3) | Paired t-test | 1.0000 | No | 0.000 (Negligible) |

## Per-Category Breakdown
| Category | n | F1 | Mean Lat (ms) |
| :--- | :---: | :---: | :---: |
| MARKSHEET | 0 | 0.000 | 0 |
| TRANSCRIPT | 0 | 0.000 | 0 |
| CERTIFICATE | 0 | 0.000 | 0 |
| WORKSHOP_CERTIFICATE | 0 | 0.000 | 0 |
| INTERNSHIP_CERTIFICATE | 0 | 0.000 | 0 |
| HACKATHON_CERTIFICATE | 0 | 0.000 | 0 |
| TIMETABLE | 0 | 0.000 | 0 |
| EXAM_TIMETABLE | 0 | 0.000 | 0 |
| ADMIT_CARD | 0 | 0.000 | 0 |
| FEE_RECEIPT | 0 | 0.000 | 0 |
| STUDENT_ID | 0 | 0.000 | 0 |
| UNKNOWN | 0 | 0.000 | 0 |
| EDGE_CASE | 0 | 0.000 | 0 |

## HITL & Fallback Summary
| Metric | Value |
| :--- | :---: |
| Mean Review Duration (s) | 0.00 |
| Human Correction Rate (%) | 0.00% |
| Fallback Recovery Rate (%) | 0.00% |
| Total Fallback Attempts | 0 |