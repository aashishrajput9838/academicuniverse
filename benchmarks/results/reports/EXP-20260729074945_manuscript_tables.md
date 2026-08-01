# Academic Universe DIC — Experimental Results Report
**Experiment ID:** EXP-20260729074945  
**Generated:** 2026-07-29T20:36:22.814Z

## Table II: System Accuracy Comparison
| System | Precision | Recall | F1 | Mean Lat (ms) | P95 Lat (ms) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Tesseract OCR v5.0 | 0.000 | 0.000 | 0.000 | 0 | 0 |
| Gemini 1.5 Pro (Single) | 0.785 | 0.347 | 0.482 | 2698 | 4622 |
| OpenRouter gpt-4o-mini | 0.000 | 0.000 | 0.000 | 0 | 0 |
| AU DIC Hybrid (Proposed) | 0.375 | 0.261 | 0.308 | 3560 | 4805 |

## Statistical Significance Tests
| Metric | Test | p-value | Significant | Cohen's d |
| :--- | :--- | :---: | :---: | :---: |
| F1-Score (vs SYS-BASE-1) | Wilcoxon signed-rank test | 0.1088 | No | 0.110 (Negligible) |
| F1-Score (vs SYS-BASE-2) | Wilcoxon signed-rank test | 0.0000 | Yes (p<0.05) | 7.410 (Large) |
| F1-Score (vs SYS-BASE-3) | Wilcoxon signed-rank test | 0.1088 | No | 0.110 (Negligible) |

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
| ADMIT_CARD | 3 | 0.308 | 3560 |
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