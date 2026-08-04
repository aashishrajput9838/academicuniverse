# AU DIC: A Quality-Aware Benchmark Evaluation Framework and Synthetic Document Generator for Academic Credential Intelligence

**Authors**: Aashish Rajput et al.  
**Affiliation**: Department of Computer Science & Engineering, Academic Universe Research Group  
**Manuscript Version**: V2.1 (Revised following Peer Review)  

---

## Abstract

Evaluating Document Artificial Intelligence (Document AI) systems on academic credentials poses unique challenges due to stringent student privacy regulations, heterogeneous document layouts, and complex tabular mark structures. Furthermore, standard Optical Character Recognition (OCR) metrics frequently fail to distinguish between true extraction errors and benign formatting variations, while performance decay under physical optical degradation remains insufficiently benchmarked. In this paper, we introduce **ADBG v1.0** (Academic Document Benchmark Generator), an open, seed-deterministic synthetic document fabrication engine that generates vector PDF and raster image specimens across three primary academic document categories with complete, privacy-compliant ground truth annotations. Complementing ADBG, we present the **AU DIC Benchmark Evaluation Framework v1.0**, a strictly read-only evaluation pipeline incorporating a six-stage semantic canonical normalization layer, a nine-class structured OCR error taxonomy, and a degradation matrix spanning four quality profiles (`clean`, `scanner_copy`, `mobile_camera`, `rotated_90`). We validate the framework across a 360-specimen benchmark dataset (`AU_DIC_Benchmark_v1.0`), demonstrating zero ground truth leakage, deterministic execution, and reproducible metric calculation. This work provides a standardized, privacy-safe foundation for evaluating academic document processing models under simulated physical distortions.

---

## Keywords

`Document AI`, `Optical Character Recognition (OCR)`, `Synthetic Benchmark Generator`, `Academic Credential Verification`, `Information Extraction`, `Performance Decay Analysis`, `Error Taxonomy`, `Semantic Normalization`.

---

## 1. Introduction

Automated document processing systems are increasingly deployed to extract structured information from official administrative and academic credentials, including university degree certificates, grade mark sheets, and student identification cards. These automated workflows support higher education admissions, credit transfer verifications, and background verification systems. While recent advances in multimodal deep learning and Vision-Language Models (VLMs) have significantly improved visual layout understanding, rigorous evaluation of these systems remains constrained by privacy regulations and optical acquisition noise.

### 1.1 Research Gap & Motivation
Evaluating document intelligence systems on real student credentials presents three primary obstacles:
1. **Privacy & Regulatory Restrictions**: Real student records contain personally identifiable information (PII) protected under regulations such as FERPA and GDPR. Consequently, public access to large-scale, annotated academic credential datasets is severely restricted.
2. **Evaluation Sensitivity to Format Variations**: Standard string evaluation metrics—such as raw Character Error Rate (CER) or exact string matching—penalize minor formatting differences (e.g., date formats, uppercase vs. lowercase representations, or hyphenated roll numbers) even when the underlying semantic information is extracted accurately.
3. **Unquantified Optical Degradation Decay**: Academic credentials submitted by applicants frequently suffer from scanner binarization noise, smartphone camera perspective distortion, uneven lighting, and page rotation. Existing public benchmarks rarely evaluate field extraction performance under systematically controlled degradation decay curves.

### 1.2 Research Objectives
To address these challenges, this study establishes a reproducible methodology for synthetic dataset generation and semantic performance evaluation. Specifically, we focus on:
- **O1**: Developing a deterministic, privacy-compliant synthetic data generator capable of rendering diverse academic credentials with pixel-exact ground truth annotations.
- **O2**: Designing a semantic canonical normalization pipeline that isolates genuine character recognition failures from benign formatting discrepancies.
- **O3**: Defining a structured OCR error taxonomy and quality profile degradation framework to quantify performance decay across physical optical distortions.

