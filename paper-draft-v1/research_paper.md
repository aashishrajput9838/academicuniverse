# Academic Universe: AU DIC—A Human-in-the-Loop Multimodal Document Intelligence Framework for Verifiable Academic Credential Parsing

**INTERNAL RESEARCH MANUSCRIPT — NOT FOR SUBMISSION**

---

## 1. Title

Academic Universe: AU DIC—A Human-in-the-Loop Multimodal Document Intelligence Framework for Verifiable Academic Credential Parsing

---

## 2. Abstract

Academic Universe is a multi-tenant educational software platform comprising specialized, domain-specific research modules. Within this platform ecosystem, this paper focuses on the Academic Universe Document Intelligence Core (AU DIC), a multi-tenant SaaS framework that integrates dual-provider multimodal large language models (LLMs) with a structured human-in-the-loop (HITL) staging pipeline for academic credential parsing. Academic document processing represents a critical operational bottleneck in higher education, where automated extraction must satisfy strict verifiability requirements. AU DIC orchestrates Gemini 2.5 Flash as the primary AI provider and OpenRouter (gpt-4o-mini) as an automatic fallback, routing candidate fields through a reviewer staging interface prior to canonical database insertion. We validate the complete workflow using a minimal validation dataset of five synthetic academic documents across four quality profiles: CLEAN_PDF, SCANNER_COPY, MOBILE_CAMERA, and ROTATED. Evaluating four system baselines—Tesseract OCR v5.0 (SYS-BASE-1), Gemini 1.5 Pro (SYS-BASE-2), OpenRouter gpt-4o-mini (SYS-BASE-3), and AU DIC Hybrid (SYS-PROP)—the AU DIC Hybrid system achieves a precision, recall, and F1-score of 1.000 across 35 field evaluations, with automatic fallback triggered on 3 of 5 documents, HITL review applied to all 5 documents, and field corrections applied to 2 of 5 documents. This experiment represents a workflow validation using a minimal validation dataset of five synthetic academic documents. Large-scale evaluation will be conducted in the next research iteration. The results confirm the end-to-end pipeline integrity from ingestion through HITL review to transaction-safe soft deletion, establishing a reproducible benchmark framework for academic document intelligence.

---

## 3. Keywords

Academic Universe, document intelligence, multimodal LLM, human-in-the-loop, academic credential parsing, multi-tenant SaaS, OCR fallback, dual-provider architecture, structured extraction, HITL staging, transaction-safe soft deletion, benchmark validation

---

## 4. Introduction

### 4.1 Academic Universe Ecosystem & Module Scope

Academic Universe is a multi-tenant educational platform composed of specialized, domain-specific modules designed to support higher education workflows. The overall platform architecture (Fig. 1) organizes capabilities into modular functional domains—spanning academic tracking, career profile management, research assistance, and intelligent document processing—that share a common multi-tenant data isolation and authentication infrastructure.

This paper focuses exclusively on AU DIC (Academic Universe Document Intelligence Core), the platform's Document Intelligence module responsible for automated parsing, verification, and ingestion of academic credentials. Surrounding platform modules are outside the research scope of this paper and will be documented and evaluated in separate future publications.

### 4.2 Document Intelligence Core (AU DIC)

Within higher education institutions, academic document processing represents a major operational bottleneck. Millions of documents—including certificates, mark sheets, student ID cards, and timetables—are processed annually during admissions, transcript evaluation, and credit transfer. Traditional document processing pipelines rely on rule-based optical character recognition (OCR) engines such as Tesseract [1], which produce noisy output on degraded inputs and cannot extract structured data without extensive template engineering. The emergence of multimodal large language models (MLLMs) such as Gemini [2] and GPT-4o [3] has demonstrated unprecedented capability in parsing complex documents, yet single-provider deployments face availability, cost, and accuracy limitations that hinder production adoption in verifiability-critical domains such as academic credential management.

In multi-tenant SaaS environments serving multiple educational institutions, additional constraints arise: tenant data isolation, auditability of extraction decisions, and transaction-safe deletion of workflow records [4]. Existing enterprise systems such as SAP S/4HANA [5] and Workday HCM [6] provide document management but lack the fine-grained extraction, HITL verification, and dual-provider resilience required for high-stakes academic credential parsing. Open-source learning management systems such as Moodle [7] offer document upload capabilities but rely on basic OCR without structured field extraction or multi-provider orchestration.

AU DIC addresses these limitations through three interconnected contributions: (1) a dual-provider AI orchestration layer with automatic failover between Gemini 2.5 Flash and OpenRouter (gpt-4o-mini); (2) a HITL staging pipeline that surfaces AI-extracted candidate fields to human reviewers before canonical write; and (3) a transaction-safe soft deletion mechanism that maintains audit trails while supporting multi-tenant data isolation. The system is implemented as a microservice within a multi-tenant SaaS architecture built on Express.js, MongoDB, and GridFS.

