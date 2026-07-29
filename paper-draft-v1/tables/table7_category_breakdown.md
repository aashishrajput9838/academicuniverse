# Table 7. Category Breakdown (SYS-PROP Only)

**AU DIC Hybrid Performance by Document Category**

## Category-Level Aggregate Metrics

| Category | Docs | Aggregate TP | Aggregate FP | Aggregate FN | Precision | Recall | F1-Score | Avg Latency (ms) |
|---|---|---|---|---|---|---|---|---|
| CERTIFICATE | 1 | 7 | 0 | 0 | 1.000 | 1.000 | 1.000 | 2,650 |
| TIMETABLE | 1 | 7 | 0 | 0 | 1.000 | 1.000 | 1.000 | 2,885 |
| STUDENT_ID | 1 | 7 | 0 | 0 | 1.000 | 1.000 | 1.000 | 2,730 |
| MARKSHEET | 2 | 14 | 0 | 0 | 1.000 | 1.000 | 1.000 | 2,800 |

## Quality Profile Impact on SYS-PROP

| Document ID | Quality Profile | F1-Score | Fallback Triggered | HITL Review (s) | Fields Corrected |
|---|---|---|---|---|---|
| SYNTH_CERT_001 | CLEAN_PDF | 1.000 | No | 5 | 0 |
| SYNTH_TT_002 | SCANNER_COPY | 1.000 | Yes | 8 | 0 |
| SYNTH_ID_003 | MOBILE_CAMERA | 1.000 | Yes | 12 | 1 |
| SYNTH_MS_004 | MOBILE_CAMERA | 1.000 | No | 3 | 0 |
| SYNTH_MS_005 | ROTATED | 1.000 | Yes | 7 | 1 |

## HITL Impact Analysis

| Metric | Value |
|---|---|
| Documents requiring HITL review | 5 of 5 (100%) |
| Total review time | 35 seconds |
| Mean review time per document | 7.0 seconds |
| Total fields corrected | 2 |
| Fields corrected per reviewed doc | 0.4 |
| Fallback-to-HITL correlation | 100% (3 of 3 fallback docs reviewed) |

> **Note**: This experiment represents a workflow validation using a minimal validation dataset of five synthetic academic documents. Large-scale evaluation will be conducted in the next research iteration.
