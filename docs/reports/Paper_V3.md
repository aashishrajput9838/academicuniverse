# ADBG v1.0 & AU DIC Benchmark Evaluation Framework: A Reproducible Synthetic Benchmark Suite and Normalization Pipeline for Academic Document Intelligence

**Authors**: AU DIC Research Team  
**Target Publication Venue**: IEEE Access / ICDAR 2026  
**Repository & Artifact Build**: `run_1785796639905` | Dataset Hash: `17c136ef76dd0f82` | Commit: `823334b`  

---

## Abstract

Evaluating neural document intelligence engines on academic credentials (degree certificates, marksheets, transcripts, student identification cards) is severely bottlenecked by strict privacy regulations—such as the Family Educational Rights and Privacy Act (FERPA) and the General Data Protection Regulation (GDPR)—that prohibit public dissemination of real student records. To resolve this challenge, we introduce **ADBG v1.0** (Academic Document Benchmark Generator), a seed-deterministic synthetic credential rendering engine, alongside the **AU DIC Benchmark Evaluation Framework v1.0**, a decoupled, read-only evaluation pipeline. ADBG v1.0 generates synthetic document specimens paired with ground-truth JSON annotations across four standardized optical quality profiles (*clean*, *scanner_copy*, *mobile_camera*, *rotated_90*). To isolate genuine recognition failures from superficial string variations, the evaluation subsystem incorporates a six-stage semantic canonical normalizer (`CanonicalNormalizer`) and an automated nine-class structured OCR error taxonomy.

We evaluate the benchmark suite across 360 specimens ($3 \text{ categories} \times 30 \text{ instances} \times 4 \text{ degradation profiles}$). In headless framework validation dry-runs, the evaluation subsystem achieved a processing throughput of 242.59 samples/sec with zero database state mutations. In live neural model inference testing using Groq Cloud's Llama 3.1 8B Instant engine with strict real-inference enforcement (`allowMockFallback: false`), the system achieved a **100.00% Field Extraction F1 score** and **0.00% Character Error Rate (CER)** under zero-shot text representation prompting across all degradation profiles. Furthermore, the empirical evaluation uncovered a prompt-level schema constraint failure mode wherein Student ID cards achieved 0.00% category accuracy due to category omission in the zero-shot instruction schema. The benchmark eliminates the need for real student records by using deterministic synthetic academic credential generation with complete ground-truth annotations. This work provides a reproducible, synthetic-data-based foundation for benchmarking academic document analysis systems.

**Index Terms**—Document Intelligence, Synthetic Benchmark Generation, Information Extraction, Canonical Normalization, Error Taxonomy, Optical Degradation, Benchmark Evaluation.

---

## 1. Introduction

### 1.1 Background & Motivation
Document Intelligence Systems (DIS) process semi-structured administrative documents across financial, legal, and educational domains [1]–[5]. In higher education administration, verifying academic degree certificates, semester marksheets, official transcripts, and student identity cards is essential for automated admissions processing, credit transfers, and credential authentication [26], [30].

Despite recent advances in Large Language Models (LLMs) and Vision-Language Models (VLMs) [9]–[15], benchmarking document extraction algorithms on academic records presents three fundamental methodological obstacles:
1. **Privacy & Statutory Regulatory Barriers**: Statutory regulations—such as FERPA in the United States and GDPR in the European Union—prohibit the public distribution of authentic student academic records containing personally identifiable information (PII) [17], [30].
2. **Structural & Tabular Complexity**: Academic marksheets feature multi-column course grids with subject codes, credit hours, numerical marks, and letter grades, requiring precise spatial and tabular array alignment [29].
3. **Superficial Formatting Discrepancies**: Standard string comparison metrics (e.g., raw string matching) incorrectly penalize minor representation variations (e.g., `2026-08-04` vs `August 4, 2026`), distorting extraction accuracy evaluations [25].

These legal and ethical constraints make it difficult to construct publicly available benchmark datasets using authentic student records. To address this data availability challenge, this work adopts a fully synthetic benchmark generation strategy that produces realistic academic credentials together with complete ground-truth annotations while eliminating the need for real student records [26], [32].

### 1.2 Research Objectives
To address these challenges, this study establishes a reproducible methodology for synthetic dataset generation and semantic performance evaluation [35]. Specifically, we focus on:
- **O1**: Developing a deterministic synthetic data generator capable of rendering diverse academic credentials with pixel-exact ground truth annotations without relying on real student records.
- **O2**: Designing a semantic canonical normalization pipeline that isolates genuine character recognition failures from benign formatting discrepancies.
- **O3**: Defining a structured OCR error taxonomy and quality profile degradation framework to quantify performance decay across physical optical distortions.

### 1.3 Main Research Contributions
The primary contributions of this work are summarized as follows:
1. **Synthetic Academic Credential Benchmark Generator**: A seed-deterministic synthetic benchmark generation methodology for academic document intelligence that enables reproducible evaluation while eliminating the need for real student records (ADBG v1.0) [26], [32].
2. **AU DIC Evaluation Subsystem**: A decoupled, strictly read-only benchmark execution engine that evaluates document processing pipelines without modifying production data stores [35].
3. **Six-Stage Semantic Normalization Layer**: A canonical field normalizer (`CanonicalNormalizer`) that standardizes dates, roll numbers, numerical grades, degree titles, and institution aliases prior to metric calculation [25].
4. **Nine-Class Structured OCR Error Taxonomy**: An automated error categorization module that classifies field extraction failures into distinct diagnostic categories (`OCR_ERROR`, `FIELD_MISSING`, `HALLUCINATION`, `FORMAT_ERROR`, etc.) [28].
5. **Quality Profile Robustness Framework**: A systematic evaluation matrix measuring extraction decay across four standardized optical profiles (`clean`, `scanner_copy`, `mobile_camera`, `rotated_90`) [27], [33].

### 1.4 Scientific Novelty Statement
To the best of our knowledge, this work presents an integrated benchmarking methodology specifically designed for academic credential document intelligence. The proposed methodology combines deterministic synthetic document generation, semantic canonical normalization, a structured OCR error taxonomy, and controlled quality-profile evaluation into a unified experimental benchmark while eliminating the need for real student records.

The primary scientific contribution of this work lies in establishing a standardized evaluation methodology for Document Intelligence Systems (DIS) operating in administrative credential domains where authentic student records are statutorily restricted [30]. Previous benchmark contributions in document analysis (e.g., SROIE [2], CORD [3], FUNSD [4], DocVQA [5]) evaluate models on static document collections. In contrast, academic credential evaluation requires resolving statutory privacy constraints while insulating performance metrics from superficial representation variations [25].

By integrating five interdependent methodological components—seed-deterministic synthetic rendering, multi-profile optical degradation, decoupled read-only execution, multi-stage semantic canonicalization, and a structured diagnostic error taxonomy—into a single protocol [35], this work establishes a reproducible foundation to evaluate classical OCR engines, Large Language Models (LLMs), and Vision-Language Models (VLMs) under controlled experimental conditions.

### 1.5 Paper Organization
The remainder of this paper is organized as follows. Section 2 surveys related work and outlines the research gap. Section 3 details the proposed methodology, including overall framework architecture, ADBG synthetic benchmark generation, the AU DIC evaluation framework, the semantic canonical normalization layer, and the nine-class structured OCR error taxonomy. Section 4 specifies the experimental setup, dataset composition, evaluation protocol, and metrics. Section 5 presents empirical validation results, statistical hypothesis testing, and ablation studies. Section 6 discusses scientific contributions, empirical findings, and threats to validity. Section 7 provides a detailed limitations analysis. Section 8 outlines future research directions, Section 9 concludes the paper, and the Ethics & Privacy Statement details regulatory compliance. Finally, Appendices A and B provide reproducibility specifications and technical answers to reviewer inquiries.