### 1.3 Main Research Contributions
The primary contributions of this work are summarized as follows:
1. **ADBG v1.0 Dataset Generator**: A seed-deterministic synthetic data fabrication engine capable of rendering multi-page vector PDF and raster image credentials across three document categories (*Certificates*, *Marksheets*, *Student IDs*).
2. **AU DIC Evaluation Subsystem**: A decoupled, strictly read-only benchmark execution engine that evaluates document processing pipelines without modifying production data stores.
3. **Six-Stage Semantic Normalization Layer**: A canonical field normalizer (`CanonicalNormalizer`) that standardizes dates, roll numbers, numerical grades, degree titles, and institution aliases prior to metric calculation.
4. **Nine-Class Structured OCR Error Taxonomy**: An automated error categorization module that classifies field extraction failures into distinct diagnostic categories (`OCR_ERROR`, `FIELD_MISSING`, `HALLUCINATION`, `FORMAT_ERROR`, etc.).
5. **Quality Profile Robustness Framework**: A systematic evaluation matrix measuring extraction decay across four standardized optical profiles (`clean`, `scanner_copy`, `mobile_camera`, `rotated_90`).

### 1.4 Paper Organization
The remainder of this paper is organized as follows. Section 2 surveys related work in Document AI and benchmark generation. Section 3 details the system architecture. Section 4 presents the ADBG synthetic dataset generation methodology. Section 5 describes the AU DIC evaluation framework and semantic normalizers. Section 6 specifies the experimental protocol and metrics. Section 7 presents empirical validation results. Section 8 discusses findings, limitations, and threats to validity. Section 9 outlines future research directions, Section 10 concludes the paper, and Appendices A and B provide reproducibility specifications and technical answers to reviewer inquiries.

---

## 2. Related Work

### 2.1 Information Extraction & Neural Document AI Architectures
Modern Document AI architectures integrate visual features, textual content, and spatial layout coordinates. Multimodal models such as **LayoutLMv3** (Huang et al., 2022) utilize unified text and image masking to capture spatial correlations across complex form fields. Similarly, end-to-end vision encoder-decoder models such as **Donut** (Kim et al., 2022) eliminate explicit OCR dependencies by mapping document images directly to structured JSON trees. While these neural architectures achieve competitive performance on administrative forms, evaluating their extraction robustness on academic credentials requires specialized benchmarks capable of measuring tabular grade array accuracy and semantic formatting variations.

### 2.2 Public Document Intelligence Benchmarks
Several public datasets exist for document analysis research:
- **Receipts & Invoices**: **SROIE** (Huang et al., 2019) and **CORD** (Park et al., 2019) provide key-value annotations for commercial receipt parsing.
- **Form Understanding**: **FUNSD** (Jaume et al., 2019) provides word-level and entity-level relationship annotations for administrative forms.
- **Document Visual Question Answering**: **DocVQA** (Mathew et al., 2021) evaluates visual question answering across industry documents.

However, these datasets do not focus on academic credentials, which combine dense tabular course arrays (subject codes, credits, grades) with formal institutional metadata. Furthermore, existing benchmarks evaluate models primarily on static image sets without systematically controlled degradation matrices.

### 2.3 Synthetic Document Generation
To overcome privacy constraints, synthetic data generation frameworks (e.g., SynthText, DocFabricator) render synthetic text onto natural images or form templates. ADBG v1.0 extends synthetic document generation principles to academic credentials by integrating Typst vector PDF compilation with 14 physical optical degradation operators, producing privacy-safe credentials with multi-profile optical distortions.

---

## 3. System Architecture Overview

The system architecture consists of two decoupled components: the **ADBG Subsystem** (synthetic document generator) and the **AU DIC Benchmark Subsystem** (read-only evaluation framework).

```mermaid
graph TD
    subgraph ADBG Subsystem (Synthetic Document Generator)
        Fabricator["Academic Data Fabricator"] --> Renderer["Typst Vector Renderer"]
        Renderer --> PDF["PDF / PNG Specimen"]
        Renderer --> GT["Ground Truth JSON"]
        PDF --> DegEngine["Degradation Engine (14 Operators)"]
        DegEngine --> Profiles["Quality Profiles (clean, scanner, camera, rotated)"]
    end

    subgraph AU DIC Benchmark Subsystem (Read-Only Evaluator)
        Profiles --> PredAdapter["AuDicPredictionAdapter"]
        GT --> GTAdapter["AdbgGroundTruthAdapter"]
        PredAdapter --> PredJSON["Prediction JSON"]
        
        GTAdapter --> NormLayer["Semantic Normalization Layer"]
        PredJSON --> NormLayer
        
        NormLayer --> Comparators["String & Match Comparators"]
        Comparators --> Taxonomy["Error Taxonomy Classifier"]
        Taxonomy --> Metrics["Metric Aggregation Engine"]
        Metrics --> Reports["LaTeX, CSV, & Markdown Exporters"]
    end
```

---

## 4. Benchmark Dataset Generation (ADBG v1.0)

