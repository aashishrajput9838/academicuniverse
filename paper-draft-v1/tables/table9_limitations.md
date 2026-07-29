# Table 9. Limitations

**Documented Limitations of the Current Study**

## Data Limitations

| Limitation | Description | Impact | Planned Resolution |
|---|---|---|---|
| **Small validation set** | Only 5 synthetic documents used for benchmarking | Limits statistical power and generalizability of results | Scale to 500-10,000 documents with diverse formats |
| **Synthetic-only dataset** | No real-world human-annotated documents | Results may not reflect real degradation patterns and edge cases | Collect and annotate real academic document corpus |
| **Single language** | All documents are in English | System performance on multilingual documents is unvalidated | Extend evaluation to Hindi, regional languages, and mixed-language documents |
| **Limited document categories** | Only CERTIFICATE, TIMETABLE, STUDENT_ID, MARKSHEET | System behavior on other academic documents (transcripts, diplomas) is unknown | Expand category taxonomy and re-evaluate |

## System Limitations

| Limitation | Description | Impact | Planned Resolution |
|---|---|---|---|
| **Two-provider limitation** | Only Gemini and OpenRouter are integrated | Provider availability and cost constraints may affect production | Abstract provider interface to support N providers |
| **No offline mode** | System requires internet for AI inference | Not suitable for low-connectivity environments | Implement local LLM fallback (e.g., Llama 3) |
| **OCR dependency** | Structured extraction relies on OCR quality for scanned documents | Poor scan quality may degrade results despite HITL | Integrate adaptive OCR quality assessment and pre-processing |
| **Fixed field schema** | 7 core fields are hardcoded | Cannot adapt to institution-specific document formats | Implement dynamic field schema discovery |
| **Single-reviewer bias** | HITL corrections performed by one reviewer | Corrections may reflect individual interpretation | Multi-reviewer consensus protocol |

## Methodological Limitations

| Limitation | Description | Impact | Planned Resolution |
|---|---|---|---|
| **No statistical testing** | N=5 prevents meaningful hypothesis testing | Cannot claim statistical significance | Increase N and apply t-tests, Wilcoxon, Cohen's d |
| **No longitudinal study** | Single snapshot evaluation | Cannot assess system improvement over time | Conduct repeated evaluations across model versions |
| **No cost analysis** | AI API costs not measured | Total cost of ownership is unknown | Track and report API costs per document |
| **No A/B testing** | No randomized controlled trial | Cannot isolate effect of individual features | Design factorial experiments for HITL, fallback, dual-provider |
| **Benchmarking not automated** | Manual execution of benchmark | Prone to human error and not reproducible | Develop automated benchmark harness |

## Scalability Limitations

| Limitation | Description | Impact | Planned Resolution |
|---|---|---|---|
| **Single-tenant validation** | Multi-tenancy validated for isolation but not at scale | Performance under concurrent multi-tenant load is unknown | Conduct load testing with 100+ concurrent tenants |
| **No CDN or edge deployment** | All processing centralized | Latency may be high for geographically distant users | Evaluate edge deployment and CDN strategies |
| **Database scaling unvalidated** | MongoDB performance at scale not tested | Query performance may degrade with large document corpora | Benchmark with 10K+ documents, add indexes, evaluate sharding |

## Ethical and Regulatory Limitations

| Limitation | Description | Impact | Planned Resolution |
|---|---|---|---|
| **PII handling not evaluated** | Synthetic data contains no real PII | Real-world PII compliance (GDPR, DPDP) is unvalidated | Conduct privacy impact assessment |
| **No bias evaluation** | AI model biases not assessed | Potential for biased extractions across demographics | Implement bias detection and fairness metrics |
| **Audit trail completeness** | Audit trail covers review actions but not AI decisions | Full explainability of AI outputs is limited | Integrate AI decision logging and explanation generation |

> **Note**: This experiment represents a workflow validation using a minimal validation dataset of five synthetic academic documents. Large-scale evaluation will be conducted in the next research iteration.