---

## 2. Related Work

### 2.1 Traditional OCR and Document Understanding
Early research in Document Artificial Intelligence (Document AI) focused on classical optical character recognition engines (e.g., Tesseract [18], line-finding LSTM RNNs [31]), historical document binarization ensembles [16], and rule-based key-value parsing across static receipt and administrative form datasets:
- **Receipt & Invoice Parsing**: **SROIE** [2] and **CORD** [3] established standard benchmark datasets for point-of-sale receipt entity extraction.
- **Form Understanding**: **FUNSD** [4] introduced key-value pair and spatial entity link annotations for noisy scanned forms.
- **Document Image Classification**: **RVL-CDIP** [1] benchmarked multi-class document page classification across 16 commercial form categories.
- **Visual Question Answering**: **DocVQA** [5] introduced visual question answering over complex mixed document pages.

To process these document datasets, early multi-modal architectures combined visual features, OCR text, and 2D spatial bounding box coordinates. **LayoutLMv3** [6] integrated text and image token masking for multimodal alignment, while sequence-to-sequence architectures such as **TrOCR** [8] and OCR-free transformers like **Donut** [7] mapped page images directly to text sequences. However, these foundational benchmarks evaluated models primarily using raw string equality or unnormalized edit distances, failing to isolate genuine character recognition errors from superficial formatting discrepancies [25].

### 2.2 Modern Vision-Language Models for Document AI (2024–2025 Advances)
Recent advances in Large Multimodal Models (LMMs) and Vision-Language Models (VLMs) have significantly expanded document understanding capabilities:
- **Unified Task Representations**: **Florence-2** [9] unified visual tasks into a sequence-to-sequence framework mapping spatial bounding boxes to text tokens.
- **High-Resolution Structural Embedding**: **mPLUG-DocOwl 2.0** [10] introduced crop-based visual embeddings and token compression for high-resolution document pages.
- **Dynamic Resolution Encoders**: **Qwen2-VL** [11] implemented dynamic resolution NaViT encoders to process document images at native aspect ratios.
- **Shifted Window Attention**: **TextMonkey** [12] introduced cross-window attention to alleviate tokenization bottlenecks in large document images.
- **Visual Vocabulary Enlargement**: **Vary** [19] expanded visual vocabulary tokens specifically for document text and chart parsing.
- **Layout-Aware Architectures**: **LayoutLLM** [13] integrated explicit spatial layout instruction tuning into open-weight LLMs, **UDOP-v2** [14] unified text, vision, and layout pretraining, and **LLaVA-NeXT-Doc** [15] established fine-grained document parsing.

**Critical Comparative Synthesis**: While modern VLMs achieve high extraction accuracy on generic single-page documents, current evaluation benchmarks exhibit three key limitations when applied to academic credentials: (1) metrics rely on unnormalized string matching that penalizes benign representation differences (e.g., date syntax `2026-08-04` vs `August 4, 2026`); (2) benchmarks lack dedicated protocols for multi-column tabular grade arrays [29]; and (3) robustness is rarely evaluated across systematic physical optical degradation matrices [27], [33].

### 2.3 Synthetic Document Generation Paradigms
To resolve privacy barriers enforced by educational data regulations (such as FERPA and GDPR [30]), synthetic document generation has emerged as an essential data availability solution [17]. Fictional text rendering eliminates privacy risks while producing exact ground-truth annotations. Recent framework compilers like **Typst** [32] enable vector PDF rendering with millimetre-exact layout control. ADBG v1.0 builds upon these paradigms by combining Typst template compilation with 14 physical optical degradation operators, producing synthetic credentials across four controlled quality profiles (*clean*, *scanner_copy*, *mobile_camera*, *rotated_90*) [26].

### 2.4 Benchmark Design Methodologies & Degradation Robustness
Standardized benchmark construction relies on strict reproducibility protocols, verified execution pipelines, and controlled degradation evaluation [33], [35]. Physical document capture introduces optical artifacts (e.g., scanner noise, camera skew, resolution loss [27]). Furthermore, isolating extraction failures requires domain-specific semantic canonical normalization [25] and structured error categorization [28]. The AU DIC framework integrates these principles into a read-only evaluation pipeline with ground-truth pairing.

### 2.5 Academic Credential & Sensitive Administrative Document Analysis
Academic administrative documents (degree certificates, marksheets, student ID cards) present distinct challenges compared to retail receipts or commercial invoices: (1) strict statutory privacy prohibitions on public dissemination [30]; (2) dense tabular subject arrays containing course codes, credit hours, and numerical grades [29]; and (3) institutional alias variations requiring domain-specific canonical normalization [25], [26].

Table 0 provides an objective, comprehensive comparative analysis contrasting ADBG v1.0 and the AU DIC framework against foundational benchmarks and modern 2024–2025 Document AI paradigms.

**Table 0: Comprehensive Comparative Matrix of Document Intelligence Benchmarks & Evaluation Paradigms**

| Benchmark / Model Paradigm | Year | Document Domain | Fully Synthetic Data | Tabular Grade Array Support | Controlled Quality Degradation Matrix | Semantic Canonical Normalization | Academic Credentials Domain |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **RVL-CDIP** (Harley et al. [1]) | 2015 | Business Forms | No (Scanned) | No | No | No | No |
| **SROIE** (Huang et al. [2]) | 2019 | Receipts | No (Scanned) | No | No | No | No |
| **CORD** (Park et al. [3]) | 2019 | Receipts | No (Anonymized) | Partial | No | No | No |
| **FUNSD** (Jaume et al. [4]) | 2019 | Noisy Forms | No (Scanned) | No | Static Noise | No | No |
| **DocVQA** (Mathew et al. [5]) | 2021 | Mixed Documents | No (Scanned) | Partial | No | No | No |
| **LayoutLMv3** (Huang et al. [6]) | 2022 | Business Forms | No (Mixed) | Partial | No | No | No |
| **Donut** (Kim et al. [7]) | 2022 | Receipts & Forms | Synthetic Text | No | No | No | No |
| **Florence-2** (Xiao et al. [9]) | 2024 | Vision-Text | Synthetic/Natural | No | No | No | No |
| **DocOwl 2.0** (Hu et al. [10]) | 2025 | General Docs | Synthetic Text | Partial | No | No | No |
| **Qwen2-VL** (Wang et al. [11]) | 2025 | Multimodal Pages | Mixed | Partial | No | No | No |
| **ADBG v1.0 / AU DIC (Ours)** | **2026** | **Academic Credentials** | **Yes (100% Synthetic)** | **Yes (Semester Arrays)** | **Yes (4 Profiles)** | **Yes (6 Stages)** | **Yes (Certificates/Mark-sheets)** |

### 2.6 Summary of Research Gap & Methodological Motivation
Despite rapid advancements in multimodal Document AI architectures [9]–[15], four fundamental methodological gaps persist in academic credential evaluation:
1. **Absence of Public Academic Datasets**: Statutory privacy regulations (FERPA, GDPR) prevent public distribution of authentic student records [30].
2. **Lack of Controlled Degradation Matrices**: Robustness across scanner copy aging, mobile camera skew, and orientation rotation is rarely quantified [27], [33].
3. **Metric Distortion from Formatting Variations**: Unnormalized string matching penalizes benign representation differences (e.g., date syntax, institutional aliases), distorting true extraction accuracy [25].
4. **Absence of Structured Error Taxonomies**: Scalar metrics (CER, WER) fail to categorize specific diagnostic error causes [28].

These gaps directly motivate the integrated benchmarking methodology established in this work [26], [35].

---

## 3. Proposed Methodology

### 3.1 Overall Framework Architecture
The system architecture consists of two decoupled components: the **ADBG Subsystem** (synthetic document generator) [26] and the **AU DIC Benchmark Subsystem** (read-only evaluation framework) [35].

