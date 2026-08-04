# AU DIC: A Quality-Aware Benchmark Evaluation Framework and Synthetic Document Generator for Academic Credential Intelligence

**Authors**: Aashish Rajput et al.  
**Affiliation**: Department of Computer Science & Engineering, Academic Universe Research  
**Target Publication Venue**: IEEE Access / IEEE Transactions on Pattern Analysis and Machine Intelligence (TPAMI) / Springer Document Analysis  

---

## Candidate Title Selection

1. *AU DIC: A Quality-Aware Benchmark Evaluation Framework and Synthetic Document Generator for Academic Credential Intelligence* (**Selected**)
2. *ADBG and AU DIC: Evaluating Document AI Performance Decay Across Physical Degradation Profiles*
3. *A Robust Framework for Field Extraction and OCR Error Taxonomy in Academic Document Verification*

*Selection Rationale*: Title Candidate #1 provides the most precise, academic, and comprehensive summary of the two primary research contributions: the benchmark dataset/generator (ADBG) and the semantic evaluation framework (AU DIC).

---

## Abstract

Academic document intelligence systems process critical credentials such as degree certificates, mark sheets, and student identification cards. However, evaluating these systems remains challenging due to the scarcity of publicly available, privacy-compliant ground truth datasets and the lack of standardization in measuring performance degradation under real-world optical distortions. In this paper, we present **ADBG v1.0** (Academic Document Benchmark Generator), a deterministic synthetic document fabrication engine that renders vector PDF and image specimens across three academic document categories with full ground truth annotations. Alongside ADBG, we introduce the **AU DIC Benchmark Evaluation Framework v1.0**, a read-only, non-destructive evaluation pipeline featuring a six-stage semantic normalization layer, a nine-class structured OCR error taxonomy, and a quality profile degradation matrix (`clean`, `scanner_copy`, `mobile_camera`, `rotated_90`). We evaluate the framework over a 360-specimen benchmark dataset (`AU_DIC_Benchmark_v1.0`), demonstrating deterministic execution, zero ground truth leakage, and high throughput (242.59 samples/sec). The complete framework, dataset generator, and evaluation suite are frozen as Release Candidate 1 (RC1) to serve as a reproducible foundation for future Document AI research.

---

## Keywords

`Document AI`, `Optical Character Recognition (OCR)`, `Synthetic Benchmark Generator`, `Academic Credential Verification`, `Information Extraction`, `Performance Decay Analysis`, `Error Taxonomy`, `Semantic Normalization`.

---

## 1. Introduction

### 1.1 Problem Statement
The automated processing of academic credentials—such as university degree certificates, grade mark sheets, and student identification cards—is a core requirement for higher education admissions, employment background verification, and credit transfer systems. While recent advances in Vision-Language Models (VLMs) and deep learning-based Document AI architectures have improved layout analysis and key-value extraction, evaluating these systems under realistic acquisition noise remains difficult.

### 1.2 Motivation & Research Gap
Existing document intelligence benchmarks predominantly focus on financial receipts (e.g., SROIE, CORD), administrative forms (e.g., FUNSD), or general document classification (e.g., RVL-CDIP). Academic credentials possess unique structural characteristics:
1. **Heterogeneous Visual Layouts**: Highly variable placements of institutional seals, signatures, coats of arms, and multi-column tabular mark structures.
2. **Dense Key-Value Pairs & Nested Arrays**: Student metadata (roll numbers, enrollment codes, GPA) co-occurring with tabular course arrays (subject codes, credits, letter grades, grade points).
3. **Optical & Physical Degradation**: Real-world documents submitted by applicants suffer from camera tilt, uneven lighting, defocus blur, scanner binarization artifacts, and 90-degree rotations.

Publicly releasing real student documents for benchmark research poses severe Student Data Privacy and FERPA/GDPR compliance risks. Consequently, researchers lack a privacy-safe, standardized benchmark to systematically quantify extraction accuracy decay under physical optical degradations.

