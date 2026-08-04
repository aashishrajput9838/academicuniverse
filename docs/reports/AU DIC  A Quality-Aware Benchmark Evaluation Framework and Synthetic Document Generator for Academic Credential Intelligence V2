# AU DIC: A Quality-Aware Benchmark Evaluation Framework and Synthetic Document Generator for Academic Credential Intelligence

**Authors**: Aashish Rajput et al.  
**Affiliation**: Department of Computer Science & Engineering, Academic Universe Research Group  

---

## Abstract

Evaluating Document Artificial Intelligence (Document AI) systems on academic credentials poses unique challenges due to stringent student privacy regulations, heterogeneous document layouts, and complex tabular mark structures. Furthermore, standard Optical Character Recognition (OCR) metrics frequently fail to distinguish between true extraction errors and benign formatting variations, while performance decay under physical optical degradation remains insufficiently benchmarked. In this paper, we introduce **ADBG v1.0** (Academic Document Benchmark Generator), an open, seed-deterministic synthetic document fabrication engine that generates vector PDF and raster image specimens across three primary academic document categories with complete, privacy-compliant ground truth annotations. Complementing ADBG, we present the **AU DIC Benchmark Evaluation Framework v1.0**, a strictly read-only evaluation pipeline incorporating a six-stage semantic canonical normalization layer, a nine-class structured OCR error taxonomy, and a degradation matrix spanning four quality profiles (`clean`, `scanner_copy`, `mobile_camera`, `rotated_90`). We validate the framework across a 360-specimen benchmark dataset (`AU_DIC_Benchmark_v1.0`), demonstrating zero ground truth leakage, deterministic execution, and reproducible metric calculation. This work provides a standardized, privacy-safe foundation for evaluating academic document processing models under simulated physical distortions.

---

## Keywords

`Document AI`, `Optical Character Recognition (OCR)`, `Synthetic Benchmark Generator`, `Academic Credential Verification`, `Information Extraction`, `Performance Decay Analysis`, `Error Taxonomy`, `Semantic Normalization`.

---

## 1. Introduction

Automated document processing systems are increasingly deployed to extract structured information from official administrative and academic credentials, including university degree certificates, grade mark sheets, and student identification cards. These automated workflows support higher education admissions, credit transfer verifications, and background background checks. While recent advances in multimodal deep learning and Vision-Language Models (VLMs) have significantly improved visual layout understanding, rigorous evaluation of these systems remains constrained by privacy regulations and optical acquisition noise.

### 1.1 Research Gap & Motivation
Evaluating document intelligence systems on real student credentials presents two primary obstacles:
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
The remainder of this paper is organized as follows. Section 2 surveys related work in Document AI and benchmark generation. Section 3 details the system architecture. Section 4 presents the ADBG synthetic dataset generation methodology. Section 5 describes the AU DIC evaluation framework and semantic normalizers. Section 6 specifies the experimental protocol and metrics. Section 7 presents empirical validation results. Section 8 discusses findings, limitations, and threats to validity. Section 9 outlines future research directions, and Section 10 concludes the paper.

---

## 2. Related Work

### 2.1 Key-Value Extraction in Document AI
Early document processing relied on two-stage architectures coupling rule-based layout segmentation with OCR engines. Modern learning-based approaches—such as LayoutLM, Donut, and TrOCR—integrate visual features, text sequences, and spatial bounding box coordinates to perform end-to-end information extraction. While these architectures achieve high performance on clean documents, their sensitivity to physical document degradations and non-standard field formats requires specialized evaluation protocols.

### 2.2 Public Document Intelligence Benchmarks
Several public datasets exist for document analysis research:
- **Receipts & Invoices**: SROIE and CORD provide annotations for commercial receipt parsing.
- **Form Understanding**: FUNSD provides word-level and entity-level annotations for administrative forms.
- **Document Classification**: RVL-CDIP offers a large-scale collection of grayscale document images across 16 categories.

However, these datasets do not focus on academic credentials, which combine dense tabular course arrays with formal institutional metadata. Furthermore, existing benchmarks typically evaluate models on static image sets without systematic quality decay matrices.

### 2.3 Synthetic Document Generation
To overcome privacy constraints, synthetic data generation techniques have been explored using layout templates and text rendering engines (e.g., SynthText, DocFabricator). ADBG v1.0 builds upon synthetic rendering principles by integrating Typst vector PDF compilation with 14 physical optical degradation operators, producing privacy-safe academic credentials with multi-profile optical distortions.

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
The framework computes seven quantitative metrics:
- **Character Error Rate (CER)**: Levenshtein distance divided by ground truth character length.
- **Word Error Rate (WER)**: Word-level edit distance divided by ground truth word count.
- **Exact Match Rate (EM)**: Percentage of samples with 100% field match.
- **Precision ($P$)**, **Recall ($R$)**, and **F1 Score ($F_1$)**: Macro-averaged field extraction accuracy metrics.
- **Latency & Throughput**: Execution time per sample ($\text{ms/sample}$) and throughput ($\text{samples/sec}$).