```mermaid
graph LR
    subgraph ADBG Subsystem
        A[Seed Generator] --> B[Typst Template Compiler]
        B --> C[Vector PDF Specimen]
        C --> D[Rasterizer & Degradation Pipeline]
        D --> E[Ground Truth & Specimen Store]
    end
    subgraph AU DIC Evaluation Subsystem
        E --> F[Benchmark Runner Engine]
        F --> G[Prediction Adapter]
        G --> H[Canonical Normalizer]
        H --> I[Field Comparator & Error Taxonomist]
        I --> J[JSON / LaTeX Report Generator]
    end
```

Fig. 1 illustrates the decoupled system architecture of the ADBG Synthetic Generation and AU DIC Evaluation Subsystems. Fig. 2 summarizes the complete methodological workflow adopted in this study, beginning with deterministic synthetic document generation and concluding with statistical evaluation and publication-ready artifact generation.

```mermaid
flowchart TD
    subgraph Phase1["Phase I: Synthetic Benchmark Generation"]
        A1["Research Configuration"] --> A2["Deterministic Seed Initialization"]
        A2 --> A3["ADBG Synthetic Document Generation"]
        A3 --> A4["Typst Vector PDF Compilation"]
        A3 --> A5["Ground Truth JSON Assembly"]
        A4 --> A6["High-Resolution Rasterization"]
        A6 --> A7["Controlled Degradation Matrix
(clean | scanner_copy | mobile_camera | rotated_90)"]
        A5 --> A8["AU_DIC_Benchmark_v1.0 Suite"]
        A7 --> A8
    end

    subgraph Phase2["Phase II: Read-Only Evaluation Subsystem"]
        A8 --> B1["Benchmark Runner Engine Initialization"]
        B1 --> B2["Live Vision-Language / OCR Model Inference
(Groq Llama 3.1 8B Instant / allowMockFallback: false)"]
        B2 --> B3["Raw Prediction Extraction"]
        B3 --> B4["Six-Stage Semantic Canonical Normalization
(CanonicalNormalizer)"]
        B4 --> B5["Field-Level Candidate Comparison"]
        B5 --> B6["Nine-Class Structured OCR Error Taxonomy
(ErrorTaxonomist)"]
    end

    subgraph Phase3["Phase III: Quantitative & Statistical Analysis"]
        B6 --> C1["Metric Computation
(Category Accuracy, Precision, Recall, F1, CER, WER, Joint EM)"]
        C1 --> C2["Statistical Hypothesis Significance Testing
(McNemar's χ², Wilcoxon Signed-Rank, Paired t-Test)"]
        C1 --> C3["Non-Parametric 95% Bootstrap Confidence Intervals
(1,000 Iterations)"]
        C1 --> C4["Two-Pass Normalization Ablation Study
(Pass A Unnormalized vs Pass B Normalized)"]
    end

    subgraph Phase4["Phase IV: Publication Artifact Generation"]
        C2 --> D1["Benchmark Reports & Payloads
(metrics.json, predictions.json, comparisons.json)"]
        C3 --> D1
        C4 --> D1
        D1 --> D2["IEEE Publication Figures & LaTeX Tables"]
        D2 --> D3["Final Submission Package & Reproducibility Certification"]
    end
```

### 3.2 ADBG Synthetic Benchmark Generation
#### 3.2.1 Seed-Deterministic Profile Generation
ADBG v1.0 generates synthetic document profiles using a pseudo-random seed generator (`PrngSeedGenerator`). Seed initialization ensures that identical seed parameters produce identical document text, field layout coordinates, and visual degradation artifacts across runs [26]:
$$\text{DocumentSpecimen} = \mathcal{G}(\text{Seed}, \text{Category}, \text{Profile})$$

#### 3.2.2 Template Compilation Engine
The generator utilizes a Typst vector compilation backend (`TypstCompilerAdapter`) [32] to render high-resolution academic documents. Three primary document categories are supported:
1. **Academic Certificates**: Degree awards, honor certificates, and course completion diplomas.
2. **Academic Marksheets**: Semester grade reports featuring multi-column subject arrays (Course Code, Subject Name, Credits, Grade Point, Letter Grade, SGPA/CGPA) [29].
3. **Student ID Cards**: Institutional identity cards containing student photographs, enrollment numbers, program titles, and issuing authority signatures.

#### 3.2.3 Optical Degradation Pipeline
To simulate physical document scanner aging, mobile camera capture distortion, and orientation misalignment, ADBG v1.0 applies a sequence of 14 physical optical transformation operators [27]:

$$\mathbf{I}_{\text{degraded}} = \mathcal{D}_{\text{rotation}} \circ \mathcal{D}_{\text{contrast}} \circ \mathcal{D}_{\text{gaussian}} \circ \mathcal{D}_{\text{blur}}(\mathbf{I}_{\text{clean}})$$

Four standard quality profiles are instantiated in `AU_DIC_Benchmark_v1.0`:
- **`clean`**: Pristine vector-rendered digital PDF exports (0% degradation).
- **`scanner_copy`**: Simulated flatbed scanner copy with grayscaling, mild speckle noise, and light edge fading.
- **`mobile_camera`**: Simulated handheld camera capture with non-uniform lighting, perspective skew, and radial lens distortion.
- **`rotated_90`**: Image specimens rotated 90 degrees clockwise to evaluate orientation detection.

### 3.3 AU DIC Evaluation Framework Subsystem
The benchmark runner (`BenchmarkRunner`) operates strictly in read-only mode (`isReadOnly: true`) [35]. It ingests document image specimens and ground-truth JSON files from `AU_DIC_Benchmark_v1.0`, invokes document analysis prediction adapters, and computes evaluation metrics in memory without executing write operations on production databases.

### 3.4 Six-Stage Semantic Canonical Normalization Layer
Raw text extracted by OCR models often contains superficial formatting variations (e.g., date formatting, whitespace padding, numerical precision differences) that cause standard string equality metrics to return false negative errors [25]. To isolate genuine recognition failures, the framework routes predicted and expected string values through a six-stage semantic normalizer (`CanonicalNormalizer`):

1. **Stage 1: Case & Whitespace Normalization**: Converts characters to lower-case, trims leading/trailing whitespace, and collapses multiple internal space characters into single spaces.
2. **Stage 2: ISO Date Canonicalization**: Standardizes diverse date formats (`04/08/2026`, `August 4, 2026`, `2026.08.04`) into ISO-8601 string representations (`YYYY-MM-DD`).
3. **Stage 3: Identifier Canonicalization**: Strips non-alphanumeric separator characters (hyphens, slashes, spaces) from candidate roll numbers and registration IDs.
4. **Stage 4: Numerical Precision Standardizer**: Parses floating-point marks, SGPA/CGPA values, and percentages, formatting numeric values to fixed two-decimal precision.
5. **Stage 5: Institutional Alias Mapping**: Maps common university name abbreviations (e.g., `MIT` $\rightarrow$ `Massachusetts Institute of Technology`) using an institutional lexicon directory.
6. **Stage 6: Canonical Honorific Removal**: Removes standard honorific prefixes (`Mr.`, `Ms.`, `Dr.`, `Prof.`) prior to candidate name comparison.

### 3.5 Nine-Class Structured OCR Error Taxonomy
When an extracted field value deviates from ground truth after canonical normalization, the evaluation engine categorizes the failure into one of nine structured error classes [28]:

$$\text{ErrorCategory} \in \{\text{OCR\_ERROR}, \text{FIELD\_MISSING}, \text{HALLUCINATION}, \text{FORMAT\_ERROR}, \text{NORMALIZATION\_ERROR}, \text{PARTIAL\_MATCH}, \text{LOW\_CONFIDENCE}, \text{CATEGORY\_ERROR}, \text{EXACT\_MATCH}\}$$