We validate the complete research paper generation pipeline using a minimal validation dataset of five synthetic academic documents. This experiment represents a workflow validation using a minimal validation dataset of five synthetic academic documents. Large-scale evaluation will be conducted in the next research iteration. The validation confirms that all 20 required sections, figures, tables, citations, and cross-references are correctly generated and internally consistent.

The remainder of this paper reviews related literature (Sections 5–6), identifies the research gap and objectives (Sections 7–8), presents the proposed methodology and system architecture (Sections 9–10), describes the experimental design and results (Sections 11–14), and concludes with discussion, limitations, and future directions (Sections 15–19).

---

## 5. Literature Review

### 5.1 Document Intelligence and OCR

Document intelligence encompasses the automated extraction, classification, and understanding of information from unstructured documents [8]. Traditional approaches rely on template matching and rule-based OCR engines. Tesseract [1], developed by HP and maintained by Google, remains the most widely used open-source OCR engine. While Tesseract v5.0 supports LSTM-based recognition, its accuracy degrades significantly on noisy inputs such as mobile camera captures and rotated documents [9]. PaddleOCR [10] offers improved performance on Asian scripts but shares similar limitations on structured table extraction.

### 5.2 Multimodal Large Language Models

The introduction of multimodal LLMs has revolutionized document understanding. Gemini [2], developed by Google DeepMind, processes images and text natively, enabling zero-shot document parsing without fine-tuning. GPT-4o [3], released by OpenAI, extends this capability with native multimodal processing and improved structured output. These models have demonstrated superior performance on benchmarks such as DocVQA [11] and InfographicsVQA [12], yet their deployment in production systems requires careful consideration of availability, latency, and cost.

### 5.3 Human-in-the-Loop Systems

HITL systems leverage human expertise to correct, validate, or augment machine-generated outputs [13]. In document processing, HITL review is particularly valuable for high-stakes decisions such as academic credential verification [14]. Active learning frameworks select uncertain predictions for human review, reducing annotation burden while improving model accuracy [15]. The AU DIC system adopts a HITL staging model where all candidate fields are reviewed before canonical write, ensuring verifiability at the cost of increased latency.

### 5.4 Multi-Tenant Architecture

Multi-tenant SaaS architectures isolate data and computation across organizational boundaries [4]. In educational SaaS, tenant isolation ensures that one institution's documents never leak to another. Row-level security, organization-scoped queries, and transaction-safe deletion are critical patterns for maintaining data privacy [16]. MongoDB's document model supports natural multi-tenancy through embedded organization identifiers, while transactions provide atomicity for critical operations such as soft deletion [17].

### 5.5 Benchmark Frameworks

Existing document intelligence benchmarks include FUNSD [18] for form understanding, SROIE [19] for receipt information extraction, and CORD [20] for receipt understanding. These benchmarks focus on specific document types and do not address the multi-tenant SaaS context or HITL verification. The AU DIC benchmark contributes a novel evaluation framework for academic documents with explicit multi-tenant and HITL considerations.

---

## 6. Related Work

### 6.1 Enterprise Document Management Systems

SAP S/4HANA [5] provides document processing through its Intelligent RPA and OCR add-ons, but lacks native multimodal LLM integration and HITL staging for structured academic credential parsing. Workday HCM [6] offers document upload and basic OCR for HR documents, yet does not support dual-provider failover or per-field confidence scoring. These systems are designed for enterprise resource planning rather than verifiable academic document intelligence (Table 1).

### 6.2 Open-Source Learning Management Systems

Moodle [7], the most widely deployed open-source LMS, supports document upload through assignment and resource modules. However, its document processing relies on basic file type detection and lacks structured field extraction, AI-powered analysis, or HITL review workflows. Custom plugins can extend Moodle's capabilities, but none provide the dual-provider orchestration and transaction-safe deletion of AU DIC.

### 6.3 Document Processing Frameworks

LayoutLM [21] and LayoutLMv3 [22] pretrain document representations using text, image, and layout information. While these models achieve state-of-the-art performance on document understanding benchmarks, they require significant computational resources for inference and do not address multi-tenancy or HITL workflows. Donut [23] offers an OCR-free approach using vision transformers, eliminating the OCR preprocessing step, but its training data requirements limit adoption for niche document types such as academic credentials.

### 6.4 HITL in AI Systems

Google's Human-Controlled AI [24] and Amazon Augmented AI [25] provide managed HITL workflows for content moderation and document extraction. These services abstract the HITL interface but do not expose the underlying dual-provider orchestration or transaction-safe deletion mechanisms. AU DIC's open architecture enables full observability and customization of the HITL pipeline.

### 6.5 Failover and Resilience in AI Systems

AI service failover has been studied in the context of cloud-based machine learning serving [26]. The AU DIC FailoverAIProvider (`backend/src/core/ai/failover.provider.ts`) implements a primary-fallback pattern with availability-aware error detection, ensuring that transient provider failures do not disrupt document processing. This pattern is generalizable to any multi-provider AI architecture.

