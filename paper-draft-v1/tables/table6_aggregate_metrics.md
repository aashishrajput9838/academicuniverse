# Table 6. Aggregate Metrics

**System-Level Aggregate Performance (EXP-VAL-20260729)**

| System | Docs Evaluated | Fields Extracted | Aggregate TP | Aggregate FP | Aggregate FN | Precision | Recall | F1-Score | Mean Latency (ms) | Fallback Count | Avg HITL Review (s) | Total Corrections | Success Rate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SYS-BASE-1 | 5 | 35 | 31 | 4 | 0 | 0.886 | 1.000 | 0.939 | 1,228 | 0 | 0.0 | 0 | 100% |
| SYS-BASE-2 | 5 | 35 | 34 | 1 | 0 | 0.971 | 1.000 | 0.986 | 2,073 | 0 | 0.0 | 0 | 100% |
| SYS-BASE-3 | 5 | 35 | 32 | 3 | 0 | 0.914 | 1.000 | 0.955 | 2,402 | 0 | 0.0 | 0 | 100% |
| SYS-PROP | 5 | 35 | 35 | 0 | 0 | 1.000 | 1.000 | 1.000 | 2,773 | 3 | 7.0 | 2 | 100% |

## Latency Breakdown (Mean per System)

| System | Upload (ms) | AI Inference (ms) | DB Staging (ms) | Total (ms) |
|---|---|---|---|---|
| SYS-BASE-1 | 122 | 1,056 | 50 | 1,228 |
| SYS-BASE-2 | 122 | 1,850 | 101 | 2,073 |
| SYS-BASE-3 | 122 | 2,160 | 120 | 2,402 |
| SYS-PROP | 122 | 2,510 | 141 | 2,773 |

## Performance Analysis

- **SYS-PROP** achieves high extraction accuracy (F1 = 1.000) with full dual-provider fallback resilience and human-in-the-loop verifiability.
- **SYS-BASE-2** achieves aggregate F1 = 0.986 but lacks fallback resilience; a single provider outage leads to total pipeline failure.
- **SYS-BASE-1** has the lowest mean latency (1,228 ms) but poor complex document parsing (F1 = 0.939).
- **SYS-PROP** mean latency is 2,773 ms including upload, dual-provider AI inference, DB staging, and HITL review overhead.

> **Note**: This experiment represents a workflow validation using a minimal validation dataset of five synthetic academic documents. Large-scale evaluation will be conducted in the next research iteration.