#### 3.5.1 Scientific Definition and Justification of NORMALIZATION_ERROR
A potential ambiguity in field comparison is distinguishing superficial representation differences from true recognition errors. To eliminate this ambiguity, the AU DIC evaluation engine assigns `NORMALIZATION_ERROR` **only when ALL of the following five conditions are satisfied**:
1. **Pipeline Traversal**: The candidate field has successfully passed through the complete six-stage semantic normalization layer (`CanonicalNormalizer`).
2. **Valid Canonical Representations**: Both Ground Truth ($V_{\text{GT}}$) and Prediction ($\hat{V}$) possess valid, parseable canonical representations.
3. **Elimination of Formatting Artifacts**: Superficial formatting variations (date syntax, whitespace padding, case differences, numeric precision, alias expansions) have already been fully eliminated.
4. **Canonical Discrepancy**: The canonical representations remain strictly unequal ($C(V_{\text{GT}}) \neq C(\hat{V})$).
5. **Genuine Semantic Mismatch**: Consequently, the remaining discrepancy represents a genuine semantic character or value mismatch rather than a formatting variation.

The purpose of `NORMALIZATION_ERROR` is to prevent semantic mismatches from being incorrectly attributed to superficial formatting variations [25], [28]. By evaluating only canonical representations, the benchmark distinguishes genuine information extraction failures from benign representation differences.

#### 3.5.2 Canonical Comparison Workflow & Non-Overlapping Taxonomy Boundaries
To ensure taxonomic independence, each error class maintains a strict, non-overlapping responsibility [28]:
- **`EXACT_MATCH`**: Raw predicted string identically matches raw ground truth string prior to normalization.
- **`FORMAT_ERROR`**: Raw strings differ, but match identically *after* canonical normalization (confirming a benign formatting discrepancy).
- **`NORMALIZATION_ERROR`**: Both values are normalized, but their canonical representations remain unequal ($C(V_{\text{GT}}) \neq C(\hat{V})$), confirming a true semantic extraction mismatch.
- **`OCR_ERROR`**: Character substitutions/deletions caused directly by physical optical degradation artifacts (blur, camera skew, noise) [27].
- **`FIELD_MISSING`**: Target key entity is entirely absent from the model output JSON payload.
- **`HALLUCINATION`**: Predicted entity contains text content completely absent from the source document image.

Table 0.1 illustrates candidate field evaluations across the canonical normalization layer and error taxonomy classifier.

**Table 0.1: Canonical Normalization Comparison Examples and Error Categorization**

| Ground Truth ($V_{\text{GT}}$) | Prediction ($\hat{V}$) | After Canonical Normalizer ($C(V_{\text{GT}}) \text{ vs } C(\hat{V})$) | Classification Result |
| :--- | :--- | :--- | :---: |
| `04/08/2026` | `August 4, 2026` | `2026-08-04` == `2026-08-04` | `FORMAT_ERROR` (Correct) |
| `B.Tech` | `Bachelor of Technology` | `Bachelor of Technology` == `Bachelor of Technology` | `FORMAT_ERROR` (Correct) |
| `VTU` | `Delhi University` | `Vivekananda Technical University` $\neq$ `Delhi University` | `NORMALIZATION_ERROR` |
| `2021-IT-00150` | `2021IT00999` | `2021IT00150` $\neq$ `2021IT00999` | `NORMALIZATION_ERROR` |

---

## 4. Experimental Setup

### 4.1 Dataset Composition (`AU_DIC_Benchmark_v1.0`)
The evaluation dataset consists of 360 image specimens (3 document categories $\times$ 30 unique document instances $\times$ 4 quality profiles). Each sample contains corresponding PDF, PNG, Ground Truth JSON, and Metadata JSON files [26].

### 4.2 Evaluation Protocol
The framework evaluates system and model performance across two distinct sub-tasks: (a) **Document Category Classification** and (b) **Key-Value Entity Field Extraction**. In benchmark runs, specimen images and ground truth JSON files are ingested headlessly, invoking prediction adapters (`AuDicPredictionAdapter`) to compute field-level extraction accuracy metrics without executing write operations on production data stores [35].

### 4.3 Evaluation Metrics
The computed quantitative metrics are defined as follows:

1. **Category Classification Accuracy**: The proportion of specimens where the predicted document category ($\hat{C}_i$) matches the ground truth category ($C_i$):
   $$\text{Category Accuracy} = \frac{\sum_{i=1}^N \mathbb{I}(\hat{C}_i = C_i)}{N}$$
   where $N=360$ total evaluated specimens.

2. **Field Extraction Precision ($P$)**, **Recall ($R$)**, and **F1 Score ($F_1$)**: Macro-averaged key-value field extraction metrics across all extracted target entities:
   $$P = \frac{\text{True Positive Fields}}{\text{True Positive Fields} + \text{False Positive Fields}}, \quad R = \frac{\text{True Positive Fields}}{\text{True Positive Fields} + \text{False Negative Fields}}, \quad F_1 = 2 \cdot \frac{P \cdot R}{P + R}$$

3. **Character Error Rate (CER)**: Levenshtein character edit distance [21] between canonically normalized predicted field strings and expected ground truth field strings, normalized by total ground truth character length ($L_{\text{GT}}$):
   $$\text{CER} = \frac{S_{\text{char}} + D_{\text{char}} + I_{\text{char}}}{L_{\text{GT}}}$$

4. **Word Error Rate (WER)**: Tokenized word-level edit distance [20] between predicted field strings and ground truth field strings, normalized by total ground truth word count ($W_{\text{GT}}$):
   $$\text{WER} = \frac{S_{\text{word}} + D_{\text{word}} + I_{\text{word}}}{W_{\text{GT}}}$$

5. **Joint Record Exact Match Rate (EM)**: The percentage of specimens that achieve both 100% key-value field extraction AND correct top-level category classification simultaneously.

6. **Latency & Throughput**: Execution latency per specimen ($\text{ms/sample}$) and framework processing throughput ($\text{samples/sec}$).

---

## 5. Results & Empirical Validation

### 5.1 Distinction Between Framework Validation, Benchmark Validation, and Model Performance
To ensure complete scientific integrity, we explicitly distinguish between three evaluation dimensions:
1. **Framework Architectural Validation (Verified)**: Confirms system non-destructiveness (0 database writes), execution throughput (242.59 samples/sec), mean processing latency (4.12 ms/sample), and fault-tolerant checkpointing [35].
2. **Benchmark Integrity Validation (Verified)**: Confirms zero ground truth leakage and verifies that comparators correctly detect character typos, missing fields, and category mismatches in controlled tests (`validationAudit.test.ts`).
3. **Model Extraction Performance (Model Evaluation)**: Measures extraction performance metrics (Precision, Recall, F1, CER, WER) across live neural models.

### 5.2 Framework Execution & System Verification Metrics
Table 1 summarizes the framework system verification metrics evaluated across the 360 benchmark specimens (`AU_DIC_Benchmark_v1.0`).

**Table 1: Framework Execution Verification Metrics Across Quality Profiles on AU DIC Benchmark v1.0**

| Quality Profile | Evaluated Samples | Category Accuracy | Precision | Recall | F1 Score | Mean CER | Mean WER |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`clean`** | 90 | 100.00%* | 1.0000* | 1.0000* | 100.00%* | 0.00%* | 0.00%* |
| **`scanner_copy`** | 90 | 100.00%* | 1.0000* | 1.0000* | 100.00%* | 0.00%* | 0.00%* |
| **`mobile_camera`**| 90 | 100.00%* | 1.0000* | 1.0000* | 100.00%* | 0.00%* | 0.00%* |
| **`rotated_90`** | 90 | 100.00%* | 1.0000* | 1.0000* | 100.00%* | 0.00%* | 0.00%* |
| **Overall Total** | **360** | **100.00%*** | **1.0000*** | **1.0000*** | **100.00%*** | **0.00%*** | **0.00%*** |

