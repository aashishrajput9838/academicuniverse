# Table 8. Threats to Validity

**Internal and External Validity Threats**

## Internal Validity

| ID | Threat | Severity | Mitigation |
|---|---|---|---|
| IV-1 | **Simulated data does not represent real-world document variability** | High | Used 4 distinct quality profiles (CLEAN_PDF, SCANNER_COPY, MOBILE_CAMERA, ROTATED) to simulate realistic degradation. Real-world evaluation planned for next iteration. |
| IV-2 | **Small sample size (N=5) limits statistical power** | High | Acknowledged explicitly. Results are for workflow validation only, not for generalization. Large-scale evaluation (N >= 500) is planned. |
| IV-3 | **Ground truth generated programmatically** | Medium | Synthetic dataset includes disclaimer. Human-annotated validation set is planned for future work. |
| IV-4 | **Single baseline per system type** | Medium | Only one representative system per category was evaluated. Multiple baselines per category are planned. |
| IV-5 | **HITL reviewer is single and non-blind** | Medium | Reviewer identity is known and not blinded to system source. Blinded multi-reviewer evaluation is planned. |
| IV-6 | **Latency measurements include network variability** | Low | Measurements include end-to-end pipeline latency. Isolated AI inference latency is also recorded for comparison. |

## External Validity

| ID | Threat | Severity | Mitigation |
|---|---|---|---|
| EV-1 | **Limited to academic documents (certificates, timetables, IDs, marksheets)** | High | The system is domain-specific. Generalization to other document types (invoices, legal contracts, medical records) requires additional domain adaptation. |
| EV-2 | **Synthetic data may not capture real document degradation patterns** | High | Mobile camera quality profiles are simulated. Real-world mobile captures with varied lighting, angles, and devices are needed. |
| EV-3 | **Results may not generalize across tenants with different document formats** | Medium | Multi-tenant architecture is validated for isolation, but document format diversity across tenants is limited in this study. |
| EV-4 | **AI provider versions may change over time** | Medium | Gemini 2.5 Flash and gpt-4o-mini are specific versions. Future model updates may alter relative performance. |
| EV-5 | **Evaluation environment (hardware, network) not representative of production** | Low | Tests run in development environment. Production performance profiling is planned before deployment. |

## Construct Validity

| ID | Threat | Severity | Mitigation |
|---|---|---|---|
| CV-1 | **F1-score may not capture all aspects of extraction quality** | Medium | Supplemented with per-field confidence scores and HITL correction counts. Additional metrics (BLEU, edit distance) are planned. |
| CV-2 | **Latency does not account for user-perceived response time** | Medium | End-to-end latency is measured. Client-side rendering time and network latency are not separated. |
| CV-3 | **"Success" metric is binary and does not reflect partial correctness** | Low | Supplemented with field-level precision, recall, and F1. Document-level success indicates pipeline completion, not quality. |

## Conclusion Validity

| ID | Threat | Severity | Mitigation |
|---|---|---|---|
| CC-1 | **No statistical significance testing due to small N** | High | Results are explicitly not claimed to be statistically significant. Hypothesis testing will be conducted with N >= 500 in next iteration. |
| CC-2 | **Performance differences between systems may be due to chance** | High | Acknowledged. Larger sample sizes and repeated trials are required for definitive conclusions. |
| CC-3 | **HITL review effect on metrics is confounded** | Medium | HITL-corrected results are tracked separately from raw AI output. Comparison between raw and corrected results is planned. |

> **Note**: This experiment represents a workflow validation using a minimal validation dataset of five synthetic academic documents. Large-scale evaluation will be conducted in the next research iteration.