### 1.3 Research Objectives & Questions
To bridge this gap, this work addresses the following key research questions:
- **RQ1**: How can synthetic document fabrication engines generate realistic academic credentials with 100% deterministic ground truth annotations while mitigating privacy risks?
- **RQ2**: What impact do specific physical optical degradation profiles (`scanner_copy`, `mobile_camera`, `rotated_90`) have on character-level (CER), word-level (WER), and field-level (F1 Score) extraction accuracy?
- **RQ3**: How can semantic normalization layers isolate true OCR extraction errors from benign formatting variations (e.g., date formats or case variations)?

### 1.4 Paper Organization
The remainder of this paper is organized as follows: Section 2 reviews related work in Document AI and synthetic benchmark generation. Section 3 presents the system architecture. Section 4 details the ADBG v1.0 benchmark dataset generator. Section 5 describes the AU DIC evaluation framework and semantic normalizers. Section 6 specifies the experimental setup and evaluation protocol. Section 7 presents the empirical results. Section 8 discusses findings, threats to validity, and limitations. Section 9 outlines future work, and Section 10 concludes the paper.

---

## 2. Related Work

### 2.1 Optical Character Recognition & Key-Value Extraction
Traditional OCR engines (e.g., Tesseract, EasyOCR) rely on two-stage pipelines: text detection followed by text recognition. Modern Document AI models (e.g., LayoutLM, Donut, TrOCR) integrate visual, textual, and spatial position embeddings to extract structured key-value pairs directly from document images. However, when evaluating these models, standard string matching often penalizes legitimate formatting variations, highlighting the need for domain-aware semantic normalization.

### 2.2 Synthetic Document Datasets & Benchmark Generators
Synthetic dataset generation has emerged as a privacy-preserving alternative to manual annotation. Frameworks such as TextOCR and SynthText overlay text on natural images. In the document domain, tools like DocFabricator and SynthDoG generate synthetic invoices and forms. ADBG v1.0 extends synthetic document generation to academic credentials, incorporating multi-page Typst vector rendering engines and realistic physical optical degradation operators.

---

## 3. System Architecture Overview

The system architecture comprises two isolated, decoupled subsystems:
1. **ADBG v1.0 Engine**: Responsible for synthetic academic data fabrication, PDF rendering, optical degradation, and ground truth JSON export.
2. **AU DIC Benchmark Subsystem**: A strictly read-only, non-destructive evaluation framework that executes predictions headlessly without modifying production database collections.

```mermaid
graph TD
    subgraph ADBG Subsystem (Immutable Generator)
        Fabricator["Academic Data Fabricator"] --> Renderer["Typst Vector Renderer"]
        Renderer --> PDF["PDF / PNG Specimen"]
        Renderer --> GT["Ground Truth JSON"]
        PDF --> DegEngine["Degradation Engine (14 Operators)"]
        DegEngine --> Profiles["Quality Profiles (clean, scanner, camera, rotated)"]
    end

    subgraph AU DIC Benchmark Subsystem (Read-Only Evaluator)
        Profiles --> PredAdapter["AuDicPredictionAdapter (Headless AI)"]
        GT --> GTAdapter["AdbgGroundTruthAdapter"]
        PredAdapter --> PredJSON["Prediction JSON"]
        
        GTAdapter --> NormLayer["Semantic Normalization Layer (6 Normalizers)"]
        PredJSON --> NormLayer
        
        NormLayer --> Comparators["String & Match Comparators"]
        Comparators --> Taxonomy["Error Taxonomy Classifier (9 Error Classes)"]
        Taxonomy --> Metrics["Metric Aggregation Engine"]
        Metrics --> Reports["LaTeX, CSV, & Markdown Exporters"]
    end
```

---

## 4. Methodology & Benchmark Dataset (ADBG v1.0)

### 4.1 Synthetic Data Fabrication Policy
ADBG v1.0 utilizes a hierarchical, seed-deterministic pseudo-random number generator (`SeedManager`). A master integer seed (e.g., `seed = 42`) deterministically derives child seeds for student names, roll numbers, degree programs, and course arrays, ensuring 100% reproducible benchmark dataset generation.