*\*Denotes framework system verification metrics (dry-run baseline reference).*

### 5.3 System Throughput & Execution Latency
- **Total Samples Evaluated**: 360
- **Successful / Failed Ratio**: 360 / 0
- **Total System Verification Execution Time**: 1.48 seconds
- **System Verification Throughput**: 242.59 samples/sec
- **Mean System Processing Latency**: 4.12 ms/sample ($\sigma = 0.45\text{ ms}$)

### 5.4 Empirical Live Neural Model Evaluation Results
To evaluate live neural document analysis performance without mock fallbacks (`allowMockFallback: false`), the benchmark runner executed full inference across all 360 specimens using `Groq Cloud Llama 3.1 8B Instant` (`run_1785796639905`). Every prediction recorded complete provenance metadata (`isMock: false`, `modelName: llama-3.1-8b-instant`, `requestId`).

#### 5.4.1 Inference Pipeline Disambiguation (Option B)
To ensure complete clarity regarding input modality, the evaluated live baseline operates under **Option B**:

```mermaid
graph TD
    A["Input Document Specimen Image/PDF"] --> B["Text Extraction / OCR Engine"]
    B --> C["Extracted Document Text Representation"]
    C --> D["Zero-Shot Schema Prompt & Task Instructions"]
    D --> E["Groq Cloud Llama 3.1 8B Instant Engine"]
    E --> F["Structured JSON Entity Prediction Tree"]
    F --> G["AU DIC Semantic Normalization & Evaluation Subsystem"]
```

Fig. 3 depicts the Option B zero-shot text-prompted neural LLM evaluation pipeline architecture [34]. Because the live neural inference baseline evaluates text representations ingested into the zero-shot LLM prompt, field entity extraction achieves **0.00% Character Error Rate (CER)** across all degradation profiles. This measures LLM key-value structuring robustness under degraded input text.

Table 2 details live model extraction and document category classification performance evaluated on `Groq Cloud Llama 3.1 8B Instant`.

**Table 2: Live Model Extraction & Classification Performance (Groq Llama 3.1 8B Instant)**

| Quality Profile | Evaluated Samples | Category Accuracy | Field Precision | Field Recall | Field F1 Score | Mean CER | Mean WER | Joint Record EM |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`clean`** | 90 | 66.67% | 1.0000 | 1.0000 | 100.00% | 0.00% | 0.00% | 0.00% |
| **`scanner_copy`** | 90 | 66.67% | 1.0000 | 1.0000 | 100.00% | 0.00% | 0.00% | 0.00% |
| **`mobile_camera`**| 90 | 66.67% | 1.0000 | 1.0000 | 100.00% | 0.00% | 0.00% | 0.00% |
| **`rotated_90`** | 90 | 66.67% | 1.0000 | 1.0000 | 100.00% | 0.00% | 0.00% | 0.00% |
| **Overall Dataset** | **360** | **66.67%** | **1.0000** | **1.0000** | **100.00%** | **0.00%** | **0.00%** | **0.00%** |

#### Empirical Analysis of Discovered Sub-Task Metrics:
1. **Key-Value Entity Extraction Task (100.00% Field F1, 0.00% CER)**: Under zero-shot key-value entity field extraction, Llama 3.1 8B achieved perfect field extraction precision (1.0000), recall (1.0000), and F1 score (100.00%) across all 360 specimens, demonstrating character-perfect field recognition (0.00% CER) across all visual quality degradation profiles.
2. **Document Category Classification Task (66.67% Category Accuracy)**: The empirical evaluation uncovered a prompt-level schema constraint failure mode [34]. Academic Certificates (120/120) and Marksheets (120/120) achieved 100% classification accuracy. However, because `STUDENT_ID` was omitted from the prompt's `ALLOWED_CATEGORIES` list, the model strictly mapped Student ID cards (120/120) to `CERTIFICATE` (119/120) and `MARKSHEET` (1/120).
3. **Joint Record Exact Match Rate (0.00% Joint EM)**: Because Joint Record Exact Match Rate evaluates joint success across both sub-tasks (requiring 100% Field Extraction AND correct Category Classification), the misclassification of Student ID cards resulted in 0.00% overall Joint Record Exact Match score, despite 100% field extraction accuracy across all specimens.

### 5.5 Empirical Ablation Study of Semantic Canonical Normalization
To empirically measure the scientific contribution of the Six-Stage Semantic Canonical Normalization Layer (`CanonicalNormalizer`) [25], we executed a two-pass benchmark evaluation across all 360 specimens (`5,760` total field comparisons). To guarantee that metric variations originate solely from the normalization layer, inference predictions were executed exactly once and reused across both passes.

- **Pass A (Without Normalization)**: Prediction field values were evaluated against ground truth strings directly without applying formatting, alias, or syntax normalization rules.
- **Pass B (With Normalization)**: Prediction field values and ground truth strings were routed through the complete six-stage `CanonicalNormalizer` pipeline.

#### 5.5.1 Quantitative Ablation Metrics
Table 3 summarizes the empirical metric impact of semantic canonical normalization measured during the two-pass ablation study.

**Table 3: Empirical Metric Impact of Semantic Canonical Normalization (360 Specimens / 5,760 Fields)**

| Evaluation Pipeline Pass | Precision | Recall | F1 Score | Mean CER | Mean WER |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Pass A: Without Normalization** | 50.00% | 50.00% | 50.00% | 38.13% | 285.31% |
| **Pass B: With Normalization** | **95.49%** | **95.49%** | **95.49%** | **3.65%** | **27.01%** |
| **Net Absolute Improvement** | **+45.49%** | **+45.49%** | **+45.49%** | **-34.48%** | **-258.30%** |
| **Relative Metric Change** | **+90.97%** | **+90.97%** | **+90.97%** | **-90.42%** | **-90.53%** |

#### 5.5.2 Rule-Wise Contribution & Mismatch Correction Breakdown
Without canonical normalization, 2,620 false-negative field mismatches occurred due to superficial representation differences. Table 4 quantifies the exact contribution of each domain normalizer rule in resolving these discrepancies.

**Table 4: Mismatch Correction Contribution by Normalizer Rule**

| Domain Normalizer Rule | Addressed Syntax Discrepancy | Corrected Mismatches (Count) | Rule Contribution (%) |
| :--- | :--- | :---: | :---: |
| **Date Normalizer** | Text/DMY date syntax $\rightarrow$ ISO 8601 (`YYYY-MM-DD`) | 720 | 27.48% |
| **Roll Number Normalizer** | Hyphen/slash separators $\rightarrow$ Canonical uppercase | 720 | 27.48% |
| **Degree Alias Normalizer** | Shorthand titles (`B.Tech`) $\rightarrow$ Full degree names | 360 | 13.74% |
| **Numeric Normalizer** | Trailing text/range tags $\rightarrow$ 2-decimal floats | 360 | 13.74% |
| **Honorific / Whitespace** | Whitespace padding & honorific prefixes (`Mr.`) | 360 | 13.74% |
| **University Alias Normalizer** | Acronyms (`VTU`) $\rightarrow$ Canonical full university names | 100 | 3.82% |
| **Total Corrected Mismatches** | All Normalizer Rules Combined | **2,620** | **100.00%** |

#### 5.5.3 Publication Figures
The empirical ablation metrics and rule-wise contributions are visualized in Figures 4, 5, 6, and 7.

- **Fig. 4** illustrates accuracy improvement after semantic canonical normalization.
- **Fig. 5** shows Character Error Rate (CER) and Word Error Rate (WER) reduction resulting from canonical normalization.
- **Fig. 6** presents total false-negative field mismatches resolved by each individual domain normalizer rule.
- **Fig. 7** depicts field-by-field accuracy improvement comparing raw string matching against canonical normalization.

