# Academic Universe DIC — Experimental Results Report
**Experiment ID:** EXP-20260728201539  
**Generated:** 2026-07-28T20:16:47.387Z

## Table II: System Accuracy Comparison
| System | Precision | Recall | F1 | Mean Lat (ms) | P95 Lat (ms) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Tesseract OCR v5.0 | 0.000 | 0.000 | 0.000 | 0 | 0 |
| Gemini 1.5 Pro (Single) | 0.000 | 0.000 | 0.000 | 0 | 0 |
| OpenRouter gpt-4o-mini | 0.778 | 1.000 | 0.875 | 4207 | 4960 |
| AU DIC Hybrid (Proposed) | 0.778 | 1.000 | 0.875 | 4077 | 4584 |

## Statistical Significance Tests
| Metric | Test | p-value | Significant | Cohen's d |
| :--- | :--- | :---: | :---: | :---: |
| F1-Score (vs SYS-BASE-1) | Wilcoxon signed-rank test | 0.1088 | No | 19.596 (Large) |
| F1-Score (vs SYS-BASE-2) | Wilcoxon signed-rank test | 0.1088 | No | 19.596 (Large) |
| F1-Score (vs SYS-BASE-3) | Wilcoxon signed-rank test | 1.0000 | No | 0.000 (Negligible) |

## Per-Category Breakdown
| Category | n | F1 | Mean Lat (ms) |
| :--- | :---: | :---: | :---: |
| MARKSHEET | 0 | 0.000 | 0 |
| TRANSCRIPT | 0 | 0.000 | 0 |
| CERTIFICATE | 2 | 0.909 | 3824 |
| WORKSHOP_CERTIFICATE | 0 | 0.000 | 0 |
| INTERNSHIP_CERTIFICATE | 0 | 0.000 | 0 |
| HACKATHON_CERTIFICATE | 0 | 0.000 | 0 |
| TIMETABLE | 0 | 0.000 | 0 |
| EXAM_TIMETABLE | 0 | 0.000 | 0 |
| ADMIT_CARD | 0 | 0.000 | 0 |
| FEE_RECEIPT | 0 | 0.000 | 0 |
| STUDENT_ID | 0 | 0.000 | 0 |
| UNKNOWN | 0 | 0.000 | 0 |
| EDGE_CASE | 1 | 0.800 | 4584 |

## HITL & Fallback Summary
| Metric | Value |
| :--- | :---: |
| Mean Review Duration (s) | 0.00 |
| Human Correction Rate (%) | 0.00% |
| Fallback Recovery Rate (%) | 100.00% |
| Total Fallback Attempts | 3 |