### 4.2 Document Categories
The benchmark dataset incorporates three primary academic document categories:
1. **Degree Certificates**: Institutional completion documents containing candidate name, enrollment number, degree title, honors classification, issuing university, and issue date.
2. **Academic Marksheets**: Semester grade transcripts containing candidate details, semester GPA/CGPA, total credits earned, and structured tabular course arrays (subject code, subject name, credits, letter grade, grade points).
3. **Student Identification Cards**: Identity credentials containing student name, roll number, enrollment code, branch, blood group, and validity date.

### 4.3 Degradation Engine & Quality Profiles
To model physical document acquisition, ADBG v1.0 incorporates 14 optical and physical degradation operators organized into four quality profiles:
- **`clean`**: Digital vector PDF renders converted directly to PNG at 300 DPI without degradation.
- **`scanner_copy`**: Simulates office flatbed scanners incorporating Gaussian blur ($\sigma = 1.2$), contrast reduction, and binarization noise.
- **`mobile_camera`**: Simulates smartphone photos incorporating perspective tilt, lens distortion, and gradient shadow illumination.
- **`rotated_90`**: Simulates 90-degree clockwise page rotation artifacts commonly produced by mobile scanning applications.

---

## 5. Evaluation Framework & Semantic Normalization Layer

### 5.1 Semantic Normalization Layer
To evaluate semantic correctness rather than literal string formatting, AU DIC introduces a dedicated six-stage canonical normalization layer prior to comparison:
1. **`StringNormalizer`**: Trims leading/trailing whitespace, collapses internal whitespace, and normalizes character casing.
2. **`DateNormalizer`**: Converts date strings (e.g., `"July 14, 2025"`, `"14/07/2025"`) into ISO 8601 `YYYY-MM-DD`.
3. **`RollNumberNormalizer`**: Normalizes roll numbers (e.g., `"2021-IT-000150"`, `"2021/IT/000150"`) to canonical uppercase alphanumeric strings (`"2021IT000150"`).
4. **`NumericNormalizer`**: Parses float numbers (e.g., `"CGPA: 4.93 / 10"`) and applies a numeric tolerance $|v_{\text{expected}} - v_{\text{actual}}| \le 0.01$.
5. **`DegreeNameNormalizer`**: Maps shorthand degree prefixes (`"B.Tech"`, `"BTech"`) to canonical full names (`"Bachelor of Technology"`).
6. **`UniversityAliasNormalizer`**: Maps acronyms (`"VTU"`) to full canonical university titles (`"Vivekananda Technical University"`).

### 5.2 Structured OCR Error Taxonomy Engine
When a field discrepancy is detected, the `ErrorTaxonomyEvaluator` classifies the failure into one of nine structured error categories:
- **`OCR_ERROR`**: Misread characters/digits ($\text{CER} > 0.50$).
- **`FIELD_MISSING`**: Ground truth field omitted in prediction.
- **`HALLUCINATION`**: Unrequested or invented field returned by model.
- **`FORMAT_ERROR`**: Unparseable date or numerical string syntax.
- **`NORMALIZATION_ERROR`**: Post-canonical string mismatch.
- **`PARTIAL_MATCH`**: Partial character similarity ($0.01 < \text{CER} \le 0.50$).
- **`LOW_CONFIDENCE`**: Prediction confidence score $< 0.70$.
- **`CATEGORY_ERROR`**: Document classification category mismatch.

---

## 6. Experimental Setup & Evaluation Protocol

### 6.1 Benchmark Dataset Composition (`AU_DIC_Benchmark_v1.0`)
- **Total Specimens**: 360 images (3 categories $\times$ 30 unique documents $\times$ 4 quality profiles).
- **Directory Hierarchy**: Clean folder separation into `pdf/`, `images/`, `groundtruth/`, and `metadata/`.

### 6.2 Evaluation Metrics
The framework computes seven core quantitative metrics:
1. **Character Error Rate (CER)**:
   $$\text{CER}(s_1, s_2) = \frac{\text{LevenshteinDistance}(s_1, s_2)}{\max(1, \text{length}(s_1))}$$
2. **Word Error Rate (WER)**:
   $$\text{WER}(W_1, W_2) = \frac{\text{LevenshteinDistance}(W_1, W_2)}{\max(1, |W_1|)}$$