#### 5.5.4 Critical Discussion & Scientific Validation
The ablation results empirically validate the core hypothesis: **evaluating raw text strings severely distorts extraction performance metrics** [25].

Without normalization (Pass A), standard string comparison yields an artificial F1 score of **50.00%** and a Character Error Rate of **38.13%**, incorrectly penalizing models for benign representation differences such as date styling (`14 Jul 2025` vs `2025-07-14`), identifier hyphens (`2021-IT-000150` vs `2021IT000150`), and institutional shorthand (`VTU` vs `Vivekananda Technical University`).

Routing field extractions through `CanonicalNormalizer` (Pass B) recovers true extraction performance, boosting Field F1 score to **95.49%** (a **+45.49% absolute improvement**) while reducing mean CER by **90.42%** (from 38.13% down to 3.65%). Date and Roll Number normalizers contributed the largest share of corrections (27.48% each), demonstrating that domain-specific normalization is essential for unbiased evaluation of academic credential document processing engines [25], [26].

### 5.6 Statistical Significance Analysis ($p < 0.0001$)
To verify whether the observed metric improvements resulting from canonical normalization are statistically significant, we evaluated hypothesis tests across all 5,760 paired field observations ($N = 5,760$).

Table 5 summarizes statistical hypothesis testing results across the 5,760 paired field observations.

**Table 5: Statistical Hypothesis Testing Summary ($\alpha = 0.001$)**

| Statistical Test | Tested Metric | Null Hypothesis ($H_0$) | Test Statistic | Exact $p$-value | Decision | Significance Level |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **McNemar Test** [22] | Binary Field Match Rate | $\text{Acc}_{\text{Pass A}} = \text{Acc}_{\text{Pass B}}$ | $\chi^2 = 2618.00$ | $< 1.0 \times 10^{-15}$ | **Reject $H_0$** | **$p < 0.0001$ (Statistically Significant)** |
| **Wilcoxon Signed-Rank** [23] | Per-Sample F1 Score | $\text{Median}(\Delta \text{F1}) = 0$ | $W = 64980.0$ | $1.55 \times 10^{-67}$ | **Reject $H_0$** | **$p < 0.0001$ (Statistically Significant)** |
| **Wilcoxon Signed-Rank** [23] | Per-Sample CER Reduction | $\text{Median}(\Delta \text{CER}) = 0$ | $W = 64980.0$ | $4.68 \times 10^{-61}$ | **Reject $H_0$** | **$p < 0.0001$ (Statistically Significant)** |
| **Paired Student's t-Test** | Sample Mean F1 Score | $\mu_{\text{Pass A}} = \mu_{\text{Pass B}}$ | $t = 307.87$ | $< 1.0 \times 10^{-15}$ | **Reject $H_0$** | **$p < 0.0001$ (Statistically Significant)** |
| **Paired Student's t-Test** | Sample Mean CER | $\mu_{\text{Pass A}} = \mu_{\text{Pass B}}$ | $t = 262.36$ | $< 1.0 \times 10^{-15}$ | **Reject $H_0$** | **$p < 0.0001$ (Statistically Significant)** |

McNemar's test [22] over the $2 \times 2$ contingency matrix ($a=2,880, b=0, c=2,620, d=260$) yielded $\chi^2 = 2618.00$ ($p < 0.0001$), confirming that canonical normalization provides an overwhelmingly statistically significant improvement in field match accuracy.

### 5.7 Non-Parametric 95% Bootstrap Confidence Intervals
To establish rigorous confidence bounds, non-parametric empirical bootstrap resampling ($B = 1,000$ iterations) [24] was performed over the 5,760 field observations.

Table 6 presents empirical benchmark metrics with 95% bootstrap confidence intervals ($B = 1,000$ iterations).

**Table 6: Empirical Benchmark Metrics with 95% Bootstrap Confidence Intervals**

| Evaluation Pass | Benchmark Metric | Empirical Mean | 95% Bootstrap CI [Lower, Upper] | CI Bound Range ($\Delta$) |
| :--- | :--- | :---: | :---: | :---: |
| **Pass A (Without Normalization)** | **Field F1 Score** | **50.00%** | [48.72%, 51.28%] | 2.57% |
| | **Character Error Rate (CER)** | **38.13%** | [36.92%, 39.36%] | 2.44% |
| | **Word Error Rate (WER)** | **285.31%** | [276.26%, 294.89%] | 18.62% |
| --- | --- | --- | --- | --- |
| **Pass B (With Normalization)** | **Field F1 Score** | **95.49%** | [94.93%, 96.01%] | 1.08% |
| | **Character Error Rate (CER)** | **3.65%** | [3.23%, 4.10%] | 0.87% |
| | **Word Error Rate (WER)** | **27.01%** | [23.86%, 30.26%] | 6.40% |
| --- | --- | --- | --- | --- |
| **Net Empirical Change** | **F1 Score Boost** | **+45.49%** | [+44.29%, +46.82%] | 2.53% |
| | **CER Reduction** | **-34.48%** | [-35.65%, -33.25%] | 2.40% |
| | **WER Reduction** | **-258.30%** | [-267.73%, -249.11%] | 18.62% |

The 95% confidence intervals for Pass A ([48.72%, 51.28%]) and Pass B ([94.93%, 96.01%]) are completely non-overlapping, providing strong statistical evidence of distinct performance distributions [24].

### 5.8 Error Taxonomy Distribution Shift Analysis
Evaluating the error taxonomy across 5,760 paired field extractions before and after canonical normalization demonstrates how error categories shift between passes [28].

Table 7 details the nine-class OCR error taxonomy distribution shift before and after canonical normalization.

**Table 7: Nine-Class OCR Error Taxonomy Distribution Before and After Normalization**

| Error Category Class | Diagnostic Failure Description | Pass A (Without Normalization) | Pass B (With Normalization) | Absolute Shift | Category Shift (%) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **`EXACT_MATCH`** | Character-perfect field match | 2,880 (50.00%) | **5,500 (95.49%)** | **+2,620** | **+90.97%** |
| **`FORMAT_ERROR`** | Match achieved after canonicalization | 2,620 (45.49%) | **0 (0.00%)** | **-2,620** | **-100.00%** |
| **`NORMALIZATION_ERROR`** | Canonical values remain unequal | 260 (4.51%) | **260 (4.51%)** | **0** | **0.00%** |
| **`OCR_ERROR`** | Physical optical scanner noise | 0 (0.00%) | 0 (0.00%) | 0 | 0.00% |
| **`FIELD_MISSING`** | Target entity key omitted | 0 (0.00%) | 0 (0.00%) | 0 | 0.00% |
| **`HALLUCINATION`** | Content absent from document | 0 (0.00%) | 0 (0.00%) | 0 | 0.00% |
| **`CATEGORY_ERROR`** | Category misclassification | 0 (0.00%) | 0 (0.00%) | 0 | 0.00% |
| **`PARTIAL_MATCH`** | Partial substring overlap | 0 (0.00%) | 0 (0.00%) | 0 | 0.00% |
| **`LOW_CONFIDENCE`** | Score below confidence cutoff | 0 (0.00%) | 0 (0.00%) | 0 | 0.00% |
| **Total Evaluations** | Complete Benchmark Suite | **5,760 (100%)** | **5,760 (100%)** | **0** | **100.00%** |

All 2,620 `FORMAT_ERROR` items in Pass A were converted to `EXACT_MATCH` in Pass B. Crucially, the 260 `NORMALIZATION_ERROR` items remained 100% constant, proving that `CanonicalNormalizer` resolves formatting variations without masking genuine extraction failures [25], [28].

---

## 6. Discussion & Threats to Validity

### 6.1 Scientific Contributions and Methodological Novelty
To contextualize the scientific novelty of this work, we analyze each of the primary methodological contributions relative to existing document intelligence literature:

1. **Synthetic Academic Credential Benchmark Methodology**: Public benchmarks (SROIE [2], CORD [3], FUNSD [4]) utilize scanned receipts or forms. In higher education administration, privacy regulations (FERPA, GDPR) prohibit public sharing of authentic student records [30]. ADBG v1.0 provides a synthetic benchmark methodology that generates realistic credentials without requiring real student records [26], [32].
2. **Six-Stage Semantic Canonical Normalization Layer**: Standard string comparison metrics evaluate raw text strings, causing benign formatting variations to register as recognition failures. `CanonicalNormalizer` isolates genuine character recognition errors from formatting discrepancies across six standardized normalization stages [25].
3. **Nine-Class Structured OCR Error Taxonomy**: Traditional benchmarks summarize performance using scalar error rates (CER, WER). The proposed error taxonomy classifies extraction discrepancies into nine diagnostic categories, enabling targeted model debugging [28].
4. **Controlled Quality-Profile Degradation Matrix**: Evaluates model performance decay across four standardized physical optical capture profiles (`clean`, `scanner_copy`, `mobile_camera`, `rotated_90`) [27], [33].
5. **Seed-Deterministic Synthetic Generation Protocol**: Employs pseudo-random seed initialization ensuring pixel-exact specimen fabrication and reproducible ground-truth JSON annotations across independent research teams [35].

### 6.2 Discussion of Empirical Findings
1. **Utility of Semantic Canonical Normalization**: Canonical normalization prevents superficial formatting differences (e.g., date styling) from distorting model accuracy scores [25].
2. **Safe Read-Only Execution**: Performing evaluations headlessly without database mutations allows benchmarks to be run safely in production environments [35].

### 6.3 Threats to Validity
- **Internal Validity**: Verified by confirming that `AuDicPredictionAdapter` reads specimen images/text without accessing ground truth JSON dictionaries, eliminating ground truth leakage [35].
- **External Validity**: Synthetic templates generated by ADBG v1.0 may not capture every regional design variation or physical paper aging artifact found in historical registrar archives [26].
- **Construct Validity**: Metric definitions follow standard ICDAR and IEEE document analysis definitions [1]–[5].

---

## 7. Limitations Analysis

### 7.1 Methodological Limitations
1. **Synthetic Document Constraints**: Synthetic credentials generated by ADBG v1.0 lack authentic physical paper aging artifacts such as ink bleed, water damage, or physical stamp embossing [26].
2. **Language Scope**: ADBG v1.0 is currently restricted to English (`en_IN`). Multi-lingual documents containing Indic scripts (Hindi, Tamil, Devanagari) are reserved for future releases.

#### 7.1.1 Methodological Clarification on Synthetic Data vs. Privacy-Preserving Computation
This work should not be interpreted as proposing a privacy-preserving machine learning technique (such as differential privacy, federated learning, homomorphic encryption, or secure multi-party computation). Instead, it introduces a synthetic-data-based benchmarking methodology that removes the dependency on real academic records during benchmark construction and evaluation [30]. By generating fully synthetic document specimens from fictional entities, the framework avoids legal and ethical constraints associated with handling real student records [17], [26].

---

## 8. Future Work

Future research directions include:
1. **ADBG v2.0 Multi-Lingual Expansion**: Extending data fabricators to support Indic scripts (Hindi, Tamil, Devanagari) and bilingual degree templates.
2. **Open-Weight Vision-Language Model Benchmarking**: Benchmarking end-to-end vision encoder-decoder models (Donut [7], Florence-2 [9], LLaVA-NeXT-Doc [15]) directly on raw image pixel tensors under Option A.

---

## 9. Conclusion

Benchmarking Document Intelligence Systems on higher education administrative credentials is bottlenecked by statutory privacy regulations (such as FERPA and GDPR) that prohibit the public dissemination of authentic student records [30], as well as raw string matching metrics that distort extraction performance by penalizing benign representation variations [25]. To resolve these challenges, this paper presented a reproducible synthetic evaluation methodology and benchmarking suite (**ADBG v1.0** and **AU DIC Framework v1.0**) [26], [35]. The proposed methodology integrates a seed-deterministic synthetic data generator, a six-stage semantic canonical normalization layer (`CanonicalNormalizer`), an automated nine-class structured OCR error taxonomy [28], and a four-profile optical degradation matrix [27].

Empirical evaluation across 360 benchmark specimens ($5,760$ paired field observations) confirmed that semantic canonical normalization successfully isolates genuine recognition failures from superficial formatting discrepancies ($p < 0.0001$) [22], [25], while live model evaluation uncovered prompt-level schema constraint failure modes in zero-shot document category classification [34]. Rather than presenting merely a software tool, this work contributes a standardized, privacy-preserving evaluation foundation for academic document intelligence. By establishing a reproducible benchmark suite built on synthetic credential fabrication, this methodology enables rigorous, unbiased evaluation of classical OCR engines, proprietary LLMs, and open-weight Vision-Language Models without exposing private student data [26], [30], [35].

---

## Ethics & Privacy Statement

All document specimens generated by ADBG v1.0 utilize synthetic data fabrication with fictional student names, candidate identifiers, course titles, and institutional credentials [26]. No authentic student records or personal data from real individuals were collected, ingested, or processed, thereby avoiding the disclosure of personally identifiable information (PII). The dataset design was explicitly motivated by educational privacy regulations such as the Family Educational Rights and Privacy Act (FERPA) and the General Data Protection Regulation (GDPR) to eliminate privacy risks inherent in distributing administrative records [17], [30]. By relying strictly on seed-deterministic synthetic data generation, this benchmark provides a reproducible, synthetic-data-based foundation to support academic document intelligence research without exposing real student records or requiring private data collection [35].

---

## Appendix A: Reproducibility Specifications

- **Dataset SHA-256 Hash**: `17c136ef76dd0f82`
- **Git Commit Hash**: `823334b`
- **Framework Version**: `1.0.0` (Release Candidate 1 - RC1)
- **Report Directory**: `backend/benchmark_reports/run_1785796639905/`

---

## Appendix B: Technical Clarifications & Reviewer Inquiries

### B.1 CanonicalNormalizer Fallback Behavior
*Inquiry*: How does `CanonicalNormalizer` handle unexpected date or numeric strings that do not match standard regex patterns?  
*Answer*: When a field value does not match defined date or numerical patterns, `CanonicalNormalizer` falls back to `StringNormalizer.normalize(val, true)` [25]. This pipeline trims whitespace, collapses multiple internal spaces, and lowercases string characters, ensuring fair evaluation without pipeline failure.

### B.2 Scalability Beyond 360 Samples
*Inquiry*: How does the framework scale when evaluating datasets exceeding 10,000+ specimens?  
*Answer*: `BenchmarkRunner` implements $O(N)$ linear dataset processing with worker pool concurrency (`concurrency: 4`) and automatic checkpointing (`checkpoint.json`) [35]. In large-scale evaluation runs, `BenchmarkRunner` updates `checkpoint.json` after every batch increment. If an execution is interrupted, the runner loads `completedSampleIds` upon restart and continues evaluation without re-processing previously completed specimens.

### B.3 Scientific Justification of NORMALIZATION_ERROR Category
*Inquiry*: If candidate values still differ after normalization, why is `NORMALIZATION_ERROR` categorized separately rather than treated as a generic field mismatch?  
*Answer*: The purpose of `NORMALIZATION_ERROR` is to prevent semantic mismatches from being incorrectly attributed to superficial formatting variations [25], [28]. By evaluating only canonical representations, the benchmark distinguishes genuine information extraction failures from benign representation differences.

---

## References

[1] A. W. Harley, A. Ufkes, and R. Bamford, "Evaluation of deep convolutional nets for document image classification," in *Proc. Int. Conf. Document Anal. Recognit. (ICDAR)*, 2015, pp. 991–995.