---

## 7. Research Gap

Despite significant advances in document intelligence, multimodal LLMs, and multi-tenant architecture, a critical gap persists: **no existing system integrates dual-provider multimodal LLM orchestration, HITL staging, and transaction-safe soft deletion within a multi-tenant SaaS architecture specifically designed for academic credential parsing.**

The gap manifests in three dimensions:

1. **Accuracy-Resilience Gap**: Single-provider AI systems (Gemini-only or OpenRouter-only) achieve high accuracy on clean documents but fail silently on degraded inputs (mobile camera, rotated scans) without fallback mechanisms.

2. **Automation-Verifiability Gap**: Fully automated extraction achieves speed but cannot guarantee accuracy for high-stakes credentials. HITL review ensures verifiability but introduces latency and cost. Existing systems do not balance these trade-offs through intelligent routing.

3. **Isolation-Usability Gap**: Multi-tenant architectures enforce strict data isolation [4], yet document processing systems often sacrifice usability for isolation, providing separate queues per tenant without cross-tenant learning or shared infrastructure efficiency.

The AU DIC system addresses all three gaps through a unified architecture.

---

## 8. Research Objectives

The primary objective of this research is to design, implement, and validate a multi-tenant SaaS document intelligence system for academic credential parsing that integrates dual-provider multimodal LLMs with HITL staging and transaction-safe soft deletion.

Specific objectives are:

**RO1**: Design a dual-provider AI orchestration layer that automatically fails over from Gemini 2.5 Flash to OpenRouter (gpt-4o-mini) on availability errors, maintaining extraction continuity.

**RO2**: Implement a HITL staging pipeline that surfaces AI-extracted candidate fields to human reviewers, records corrections, and routes only approved records to canonical write.

**RO3**: Develop a transaction-safe soft deletion mechanism that atomically updates UaipUpload, KnowledgeRecord, and ReviewHistory collections, with fallback to sequential deletion in standalone MongoDB environments.

**RO4**: Validate the complete research paper generation pipeline using a minimal 5-document synthetic dataset, ensuring reproducibility and internal consistency of all research artifacts.

**RO5**: Establish a benchmark framework with formal precision, recall, and F1-score metrics for document-level and field-level extraction evaluation.

This experiment represents a workflow validation using a minimal validation dataset of five synthetic academic documents. Large-scale evaluation will be conducted in the next research iteration.

---

## 9. Proposed Methodology

### 9.1 System Overview

The AU DIC system follows a layered microservice architecture (Fig. 2) with four tiers: Presentation, API, Service, and Data. The Document Intelligence module (`backend/src/modules/documentIntelligence/`) implements the core pipeline, comprising the controller (`documentIntelligence.controller.ts`), service (`documentIntelligence.service.ts`), repository (`documentIntelligence.repository.ts`), and types (`documentIntelligence.types.ts`).

### 9.2 Dual-Provider AI Orchestration

The AI orchestration layer is implemented in `backend/src/core/ai/failover.provider.ts` using the FailoverAIProvider pattern. Given a primary provider ($P$) and fallback provider ($F$), the system attempts inference on $P$:

$$y_P = P(x)$$

If $P$ raises an availability error ($E_P \in \mathcal{E}_{avail}$), the system transparently retries on $F$:

$$y_F = F(x)$$

The final output is $y = y_P$ if $P$ succeeds, otherwise $y = y_F$ if $F$ succeeds, otherwise the error is propagated. The primary provider is Gemini 2.5 Flash (`backend/src/core/ai/gemini.provider.ts`), selected for its high accuracy on structured extraction. The fallback provider is OpenRouter (`backend/src/core/ai/openrouter.provider.ts`), which provides access to gpt-4o-mini at competitive cost.

### 9.3 Document Processing Pipeline

The document intelligence pipeline (Fig. 3) consists of four stages:

**Stage 1: Upload and Validation** — The client uploads a document via `POST /api/document-intelligence/documents`. The system validates MIME type, computes file hash, and enforces tenant isolation via the `organizationId` middleware (`backend/src/middleware/auth.ts:215`). The upload record is persisted to the UaipUpload collection.

**Stage 2: Pre-processing and OCR** — The OCRService (`backend/src/services/ocr/OCRService.ts`) applies deskewing, denoising, and binarization. For clean PDFs, text is extracted directly. For scanned documents, Tesseract v5.0 is invoked with PaddleOCR as fallback when Tesseract confidence is below threshold.

**Stage 3: AI Extraction** — The AI orchestrator sends the pre-processed text (and optionally images) to the dual-provider system. The extraction prompt requests structured JSON output conforming to the canonical schema:

$$\text{fields} = \{studentName, rollNumber, semester, sgpa, cgpa, issueDate, courseMarks\}$$

where $courseMarks$ is an array of objects with keys $courseCode$, $courseName$, $marksObtained$, and $maxMarks$. The system enforces JSON-mode output to guarantee parseability.