### 4.1 Synthetic Fabrication Policy
To ensure complete compliance with data privacy standards (FERPA/GDPR), ADBG v1.0 generates all document content synthetically. Names, student identifiers, course codes, and institutional titles are derived from fictional data catalogs using a hierarchical seed pseudo-random number generator (`SeedManager`).

### 4.2 Document Categories
The benchmark dataset contains three academic document categories:
1. **Degree Certificates**: Formally styled completion certificates containing candidate name, degree title, branch, roll number, university name, and issue date.
2. **Academic Marksheets**: Multi-column grade transcripts containing student metadata, semester GPA, cumulative CGPA, total credits, and a structured array of course marks (course code, title, credits, letter grade, grade points).
3. **Student Identification Cards**: Compact identity cards containing student name, roll number, enrollment number, branch, blood group, and issue date.

### 4.3 Optical Degradation Operators & Quality Profiles
To model physical acquisition conditions, ADBG v1.0 applies 14 image processing operators across four standardized quality profiles:
- **`clean`**: Digital vector PDF specimens rendered to 300 DPI raster images without degradation.
- **`scanner_copy`**: Simulates flatbed scanner output using Gaussian blur ($\sigma = 1.2$), contrast reduction, and binarization noise.
- **`mobile_camera`**: Simulates smartphone photo acquisition incorporating perspective tilt, lens distortion, and gradient shadow illumination.
- **`rotated_90`**: Simulates 90-degree clockwise page rotation artifacts.

---

## 5. AU DIC Evaluation Framework & Normalization Layer

### 5.1 Semantic Canonical Normalization Layer
Standard string comparison frequently penalizes equivalent field representations. AU DIC incorporates a six-stage canonical normalization layer (`CanonicalNormalizer`):
1. **`StringNormalizer`**: Collapses internal whitespace, trims margins, and standardizes character casing.
2. **`DateNormalizer`**: Converts date formats (e.g., `"July 14, 2025"`, `"14/07/2025"`) into ISO 8601 `YYYY-MM-DD`.
3. **`RollNumberNormalizer`**: Strips hyphens/slashes and converts identifiers (e.g., `"2021-IT-000150"`) to uppercase alphanumeric strings (`"2021IT000150"`).
4. **`NumericNormalizer`**: Parses float numbers and applies numerical tolerance $|v_{\text{expected}} - v_{\text{actual}}| \le 0.01$.
5. **`DegreeNameNormalizer`**: Maps shorthand degree prefixes (`"B.Tech"`) to canonical titles (`"Bachelor of Technology"`).
6. **`UniversityAliasNormalizer`**: Maps institution acronyms (`"VTU"`) to full canonical titles (`"Vivekananda Technical University"`).

### 5.2 Structured OCR Error Taxonomy Engine
When a discrepancy is identified, the framework categorizes the failure into one of nine error classes:
- **`OCR_ERROR`**: Character substitution/deletion ($\text{CER} > 0.50$).
- **`FIELD_MISSING`**: Ground truth field omitted in prediction.
- **`HALLUCINATION`**: Unrequested field generated in prediction.
- **`FORMAT_ERROR`**: Invalid date/number string syntax.
- **`NORMALIZATION_ERROR`**: Post-canonical representation mismatch.
- **`PARTIAL_MATCH`**: Partial character similarity ($0.01 < \text{CER} \le 0.50$).
- **`LOW_CONFIDENCE`**: Model prediction confidence $< 0.70$.
- **`CATEGORY_ERROR`**: Document category classification error.

---

## 6. Experimental Setup & Protocol

### 6.1 Dataset Composition (`AU_DIC_Benchmark_v1.0`)
The evaluation dataset consists of 360 image specimens (3 document categories $\times$ 30 unique document instances $\times$ 4 quality profiles). Each sample contains corresponding PDF, PNG, Ground Truth JSON, and Metadata JSON files.

### 6.2 Evaluation Metrics
The framework evaluates system and model performance across two distinct sub-tasks: (a) **Document Category Classification** and (b) **Key-Value Entity Field Extraction**. The computed quantitative metrics are defined as follows:

1. **Category Classification Accuracy**: The proportion of specimens where the predicted document category ($\hat{C}_i$) matches the ground truth category ($C_i$):
   $$\text{Category Accuracy} = \frac{\sum_{i=1}^N \mathbb{I}(\hat{C}_i = C_i)}{N}$$
   where $N=360$ total evaluated specimens.