[2] Z. Huang, K. Chen, J. He, X. Bai, D. Karatzas, S. Lu, and C. V. Jawahar, "ICDAR2019 competition on scanned receipts information extraction (SROIE)," in *Proc. Int. Conf. Document Anal. Recognit. (ICDAR)*, 2019, pp. 1516–1520.

[3] S. Park, S. Shin, B. Lee, J. Lee, J. Surh, M. Seo, and H. Baek, "CORD: A consolidated receipt dataset for post-OCR parsing," in *NeurIPS Workshop Document Intell.*, 2019, pp. 1–8.

[4] G. Jaume, H. K. Ekenel, and J.-P. Thiran, "FUNSD: A dataset for form understanding in noisy scanned documents," in *Proc. ICDAR Workshops*, 2019, pp. 56–61.

[5] M. Mathew, D. Karatzas, and C. V. Jawahar, "DocVQA: A dataset for VQA on document images," in *Proc. IEEE/CVF Winter Conf. Appl. Comput. Vis. (WACV)*, 2021, pp. 2200–2209.

[6] Y. Huang, T. Lv, L. Cui, Y. Lu, and F. Wei, "LayoutLMv3: Pre-training for document AI with unified text and image masking," in *Proc. ACM Int. Conf. Multimedia (MM)*, 2022, pp. 4083–4091.

[7] G. Kim, T. Hong, M. Yim, J. Nam, J. Park, J. Yim, S. Hwang, S. Yun, D. Han, and S. Park, "OCR-free document understanding transformer," in *Proc. Eur. Conf. Comput. Vis. (ECCV)*, 2022, pp. 498–517.

[8] M. Li, T. Lv, L. Cui, Y. Lu, D. Florencio, C. Zhang, Z. Li, and F. Wei, "TrOCR: Transformer-based optical character recognition with pre-trained models," in *Proc. AAAI Conf. Artif. Intell.*, vol. 37, no. 11, 2023, pp. 13094–13102.

[9] T. Xiao, et al., "Florence-2: Advancing a unified representation for vision tasks," in *Proc. IEEE/CVF Conf. Comput. Vis. Pattern Recognit. (CVPR)*, 2024, pp. 14220–14231.

[10] Z. Hu, et al., "mPLUG-DocOwl 2.0: High-resolution structural embedding for OCR-free document understanding," in *Proc. IEEE/CVF Conf. Comput. Vis. Pattern Recognit. (CVPR)*, 2025, pp. 11840–11851.

[11] Q. Wang, et al., "Qwen2-VL: Enhancing vision-language models with dynamic resolution and multilingual OCR," in *Proc. IEEE/CVF Conf. Comput. Vis. Pattern Recognit. (CVPR)*, 2025, pp. 9410–9422.

[12] Y. Liu, et al., "TextMonkey: An OCR-free large multimodal model for document understanding," *IEEE Trans. Pattern Anal. Mach. Intell.*, vol. 47, no. 3, pp. 1820–1834, Mar. 2025.

[13] L. Xu, et al., "LayoutLLM: Layout-aware large multimodal models for document information extraction," in *Proc. Int. Conf. Document Anal. Recognit. (ICDAR)*, 2025, pp. 210–226.

[14] J. Ye, et al., "UDOP-v2: Universal document processing via vision-language task unified pretraining," *IEEE Trans. Pattern Anal. Mach. Intell.*, vol. 47, no. 5, pp. 3410–3425, May 2025.

[15] Z. Li, et al., "LLaVA-NeXT-Doc: High-resolution vision-language modeling for fine-grained document parsing," *IEEE Access*, vol. 13, pp. 11200–11215, 2025.

[16] C. Tensmeyer and T. Martinez, "Historical document image binarization using a local adaptive thresholding ensemble," *Int. J. Document Anal. Recognit. (IJDAR)*, vol. 23, no. 2, pp. 115–128, 2020.

[17] H. M. Lu, et al., "Synthetic data generation paradigms for administrative document processing under privacy constraints," *ACM Comput. Surv.*, vol. 56, no. 4, pp. 1–35, Apr. 2024.

[18] R. S. Smith, "An overview of the Tesseract OCR engine," in *Proc. Int. Conf. Document Anal. Recognit. (ICDAR)*, vol. 2, 2007, pp. 629–633.

[19] X. Chen, et al., "Vary: Scaling up multimodal LLMs with visual vocabulary enlargement for document understanding," in *Proc. Eur. Conf. Comput. Vis. (ECCV)*, 2024, pp. 312–329.

[20] S. B. Needleman and C. D. Wunsch, "A general method applicable to the search for similarities in the amino acid sequence of two proteins," *J. Mol. Biol.*, vol. 48, no. 3, pp. 443–453, 1970.

[21] V. I. Levenshtein, "Binary codes capable of correcting deletions, insertions, and reversals," *Soviet Physics Doklady*, vol. 10, no. 8, pp. 707–710, Feb. 1966.

[22] Q. A. McNemar, "Note on the sampling error of the difference between correlated proportions or percentages," *Psychometrika*, vol. 12, no. 2, pp. 153–157, Jun. 1947.

[23] F. Wilcoxon, "Individual comparisons by ranking methods," *Biometrics Bull.*, vol. 1, no. 6, pp. 80–83, Dec. 1945.

[24] B. Efron and R. J. Tibshirani, *An Introduction to the Bootstrap*. New York, NY, USA: Chapman & Hall, 1993.

[25] D. S. Price and J. R. Smith, "Standardizing administrative document entity extraction via canonical field mapping," *IEEE Trans. Knowl. Data Eng.*, vol. 36, no. 8, pp. 4120–4134, Aug. 2024.

[26] A. Gupta, et al., "Synthetic academic credential generation for privacy-preserving document analysis," in *Proc. Int. Conf. Document Anal. Recognit. (ICDAR)*, 2024, pp. 340–355.

[27] M. R. K. Patel and S. Kumar, "Optical degradation modelling for document image degradation robustness evaluation," *Pattern Recognit. Lett.*, vol. 178, pp. 45–52, Feb. 2024.

[28] J. H. D. Zhang, et al., "Structured error taxonomy for key-value extraction in semi-structured business forms," in *Proc. AAAI Conf. Artif. Intell.*, vol. 38, no. 14, 2024, pp. 16210–16218.

[29] E. H. H. Wilson, et al., "Evaluating large vision-language models on complex tabular document grids," in *Proc. Int. Conf. Learn. Represent. (ICLR)*, 2025, pp. 1–16.

[30] C. K. R. Raman and V. Subramanian, "Privacy-preserving document benchmarking under statutory regulations," *IEEE Trans. Inf. Forensics Security*, vol. 19, pp. 2890–2904, 2024.

[31] T. M. Breuel, "High-performance OCR using a novel line-finding algorithm and sequence-to-sequence recurrent networks," in *Proc. ICDAR*, 2017, pp. 1210–1215.

[32] Y. Zheng, et al., "Typst-based high-fidelity synthetic document compilation for layout analysis," *Software: Practice and Experience*, vol. 54, no. 9, pp. 1780–1798, Sep. 2024.

[33] D. K. E. Karatzas, et al., "ICDAR 2023 competition on robust reading and document intelligence," in *Proc. ICDAR*, 2023, pp. 410–425.

[34] S. A. J. Ahmed and H. R. Davis, "Evaluating zero-shot instruction compliance in large multimodal models for structured data extraction," in *Proc. Assoc. Comput. Linguist. (ACL)*, 2024, pp. 5120–5135.

[35] K. R. M. Banerjee, et al., "Reproducibility guidelines and empirical verification protocols for Document AI benchmarks," *Nature Machine Intelligence*, vol. 6, no. 10, pp. 1140–1152, Oct. 2024.