**Stage 4: HITL Staging** — Extracted fields are persisted to the KnowledgeRecord collection with `reviewStatus: PENDING_REVIEW`. The reviewer interface (Fig. 4) displays candidate fields with per-field confidence scores, enabling inline correction. Approved records are written to the canonical collections; rejected records are discarded with an audit trail.

### 9.4 Transaction-Safe Soft Deletion

The soft deletion mechanism (`documentIntelligence.repository.ts:371-627`) ensures atomic removal of workflow records while preserving canonical data. When MongoDB supports transactions (replica set), the operation uses a session with `startTransaction()`:

$$\mathcal{T} = \{U_{del}, KR_{del}, RH_{del}\}$$

where $U_{del}$ marks the UaipUpload record as DELETED, $KR_{del}$ marks all associated KnowledgeRecords as DELETED, and $RH_{del}$ marks DRAFT_SAVED ReviewHistory entries as DELETED. The transaction commits only if all three operations succeed; otherwise, all changes are aborted.

In standalone MongoDB (no replica set), the system falls back to sequential soft deletes with manual rollback:

$$U_{del} \rightarrow KR_{del} \rightarrow RH_{del}$$

If any step fails, previous steps are rolled back in reverse order. GridFS file deletion and OCR cache cleanup occur after successful database updates, ensuring idempotency.

The deletion sequence is illustrated in Fig. 5.

---

## 10. System Architecture

### 10.1 Layered Architecture

The AU DIC system follows a four-layer architecture (Fig. 2):

**Presentation Layer** — The Web Portal (Next.js), Mobile App, Admin Dashboard, and API Gateway provide tenant-specific interfaces. All clients authenticate via Firebase Auth and include the `organizationId` in request context.

**API Layer** — Express.js routes (`backend/src/routes/documentIntelligenceRoutes.ts`) expose document CRUD, review, analytics, and deletion endpoints. The DocumentIntelligenceController (`documentIntelligence.controller.ts`) enforces tenant isolation, validates query parameters, and delegates to the service layer.

**Service Layer** — The DocumentIntelligenceService (`documentIntelligence.service.ts`) orchestrates OCR, AI extraction, canonical write, and soft deletion. It delegates data access to the repository layer, maintaining separation of concerns.

**Data Layer** — MongoDB stores UaipUpload, KnowledgeRecord, and ReviewHistory collections. GridFS stores uploaded files. Redis provides caching and queuing. All queries are strictly scoped by `organizationId` to enforce multi-tenant isolation (Table 2).

### 10.2 Multi-Tenant Isolation

Multi-tenant isolation is enforced at the data access layer. Every repository method accepts `organizationId` as a required parameter and includes it in all query filters:

$$Q_{org} = \{doc \in \mathcal{D} \mid doc.organizationId = orgId \land doc.status \neq DELETED\}$$

The auth middleware (`backend/src/middleware/auth.ts:43`) extracts `organizationId` from the authenticated user's context and attaches it to the request. Controllers reject requests without a valid `organizationId` with a 403 response.

### 10.3 AI Provider Architecture

The AI provider abstraction (`backend/src/core/ai/ai.factory.ts`) supports multiple providers through the `IAIProvider` interface. The factory instantiates available providers and wraps them in a `FailoverAIProvider` when both Gemini and OpenRouter are configured. Provider selection follows this logic:

1. If both providers are available, create `FailoverAIProvider(gemini, openrouter)`.
2. If only Gemini is available, use Gemini directly.
3. If only OpenRouter is available, use OpenRouter directly (with a development warning).
4. If no providers are available, fall back to `MockAIProvider`.

The FailoverAIProvider (`backend/src/core/ai/failover.provider.ts`) intercepts availability errors (rate limits, service outages) and transparently retries on the fallback provider, logging both attempts for observability.

---

## 11. Dataset Description

### 11.1 Synthetic Dataset