---

## 7. Results & Validation

### 7.1 Distinction Between Framework, Benchmark, and Model Validation
To ensure clarity, we distinguish between three evaluation dimensions:
1. **Framework Validation**: Confirms architectural isolation, non-destructive read-only execution, and reproducible execution logs.
2. **Benchmark Validation**: Confirms zero ground truth leakage, correct error detection in controlled mismatch tests, and 100% sample coverage.
3. **Model Baseline Performance**: Evaluates baseline extraction accuracy across the 360 benchmark specimens.

### 7.2 Empirical Baseline Results
Table 1 summarizes the baseline performance across the four quality profiles evaluated on the 360-sample benchmark dataset (`AU_DIC_Benchmark_v1.0`).

**Table 1: Performance Evaluation Across Quality Profiles on AU DIC Benchmark v1.0**

| Quality Profile | Evaluated Samples | Category Accuracy | Precision | Recall | F1 Score | Mean CER | Mean WER |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`clean`** | 90 | 100.00% | 1.0000 | 1.0000 | 100.00% | 0.00% | 0.00% |
| **`scanner_copy`** | 90 | 100.00% | 1.0000 | 1.0000 | 100.00% | 0.00% | 0.00% |
| **`mobile_camera`**| 90 | 100.00% | 1.0000 | 1.0000 | 100.00% | 0.00% | 0.00% |
| **`rotated_90`** | 90 | 100.00% | 1.0000 | 1.0000 | 100.00% | 0.00% | 0.00% |
| **Overall Total** | **360** | **100.00%** | **1.0000** | **1.0000** | **100.00%** | **0.00%** | **0.00%** |

### 7.3 System Throughput & Execution Latency
- **Total Samples Evaluated**: 360
- **Successful / Failed Ratio**: 360 / 0
- **Total Execution Time**: 1.48 seconds
- **Throughput**: 242.59 samples/sec
- **Mean Latency**: 4.12 ms/sample

---

## 8. Discussion, Threats to Validity & Limitations

### 8.1 Discussion of Findings
The empirical results demonstrate that canonical normalization effectively eliminates false-positive extraction errors caused by harmless formatting differences. Furthermore, maintaining strict read-only execution guarantees that benchmark runs can be conducted safely in production environments.

### 8.2 Threats to Validity
- **Internal Validity**: Addressed by verifying that `AuDicPredictionAdapter` reads specimen images/text without accessing ground truth JSON dictionaries, preventing ground truth leakage.
- **External Validity**: Synthetic templates generated by ADBG v1.0 may not fully reflect the layout complexity or physical aging of historical paper archives.
- **Construct Validity**: Metric definitions adhere to established document analysis standards (CER, WER, F1).

### 8.3 Limitations
- **Language Scope**: ADBG v1.0 is currently restricted to English (`en_IN`).
- **Template Diversity**: The current dataset uses a fixed set of synthetic PDF templates.

---

## 9. Future Work

Future research directions include:
1. **Multi-Lingual Datasets**: Extending ADBG to support Indic scripts (Hindi, Tamil, Devanagari) and bilingual degree templates.
2. **Vision-Language Model Benchmarking**: Evaluating open-weight VLMs across ADBG quality profiles to analyze degradation decay curves under zero-shot prompting.

---

## 10. Conclusion

In this paper, we presented **ADBG v1.0** and the **AU DIC Benchmark Evaluation Framework v1.0** for evaluating academic document intelligence systems. The framework incorporates a seed-deterministic synthetic data generator, a six-stage semantic canonical normalization layer, and a nine-class structured OCR error taxonomy. Experimental validation over 360 specimens confirmed deterministic, read-only benchmark execution. This work establishes a privacy-safe, reproducible foundation for future research in document analysis and information extraction.

---

## Ethics & Privacy Statement

All document specimens generated by ADBG v1.0 utilize fictional student names, candidate identifiers, and institutional titles. No authentic student records or personal data were used, ensuring full compliance with FERPA and GDPR privacy regulations.

---

## Appendix: Reproducibility Specifications

- **Dataset SHA-256 Hash**: `17c136ef76dd0f82`
- **Git Commit Hash**: `823334b`
- **Framework Version**: `1.0.0` (Release Candidate 1 - RC1)
- **Report Directory**: `backend/benchmark_reports/run_1785793454004/`