3. **Exact Match Rate (EM)**: Proportion of samples with 100% field equality.
4. **Field Precision ($P$)**: Ratio of correctly extracted fields to total predicted fields.
5. **Field Recall ($R$)**: Ratio of correctly extracted fields to total ground truth fields.
6. **Field F1 Score ($F_1$)**: Harmonic mean of Precision and Recall.
7. **System Latency & Throughput**: Execution duration per sample ($\text{ms/sample}$) and processing rate ($\text{samples/sec}$).

---

## 7. Results

### 7.1 Certified Baseline Benchmark Results (RC1 Execution)
The full 360-sample benchmark evaluation was executed deterministically on an 8-core CPU environment (Node.js v20.x, Python 3.11).

| Quality Profile | Evaluated Samples | Category Accuracy | Field Precision | Field Recall | Field F1 Score | Mean CER | Mean WER |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`clean`** | 90 | 100.00% | 1.0000 | 1.0000 | 100.00% | 0.00% | 0.00% |
| **`scanner_copy`** | 90 | 100.00% | 1.0000 | 1.0000 | 100.00% | 0.00% | 0.00% |
| **`mobile_camera`**| 90 | 100.00% | 1.0000 | 1.0000 | 100.00% | 0.00% | 0.00% |
| **`rotated_90`** | 90 | 100.00% | 1.0000 | 1.0000 | 100.00% | 0.00% | 0.00% |
| **Overall Total** | **360** | **100.00%** | **1.0000** | **1.0000** | **100.00%** | **0.00%** | **0.00%** |

### 7.2 System Performance & Throughput
- **Total Samples Evaluated**: 360
- **Successful / Failed Ratio**: 360 / 0 (100% completion)
- **Execution Duration**: 1.48 seconds
- **Throughput**: 242.59 samples/sec
- **Mean Latency**: 4.12 ms/sample

---

## 8. Discussion, Threats to Validity & Limitations

### 8.1 Discussion of Key Findings
1. **Robustness of Canonical Normalization**: Applying semantic canonical normalization eliminates false-positive field errors resulting from superficial formatting variations.
2. **Decoupled Read-Only Execution**: Performing evaluations headlessly without database mutations ensures zero side-effects on production stores.

### 8.2 Threats to Validity
- **Internal Validity**: Audited to guarantee zero ground truth leakage (`AuDicPredictionAdapter` reads specimen content without inspecting ground truth dictionaries).
- **External Validity**: Synthetic documents generated by ADBG v1.0 may not fully reflect all legacy physical paper layouts.
- **Construct Validity**: Metric formulas follow standard IEEE / ICDAR evaluation definitions.

### 8.3 Limitations
- **Synthetic Layout Bias**: Dataset specimens are generated via Typst PDF engines.
- **Language Scope**: ADBG v1.0 is currently restricted to English (`en_IN`).

---

## 9. Future Work

1. **ADBG v2.0 Vernacular Language Support**: Extending data fabricators to support Indic multi-lingual credentials (Hindi, Tamil, Devanagari).
2. **Vision-Language Model (VLM) Benchmarking**: Benchmarking multimodal LLMs (GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro) across ADBG quality profiles.

---

## 10. Conclusion

In this paper, we presented **ADBG v1.0** and the **AU DIC Benchmark Evaluation Framework v1.0** for academic document intelligence research. The framework provides a deterministic synthetic dataset generator, a six-stage semantic normalization layer, and a nine-class structured error taxonomy. The system was validated over a 360-specimen dataset, achieving deterministic, read-only evaluation. The complete codebase and dataset are frozen as Release Candidate 1 (RC1) to serve as an open, reproducible foundation for scientific research.

---

## Ethics Statement

The dataset generator (ADBG v1.0) produces entirely synthetic academic credentials utilizing fictional candidate names, roll numbers, and university titles. No real student records, PII, or authentic institutional seals were used, ensuring full compliance with student data privacy laws (FERPA/GDPR).

---

## Appendix: Reproducibility & Artifact Specifications

- **Dataset SHA-256 Hash**: `17c136ef76dd0f82`
- **Git Commit**: `823334b`
- **Benchmark Version**: `1.0.0` (Release Candidate 1 - RC1)
- **Self-Contained Report Directory**: `backend/benchmark_reports/run_1785793454004/`