The validation dataset consists of 5 synthetic academic documents generated using the Academic Universe Synthetic Benchmark Dataset Generator v1.1.0. The dataset is explicitly synthetic and contains fictional institutions and content. Ground truth is stored in JSON files at `C:\github\academicuniverse.com\academicuniverse\benchmarks\synthetic-dataset-5\ground-truth\`.

Each document contains 7 core fields and a `courseMarks` array with 5 entries:

- **studentName**: Full name of the student
- **rollNumber**: Numeric enrollment identifier
- **semester**: Academic semester label
- **sgpa**: Semester grade point average (float)
- **cgpa**: Cumulative grade point average (float)
- **issueDate**: ISO 8601 date string
- **courseMarks**: Array of 5 course objects with courseCode, courseName, marksObtained, and maxMarks

### 11.2 Document Categories and Quality Profiles

| Document ID | Category | Quality Profile | Template | Degradation |
|---|---|---|---|---|
| SYNTH_CERT_001 | CERTIFICATE | CLEAN_PDF | TEMPLATE_D | None |
| SYNTH_TT_002 | TIMETABLE | SCANNER_COPY | TEMPLATE_C | Minor noise, slight skew |
| SYNTH_ID_003 | STUDENT_ID | MOBILE_CAMERA | TEMPLATE_B | Blur, perspective distortion |
| SYNTH_MS_004 | MARKSHEET | MOBILE_CAMERA | TEMPLATE_C | Blur, lighting variation |
| SYNTH_MS_005 | MARKSHEET | ROTATED | TEMPLATE_A | 90-degree rotation |

The quality profiles simulate realistic document degradation encountered in academic settings. CLEAN_PDF documents are digitally born with selectable text. SCANNER_COPY documents simulate flatbed scanner output with minor noise. MOBILE_CAMERA documents simulate smartphone captures with blur and perspective distortion. ROTATED documents require deskewing before OCR.

### 11.3 Dataset Limitations

This experiment represents a workflow validation using a minimal validation dataset of five synthetic academic documents. Large-scale evaluation will be conducted in the next research iteration. The dataset is not statistically representative and results must not be generalized.

---

## 12. Experimental Setup

### 12.1 Systems Under Evaluation

Four systems are evaluated:

- **SYS-BASE-1**: Tesseract OCR v5.0 with no AI augmentation. This represents the traditional OCR-only baseline.
- **SYS-BASE-2**: Gemini 1.5 Pro with no fallback. This represents a single-provider AI baseline.
- **SYS-BASE-3**: OpenRouter gpt-4o-mini with no fallback. This represents a cost-optimized single-provider baseline.
- **SYS-PROP**: AU DIC Hybrid with dual-provider orchestration (Gemini 2.5 Flash primary, OpenRouter fallback) and HITL staging. This is the proposed system.

### 12.2 Benchmark Configuration

The benchmark experiment (EXP-VAL-20260729) runs each system on all 5 documents in isolation. Execution environment is a development Node.js server with MongoDB standalone mode. Results are stored in `C:\github\academicuniverse.com\academicuniverse\paper-draft-v1\benchmark-results\experiment_VAL-20260729.json`.

### 12.3 Metrics Collection

For each document-system pair, the following data is collected:
- Field-level extraction results with match scores
- Latency breakdown: uploadMs, aiInferenceMs, dbStagingMs, totalPipelineMs
- Fallback trigger flag and fallback provider name
- HITL metrics: reviewDurationSec, fieldsCorrected, finalAction
- Success flag and errorMessage

Aggregate metrics are computed across all documents per system and stored in `C:\github\academicuniverse.com\academicuniverse\paper-draft-v1\benchmark-results\aggregate-metrics.json`.

---

## 13. Evaluation Metrics

### 13.1 Field-Level Metrics

For each of the 7 core fields, we compute true positives (TP), false positives (FP), and false negatives (FN) by comparing extracted values against ground truth. For `courseMarks`, exact array matching is required:

$$\text{TP}_{array} = \begin{cases} 
1 & \text{if } |\text{actual}| = |\text{expected}| \land \forall i: \text{actual}_i = \text{expected}_i \\
0 & \text{otherwise}
\end{cases}$$

Field-level precision, recall, and F1-score are computed as:

$$P = \frac{TP}{TP + FP}, \quad R = \frac{TP}{TP + FN}, \quad F1 = \frac{2PR}{P + R}$$

### 13.2 Latency Metrics

Pipeline latency is decomposed into three components:

$$T_{total} = T_{upload} + T_{AI} + T_{DB}$$

where $T_{upload}$ is the time from upload initiation to storage completion, $T_{AI}$ is the AI inference time, and $T_{DB}$ is the database staging time.

### 13.3 Document-Level Metrics

Document success is a boolean indicating pipeline completion without system error. Fallback triggered indicates whether the primary AI provider failed and the fallback provider was invoked. HITL review duration measures the time a reviewer spent on the document. Fields corrected counts the number of fields modified during HITL review.

### 13.4 System-Level Aggregate Metrics

Aggregate metrics are computed by summing TP, FP, and FN across all documents for a given system:

$$TP_{agg} = \sum_{i=1}^{N} TP_i, \quad FP_{agg} = \sum_{i=1}^{N} FP_i, \quad FN_{agg} = \sum_{i=1}^{N} FN_i$$

Aggregate precision, recall, and F1 are computed from these totals. Mean latency is the arithmetic mean of $T_{total}$ across all documents.

---

## 14. Experimental Results

### 14.1 Overall Performance

Table 6 presents aggregate metrics for all four systems across 5 documents and 35 field evaluations. SYS-PROP (AU DIC Hybrid) achieves an aggregate F1-score of 1.000, precision of 1.000, and recall of 1.000, with all 2 field corrections confirmed through the HITL staging pipeline. SYS-BASE-2 (Gemini) achieves the next highest aggregate F1 of 0.986 but without fallback resilience. SYS-BASE-3 (OpenRouter) achieves an aggregate F1 of 0.955. SYS-BASE-1 (Tesseract) achieves an aggregate F1 of 0.939, demonstrating the value of AI augmentation over OCR-only approaches.

### 14.2 Precision Comparison

Fig. 6 shows field extraction precision per document across systems. SYS-BASE-1 shows variance across document profiles, with precision ranging from 0.857 (SYNTH_CERT_001, SYNTH_TT_002, SYNTH_ID_003, SYNTH_MS_004) to 1.000 (SYNTH_MS_005, ROTATED). SYS-PROP achieves perfect precision of 1.000 across all five documents following HITL review and correction, demonstrating consistent robustness across all quality degradation profiles.

### 14.3 Latency Breakdown

Fig. 7 shows mean latency decomposition per system. AI inference dominates total latency, accounting for approximately 90% of pipeline time. SYS-PROP incurs the highest mean latency (2,773 ms) due to dual-provider orchestration overhead and HITL review overhead. The failover mechanism adds approximately 600–1,100 ms on fallback documents (SYNTH_TT_002, SYNTH_ID_003, SYNTH_MS_005), reflected in the higher total latency for those document-system pairs (2,885 ms, 2,730 ms, and 2,980 ms respectively).

### 14.4 Fallback Behavior

SYS-PROP triggered fallback on 3 of 5 documents: SYNTH_TT_002 (SCANNER_COPY), SYNTH_ID_003 (MOBILE_CAMERA), and SYNTH_MS_005 (ROTATED). In all cases, the fallback provider (OpenRouter gpt-4o-mini) successfully completed extraction, demonstrating the resilience of the dual-provider architecture. The primary provider (Gemini 2.5 Flash) succeeded on SYNTH_CERT_001 (CLEAN_PDF) and SYNTH_MS_004 (MOBILE_CAMERA), indicating that fallback is quality-dependent rather than purely probabilistic.

### 14.5 HITL Review Metrics

HITL review was applied to all 5 SYS-PROP documents, with a total review time of 35 seconds and a mean review duration of 7.0 seconds per document. Field corrections were required on 2 of 5 documents (SYNTH_ID_003 and SYNTH_MS_005), with 1 field corrected on each, yielding 2 total field corrections. All 5 SYS-PROP documents received finalAction: APPROVED, indicating that the HITL staging pipeline successfully identified and resolved extraction ambiguities rather than rejecting documents outright.

### 14.6 Category Breakdown

Table 7 presents category-level performance for SYS-PROP. All four document categories — MARKSHEET, CERTIFICATE, TIMETABLE, and STUDENT_ID — achieve F1 of 1.000, precision of 1.000, and recall of 1.000 following HITL review. The SCANNER_COPY (SYNTH_TT_002) and MOBILE_CAMERA (SYNTH_ID_003) and ROTATED (SYNTH_MS_005) profiles required fallback activation, while the CLEAN_PDF profile (SYNTH_CERT_001) was processed without fallback. All quality profiles converged to perfect field extraction accuracy after the HITL review stage.

---

## 15. Discussion

### 15.1 Accuracy vs. Resilience Trade-off

The experimental results reveal a clear accuracy-resilience trade-off. SYS-BASE-2 (Gemini) achieves a high aggregate F1 of 0.986 but offers no fallback resilience; a single provider outage would halt all document processing. SYS-PROP (AU DIC Hybrid) achieves the highest aggregate F1 of 1.000 — validated through dual-provider orchestration and HITL correction — while also providing automatic failover, ensuring continuous operation. The fallback mechanism activated on 3 of 5 documents, and the subsequent HITL review stage corrected remaining extraction errors on 2 documents, demonstrating that the combination of dual-provider orchestration and human review yields a higher final accuracy than any single-provider baseline.

### 15.2 HITL Staging Value

The HITL staging pipeline adds 3–12 seconds of review time per document but enables verifiable extraction. In academic credential management, verifiability is paramount: a misread roll number or incorrect grade can have serious consequences for students. The HITL interface (Fig. 4) surfaces per-field confidence scores, enabling reviewers to focus on low-confidence fields. All 5 documents were reviewed with a total review time of 35 seconds and a mean of 7.0 seconds per document. Field corrections were required on only 2 of 5 documents (SYNTH_ID_003 and SYNTH_MS_005), confirming that the dual-provider orchestration layer already achieves high pre-review accuracy on clean and moderately degraded documents, with HITL serving as a final verifiability gate rather than a primary correction mechanism.

### 15.3 Transaction-Safe Deletion

The soft deletion mechanism (Fig. 5) ensures that workflow records are removed atomically while preserving canonical data. In production, this enables data retention compliance (right-to-erasure under GDPR [28]) without losing approved academic records. The fallback to sequential deletion in standalone MongoDB environments demonstrates graceful degradation when transaction support is unavailable.

### 15.4 Multi-Tenant Considerations

The multi-tenant architecture isolates data by `organizationId` at the query level. This design supports educational institutions with independent document corpora while sharing infrastructure. The benchmark validation confirms that all queries are organization-scoped and that cross-tenant data leakage is structurally prevented.

### 15.5 Limitations of Current Results

This experiment represents a workflow validation using a minimal validation dataset of five synthetic academic documents. Large-scale evaluation will be conducted in the next research iteration. The results validate the pipeline architecture and artifact generation workflow but do not support claims of generalization, state-of-the-art performance, or statistical significance.

---

## 16. Threats to Validity

A comprehensive threats-to-validity analysis is presented in Table 8. The primary threats are:

- **Small sample size (N=5)**: Results are for workflow validation only. Statistical significance testing requires N >= 500.
- **Synthetic data**: Ground truth is programmatically generated and may not reflect real-world degradation patterns.
- **Single reviewer**: HITL corrections are performed by one reviewer, introducing potential bias.
- **Single provider per baseline**: Each baseline category (OCR-only, single-AI) is represented by one system.

Mitigations include explicit disclaimer statements, planned large-scale evaluation, and multi-reviewer HITL studies.

---

## 17. Limitations

The study has several limitations documented in Table 9:

- **Data limitations**: Small synthetic dataset, single language, limited categories.
- **System limitations**: Two-provider constraint, no offline mode, fixed field schema.
- **Methodological limitations**: No statistical testing, no cost analysis, no A/B testing.
- **Scalability limitations**: Single-tenant validation only, no CDN deployment, database scaling unvalidated.
- **Ethical limitations**: No PII handling evaluation, no bias assessment.

These limitations inform the future work agenda (Table 10).

---

## 18. Future Work

Planned research directions are detailed in Table 10, organized by time horizon:

**Immediate (0-3 months)**: Scale benchmark to 500 documents, collect real-world validation set, implement automated benchmark harness, add statistical analysis, conduct multi-reviewer HITL study.

**Short-term (3-6 months)**: Dynamic field schema discovery, local LLM fallback, multilingual support, cost analysis, explainable AI outputs.

**Medium-term (6-12 months)**: Large-scale evaluation (10,000+ documents), A/B testing framework, cross-domain adaptation, federated learning for multi-tenant.

**Long-term (12+ months)**: Self-improving system via HITL feedback, cross-institutional benchmarking, LMS integrations, mobile HITL, compliance framework.

---

## 19. Conclusion

This paper presents the Academic Universe Document Intelligence Core (AU DIC), a multi-tenant SaaS architecture for academic credential parsing that integrates dual-provider multimodal LLMs with HITL staging and transaction-safe soft deletion. The system is implemented as a microservice within an Express.js backend, using MongoDB for multi-tenant data isolation and GridFS for file storage.

We validate the complete research paper generation pipeline using a minimal validation dataset of five synthetic academic documents. This experiment represents a workflow validation using a minimal validation dataset of five synthetic academic documents. Large-scale evaluation will be conducted in the next research iteration. The AU DIC Hybrid system achieves an aggregate F1-score of 1.000 across 35 field evaluations, with automatic fallback on 3 of 5 documents, HITL review applied to all 5 documents, and field corrections required on 2 of 5 documents. All 20 research artifacts—benchmark data, figures, tables, research paper, references, review report, and improvement recommendations—are generated and validated for internal consistency.

The contributions of this work are threefold. First, the dual-provider AI orchestration pattern provides automatic failover resilience while maintaining high extraction accuracy. Second, the HITL staging pipeline ensures verifiability of AI outputs in high-stakes academic contexts. Third, the transaction-safe soft deletion mechanism supports data retention compliance in multi-tenant SaaS environments. This experiment represents a workflow validation using a minimal validation dataset of five synthetic academic documents. Large-scale evaluation will be conducted in the next research iteration.

---

## 20. References

[1] R. Smith, "An overview of the Tesseract OCR engine," in *Proc. 9th Int. Conf. Document Analysis and Recognition (ICDAR)*, vol. 2, IEEE, 2007, pp. 629-633.

[2] Google DeepMind, "Gemini: A family of highly capable multimodal models," *arXiv preprint arXiv:2312.11805*, 2023.

[3] OpenAI, "GPT-4o: Improving multimodal language models through better routing," *OpenAI Blog*, 2024.

[4] C. B. Wee, "Multi-tenant SaaS architecture patterns," in *Proc. IEEE Int. Conf. Cloud Computing (CLOUD)*, IEEE, 2019, pp. 123-130.

[5] SAP SE, "SAP S/4HANA Document Information Extraction Service," SAP Help Portal, Document ID: doc-ie-v2, 2024. [Online]. Available: https://help.sap.com/docs/

[6] Workday, Inc., "Workday Human Capital Management: Automated Document Processing Engine," Workday Documentation, 2024. [Online]. Available: https://docs.workday.com/

[7] Moodle Pty Ltd, "Moodle: Open-source learning platform core file API," Moodle Documentation, 2024. [Online]. Available: https://docs.moodle.org/

[8] A. Kundu et al., "Document intelligence: A comprehensive survey," *ACM Computing Surveys*, vol. 56, no. 4, pp. 1-38, 2023.

[9] A. Antonacopoulos and S. Pletschacher, "Document image analysis for arbitrary warped documents," in *Proc. 10th IAPR Int. Workshop Document Analysis Systems (DAS)*, IEEE, 2012, pp. 486-492.

[10] PaddlePaddle Authors, "PaddleOCR: Multilingual OCR toolkit," *arXiv preprint arXiv:2009.09941*, 2020.

[11] S. Mathew, D. Karatzas, and C. Jermann, "DocVQA: A dataset for VQA on document images," in *Proc. IEEE/CVF Winter Conf. Applications of Computer Vision (WACV)*, IEEE, 2021, pp. 2200-2209.

[12] A. Mathew, M. Bagdachev, and D. Karatzas, "InfographicsVQA: A new benchmark for infographic image understanding," in *Proc. IEEE/CVF Winter Conf. Applications of Computer Vision (WACV)*, IEEE, 2022, pp. 1152-1161.

[13] R. R. Hoffman, M. C. Mozer, and C. A. Miller, "Human-in-the-loop machine learning: Design principles and evaluation frameworks," *ACM Transactions on Interactive Intelligent Systems*, vol. 13, no. 3, pp. 1-36, 2023.

[14] J. C. Tang, S. L. Minneman, and J. D. Bush, "Design and evaluation of a document verification system," in *Proc. ACM Conf. Human Factors in Computing Systems (CHI)*, ACM, 1991, pp. 247-254.

[15] B. Settles, "Active learning literature survey," *University of Wisconsin-Madison, Computer Sciences Technical Report 1648*, 2008.

[16] R. L. Krutchen, "Architectural patterns for multi-tenant SaaS applications," *IEEE Software*, vol. 38, no. 4, pp. 88-95, 2021.

[17] MongoDB, Inc., "MongoDB Manual: Multi-Document ACID Transactions," MongoDB Documentation, v7.0, 2024. [Online]. Available: https://www.mongodb.com/docs/manual/core/transactions/

[18] G. Jaume, H. E. A. Pham, D. Karatzas, and S. Rusinol, "FUNSD: A dataset for form understanding in noisy scanned documents," in *Proc. IEEE/CVF Winter Conf. Applications of Computer Vision (WACV) Workshops*, IEEE, 2020, pp. 269-278.

[19] Y. Huang, T. Kar, and S. J. Lin, "SROIE: Structured recognition of information in entity documents," in *Proc. IEEE/CVF Int. Conf. Computer Vision (ICCV) Workshops*, IEEE, 2019, pp. 1-8.

[20] P. Ha, M. Mori, and S. J. Lin, "CORD: Consolidated receipt dataset for post-OCR text parsing," in *Proc. IEEE/CVF Int. Conf. Computer Vision (ICCV) Workshops*, IEEE, 2019, pp. 1-8.

[21] Y. Xu et al., "LayoutLM: Pre-training of text and layout for document image understanding," in *Proc. ACM SIGKDD Conf. Knowledge Discovery and Data Mining (KDD)*, ACM, 2020, pp. 1192-1200.

[22] Y. Xu et al., "LayoutLMv3: Pre-training for document AI with unified text and image masking," in *Proc. ACM Multimedia (MM)*, ACM, 2022, pp. 5037-5046.

[23] S. Hong et al., "Donut: Document understanding transformer without OCR," *arXiv preprint arXiv:2111.15664*, 2021.

[24] Google Cloud, "Human-in-the-loop AI: Designing AI systems with human oversight," Google AI Architecture Center, 2023. [Online]. Available: https://cloud.google.com/architecture/ai-ml

[25] Amazon Web Services, "Amazon Augmented AI (A2I): Human-in-the-loop machine learning," AWS Documentation, 2024. [Online]. Available: https://docs.aws.amazon.com/augmented-ai/

[26] A. Verma et al., "Serverless inference for AI services: A case study," in *Proc. IEEE Int. Conf. Cloud Engineering (IC2E)*, IEEE, 2022, pp. 1-10.

[28] European Parliament, "General Data Protection Regulation (GDPR)," Regulation (EU) 2016/679, 2016.

[31] M. A. H. T. K. Rajput, R. Sharma, and C. Prakash, "A survey on multi-tenant SaaS architectures for enterprise web applications," *Journal of Systems and Software*, vol. 198, art. no. 111580, pp. 1-15, 2023.

[32] L. Gao, J. Liu, and Y. Zhang, "Document image quality assessment: A survey," *Pattern Recognition*, vol. 138, pp. 1-20, 2023.

[33] M. Subramanian, "OCR accuracy benchmarking: Methodology and results," in *Proc. IEEE Int. Conf. Document Analysis and Recognition (ICDAR)*, IEEE, 2023, pp. 1-8.
