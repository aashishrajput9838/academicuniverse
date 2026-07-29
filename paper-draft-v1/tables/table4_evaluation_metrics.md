# Table 4. Evaluation Metrics Definitions

**Formal Definitions for Document Intelligence Benchmark**

## Field-Level Metrics

| Metric | Definition / Formula | Description |
|---|---|---|
| **True Positive (TP)** | Count of correctly extracted fields | Field extracted correctly matching ground truth value |
| **False Positive (FP)** | Count of incorrectly extracted fields | Field extracted but does not match ground truth (hallucination or misread) |
| **False Negative (FN)** | Count of missed ground truth fields | Ground truth field missing from extraction |
| **Precision (P)** | $P = \frac{TP}{TP + FP}$ | Proportion of extracted fields that are correct |
| **Recall (R)** | $R = \frac{TP}{TP + FN}$ | Proportion of ground truth fields successfully extracted |
| **F1-Score (F1)** | $F1 = \frac{2 \cdot P \cdot R}{P + R}$ | Harmonic mean of precision and recall |

## Latency Metrics

| Metric | Definition / Formula | Description |
|---|---|---|
| **Upload Latency** | $t_{upload}$ | Time from upload initiation to storage completion (ms) |
| **AI Inference Latency** | $t_{AI}$ | Time from prompt submission to AI response receipt (ms) |
| **DB Staging Latency** | $t_{DB}$ | Time to persist candidate fields to KnowledgeRecord (ms) |
| **Total Pipeline Latency** | $T = t_{upload} + t_{AI} + t_{DB}$ | End-to-end pipeline latency (ms) |

## Document-Level Metrics

| Metric | Definition / Formula | Description |
|---|---|---|
| **Document Success** | Boolean $\in \{0, 1\}$ | Pipeline completed without system error (1 = Success, 0 = Failure) |
| **Fallback Triggered** | Boolean $\in \{0, 1\}$ | Primary AI provider failed, fallback provider used (1 = Yes, 0 = No) |
| **HITL Review Duration** | $t_{review}$ | Time reviewer spent on document (seconds) |
| **Fields Corrected** | $n_{corr}$ | Number of fields modified during HITL review |

## System-Level Aggregate Metrics

For a system evaluated on $N$ documents with $F$ fields per document:

| Metric | Definition / Formula | Description |
|---|---|---|
| **Aggregate TP** | $TP_{agg} = \sum_{i=1}^{N} TP_i$ | Total true positives across all documents |
| **Aggregate FP** | $FP_{agg} = \sum_{i=1}^{N} FP_i$ | Total false positives across all documents |
| **Aggregate FN** | $FN_{agg} = \sum_{i=1}^{N} FN_i$ | Total false negatives across all documents |
| **Aggregate Precision** | $P_{agg} = \frac{TP_{agg}}{TP_{agg} + FP_{agg}}$ | System-wide precision |
| **Aggregate Recall** | $R_{agg} = \frac{TP_{agg}}{TP_{agg} + FN_{agg}}$ | System-wide recall |
| **Aggregate F1** | $F1_{agg} = \frac{2 \cdot P_{agg} \cdot R_{agg}}{P_{agg} + R_{agg}}$ | System-wide F1-score |
| **Mean Latency** | $\bar{T} = \frac{1}{N} \sum_{i=1}^{N} T_i$ | Average total pipeline latency (ms) |
| **Success Rate** | $SR = \frac{N_{success}}{N_{total}}$ | Proportion of successful extractions |

## Statistical Analysis Notation

| Notation | Meaning |
|---|---|
| $\mu$ | Mean value |
| $\sigma$ | Standard deviation |
| $p$ | p-value from statistical test |
| $d$ | Cohen's d effect size |
| $W$ | Wilcoxon signed-rank statistic |

## CourseMarks Array Matching

For the `courseMarks` field, exact array matching is required:

$$\text{match}_{\text{array}} = \begin{cases} 
1 & \text{if } |\text{actual}| = |\text{expected}| \land \forall i: \text{actual}_i = \text{expected}_i \\
0 & \text{otherwise}
\end{cases}$$

Where equality requires identical values for `courseCode`, `courseName`, `marksObtained`, and `maxMarks` for each array element.

> **Note**: This experiment represents a workflow validation using a minimal validation dataset of five synthetic academic documents. Large-scale evaluation will be conducted in the next research iteration.