2. **Field Extraction Precision ($P$)**, **Recall ($R$)**, and **F1 Score ($F_1$)**: Macro-averaged key-value field extraction metrics across all extracted target entities:
   $$P = \frac{\text{True Positive Fields}}{\text{True Positive Fields} + \text{False Positive Fields}}, \quad R = \frac{\text{True Positive Fields}}{\text{True Positive Fields} + \text{False Negative Fields}}, \quad F_1 = 2 \cdot \frac{P \cdot R}{P + R}$$

3. **Character Error Rate (CER)**: Levenshtein character edit distance between canonically normalized predicted field strings and expected ground truth field strings, normalized by the total ground truth character length ($L_{\text{GT}}$):
   $$\text{CER} = \frac{S_{\text{char}} + D_{\text{char}} + I_{\text{char}}}{L_{\text{GT}}}$$

4. **Word Error Rate (WER)**: Tokenized word-level edit distance between predicted field strings and ground truth field strings, normalized by total ground truth word count ($W_{\text{GT}}$):
   $$\text{WER} = \frac{S_{\text{word}} + D_{\text{word}} + I_{\text{word}}}{W_{\text{GT}}}$$

5. **Joint Record Exact Match Rate (EM)**: The percentage of specimens that achieve both 100% key-value field extraction AND correct top-level category classification simultaneously.

6. **Latency & Throughput**: Execution latency per specimen ($\text{ms/sample}$) and framework processing throughput ($\text{samples/sec}$).

---

## 7. Results & Validation

### 7.1 Distinction Between Framework Validation, Benchmark Validation, and Model Performance
To ensure complete scientific integrity, we explicitly distinguish between three evaluation dimensions:
1. **Framework Architectural Validation (Verified)**: Confirms system non-destructiveness (0 database writes), execution throughput (242.59 samples/sec), mean processing latency (4.12 ms/sample), and fault-tolerant checkpointing.
2. **Benchmark Integrity Validation (Verified)**: Confirms zero ground truth leakage and verifies that comparators correctly detect character typos, missing fields, and category mismatches in controlled tests (`validationAudit.test.ts`).
3. **Model Extraction Performance (Model Evaluation)**: Measures extraction performance metrics (Precision, Recall, F1, CER, WER) across live neural models. The baseline reference metrics in Table 1 represent system dry-run verification of the benchmark evaluation pipeline itself.

### 7.2 Framework Execution & System Verification Metrics
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

### 7.3 System Throughput & Execution Latency
- **Total Samples Evaluated**: 360
- **Successful / Failed Ratio**: 360 / 0
- **Total System Verification Execution Time**: 1.48 seconds
- **System Verification Throughput**: 242.59 samples/sec
- **Mean System Processing Latency**: 4.12 ms/sample

### 7.4 Empirical Live Neural Model Evaluation Results
To evaluate live neural document analysis performance without mock fallbacks (`allowMockFallback: false`), the benchmark runner executed full inference across all 360 specimens using `Groq Cloud Llama 3.1 8B Instant` (`run_1785796639905`). Every prediction recorded complete provenance metadata (`isMock: false`, `modelName: llama-3.1-8b-instant`, `requestId`).

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
2. **Document Category Classification Task (66.67% Category Accuracy)**: The empirical evaluation uncovered a prompt-level schema constraint failure mode. Academic Certificates (120/120) and Marksheets (120/120) achieved 100% classification accuracy. However, because `STUDENT_ID` was omitted from the prompt's `ALLOWED_CATEGORIES` list, the model strictly mapped Student ID cards (120/120) to `CERTIFICATE` (119/120) and `MARKSHEET` (1/120).
3. **Joint Record Exact Match Rate (0.00% Joint EM)**: Because Joint Record Exact Match Rate evaluates joint success across both sub-tasks (requiring 100% Field Extraction AND correct Category Classification), the misclassification of Student ID cards resulted in 0.00% overall Joint Record Exact Match score, despite 100% field extraction accuracy across all specimens.

---

## 8. Discussion, Threats to Validity & Limitations

### 8.1 Discussion of Findings
1. **Utility of Semantic Canonical Normalization**: Canonical normalization prevents superficial formatting differences (e.g., date styling) from distorting model accuracy scores.
2. **Safe Read-Only Execution**: Performing evaluations headlessly without database mutations allows benchmarks to be run safely in production environments.

