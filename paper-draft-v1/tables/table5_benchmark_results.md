# Table 5. Benchmark Results

**Document-Level Evaluation Results (EXP-VAL-20260729)**

## SYS-BASE-1: Tesseract OCR v5.0 (No-AI)

| Document ID | Category | P | R | F1 | Total Latency (ms) | Fallback | HITL Review (s) | Fields Corrected | Success |
|---|---|---|---|---|---|---|---|---|---|
| SYNTH_CERT_001 | CERTIFICATE | 0.857 | 1.000 | 0.923 | 1,145 | No | 0 | 0 | Yes |
| SYNTH_TT_002 | TIMETABLE | 0.857 | 1.000 | 0.923 | 1,245 | No | 0 | 0 | Yes |
| SYNTH_ID_003 | STUDENT_ID | 0.857 | 1.000 | 0.923 | 985 | No | 0 | 0 | Yes |
| SYNTH_MS_004 | MARKSHEET | 0.857 | 1.000 | 0.923 | 1,280 | No | 0 | 0 | Yes |
| SYNTH_MS_005 | MARKSHEET | 1.000 | 1.000 | 1.000 | 1,485 | No | 0 | 0 | Yes |

## SYS-BASE-2: Gemini 1.5 Pro (Single, no fallback)

| Document ID | Category | P | R | F1 | Total Latency (ms) | Fallback | HITL Review (s) | Fields Corrected | Success |
|---|---|---|---|---|---|---|---|---|---|
| SYNTH_CERT_001 | CERTIFICATE | 0.857 | 1.000 | 0.923 | 2,065 | No | 0 | 0 | Yes |
| SYNTH_TT_002 | TIMETABLE | 1.000 | 1.000 | 1.000 | 2,140 | No | 0 | 0 | Yes |
| SYNTH_ID_003 | STUDENT_ID | 1.000 | 1.000 | 1.000 | 1,935 | No | 0 | 0 | Yes |
| SYNTH_MS_004 | MARKSHEET | 1.000 | 1.000 | 1.000 | 2,035 | No | 0 | 0 | Yes |
| SYNTH_MS_005 | MARKSHEET | 1.000 | 1.000 | 1.000 | 2,190 | No | 0 | 0 | Yes |

## SYS-BASE-3: OpenRouter gpt-4o-mini (Single)

| Document ID | Category | P | R | F1 | Total Latency (ms) | Fallback | HITL Review (s) | Fields Corrected | Success |
|---|---|---|---|---|---|---|---|---|---|
| SYNTH_CERT_001 | CERTIFICATE | 0.857 | 1.000 | 0.923 | 2,330 | No | 0 | 0 | Yes |
| SYNTH_TT_002 | TIMETABLE | 0.857 | 1.000 | 0.923 | 2,465 | No | 0 | 0 | Yes |
| SYNTH_ID_003 | STUDENT_ID | 1.000 | 1.000 | 1.000 | 2,260 | No | 0 | 0 | Yes |
| SYNTH_MS_004 | MARKSHEET | 0.857 | 1.000 | 0.923 | 2,400 | No | 0 | 0 | Yes |
| SYNTH_MS_005 | MARKSHEET | 1.000 | 1.000 | 1.000 | 2,555 | No | 0 | 0 | Yes |

## SYS-PROP: AU DIC Hybrid (Dual-Provider + HITL Staging)

| Document ID | Category | P | R | F1 | Total Latency (ms) | Fallback | HITL Review (s) | Fields Corrected | Success |
|---|---|---|---|---|---|---|---|---|---|
| SYNTH_CERT_001 | CERTIFICATE | 1.000 | 1.000 | 1.000 | 2,650 | No | 5 | 0 | Yes |
| SYNTH_TT_002 | TIMETABLE | 1.000 | 1.000 | 1.000 | 2,885 | Yes | 8 | 0 | Yes |
| SYNTH_ID_003 | STUDENT_ID | 1.000 | 1.000 | 1.000 | 2,730 | Yes | 12 | 1 | Yes |
| SYNTH_MS_004 | MARKSHEET | 1.000 | 1.000 | 1.000 | 2,620 | No | 3 | 0 | Yes |
| SYNTH_MS_005 | MARKSHEET | 1.000 | 1.000 | 1.000 | 2,980 | Yes | 7 | 1 | Yes |

> **Note**: This experiment represents a workflow validation using a minimal validation dataset of five synthetic academic documents. Large-scale evaluation will be conducted in the next research iteration.