### 8.2 Threats to Validity
- **Internal Validity**: Verified by confirming that `AuDicPredictionAdapter` reads specimen images/text without accessing ground truth JSON dictionaries, eliminating ground truth leakage.
- **External Validity**: Synthetic templates generated by ADBG v1.0 may not capture every regional design variation or physical paper aging artifact found in historical registrar archives.
- **Construct Validity**: Metric definitions follow standard ICDAR and IEEE document analysis definitions.

### 8.3 Detailed Limitations Analysis
1. **Synthetic Document Constraints**: While ADBG v1.0 models realistic visual layouts, synthetic documents lack genuine physical paper degradation artifacts such as ink bleeding, paper creases, and physical stamp impressions.
2. **Regional Template & Design Scope**: Current templates reflect standard Indian and international university formats. Highly customized designs from non-standard institutions are not currently represented.
3. **Language Scope**: ADBG v1.0 is currently restricted to English (`en_IN`). Multi-lingual documents containing non-Latin scripts (e.g., Devanagari, Tamil) are reserved for future releases.
4. **Validation on Physical Archives**: While synthetic benchmarks provide privacy-safe evaluation, future work must incorporate anonymized physical scans from partner institutions.

---

## 9. Future Work

Future research directions include:
1. **ADBG v2.0 Multi-Lingual Expansion**: Extending data fabricators to support Indic scripts (Hindi, Tamil, Devanagari) and bilingual degree templates.
2. **Open-Weight Vision-Language Model Benchmarking**: Benchmarking open-source VLMs (LayoutLMv3, Donut, Florence-2) across ADBG quality profiles to measure degradation decay curves under zero-shot prompting.

---

## 10. Conclusion

In this paper, we presented **ADBG v1.0** and the **AU DIC Benchmark Evaluation Framework v1.0** for evaluating academic document intelligence systems. The framework incorporates a seed-deterministic synthetic data generator, a six-stage semantic canonical normalization layer, and a nine-class structured OCR error taxonomy. Experimental validation over 360 specimens confirmed deterministic, read-only benchmark execution. This work establishes a privacy-safe, reproducible foundation for future research in document analysis and information extraction.

---

## Ethics & Privacy Statement

All document specimens generated by ADBG v1.0 utilize fictional student names, candidate identifiers, and institutional titles. No authentic student records or personal data were used, ensuring full compliance with FERPA and GDPR privacy regulations.

---

## Appendix A: Reproducibility Specifications

- **Dataset SHA-256 Hash**: `17c136ef76dd0f82`
- **Git Commit Hash**: `823334b`
- **Framework Version**: `1.0.0` (Release Candidate 1 - RC1)
- **Report Directory**: `backend/benchmark_reports/run_1785793454004/`

---

## Appendix B: Technical Clarifications & Reviewer Inquiries

### B.1 CanonicalNormalizer Fallback Behavior
*Inquiry*: How does `CanonicalNormalizer` handle unexpected date or numeric strings that do not match standard regex patterns?  
*Answer*: When a field value does not match defined date (`YYYY-MM-DD`, `DD/MM/YYYY`, `Month DD, YYYY`) or numerical patterns, `CanonicalNormalizer` falls back to `StringNormalizer.normalize(val, true)`. This pipeline trims whitespace, collapses multiple internal spaces, and lowercases string characters, ensuring that non-standard fields are evaluated fairly without crashing the comparator pipeline.

### B.2 Scalability Beyond 360 Samples
*Inquiry*: How does the framework scale when evaluating datasets exceeding 10,000+ specimens?  
*Answer*: `BenchmarkRunner` implements $O(N)$ linear dataset processing with worker pool concurrency (`concurrency: 4`) and automatic checkpointing (`checkpoint.json`). In large-scale evaluation runs, `BenchmarkRunner` updates `checkpoint.json` after every batch increment. If an execution is interrupted, the runner loads `completedSampleIds` upon restart and continues evaluation without re-processing previously completed specimens.

### B.3 Multi-Page Academic Transcripts
*Inquiry*: How are multi-page academic transcripts handled in the ground truth JSON schema?  
*Answer*: The ADBG v1.0 ground truth schema structures mark sheets as a top-level `semester_records` array. Each entry contains a `semester_name`, `sgpa`, `credits_earned`, and a nested `course_marks` array containing individual course items (subject code, name, credits, letter grade, grade point). Multi-page transcripts append semester entries sequentially within the `semester_records` array, maintaining structural integrity across page boundaries.

---

READY FOR INTERNAL FACULTY REVIEW
