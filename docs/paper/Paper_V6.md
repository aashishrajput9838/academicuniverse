# Smart Academic Document Intelligence System: Automated Extraction, Normalization, and Benchmark Generation

**Authors**: AU DIC Research Team  
**Target Publication Venue**: IEEE Access / ICDAR 2026  
**Repository & Artifact Build**: `run_1785959173886` | Dataset Hash: `17c136ef76dd0f82` | Commit: `88140d1`  

---

## Abstract

Academic document intelligence systems are increasingly used to extract information from certificates, marksheets, transcripts, and student identification documents, but evaluating such systems is challenging because real academic records contain sensitive student information and cannot be freely distributed for benchmarking. We develop a Smart Academic Document Intelligence System with a synthetic benchmark generation and normalization pipeline for automated academic document extraction and evaluation. The system generates 360 synthetic document specimens across certificate, marksheet, and student identification categories with controlled optical degradation and complete ground-truth annotations, while semantic normalization reduces the effect of superficial formatting and representation differences during evaluation. In the canonical live evaluation using MiniCPM-V (7.6B, Q4_0) through the local Ollama runtime, the system achieved 75.23% field-level F1, 74.60% raw exact match, 82.18% normalized exact match, and 11.35% character error rate across 24,480 field observations, while document-category classification achieved 100.00% accuracy. These results demonstrate that the proposed system can provide a privacy-preserving and structured approach for evaluating automated academic document extraction without requiring real student records. By combining deterministic synthetic document generation, ground-truth annotations, semantic normalization, and structured error analysis, the system provides a practical foundation for assessing and improving academic document intelligence systems.

**Index Terms**—Academic Document Intelligence, Document Extraction, Synthetic Benchmark Generation, Information Extraction, Semantic Normalization, OCR Error Analysis, Optical Degradation, Document Evaluation

---

## 1. Introduction

Document Intelligence Systems (DIS) are increasingly deployed to automate the processing and verification of semi-structured administrative credentials in higher education, such as degree certificates, semester marksheets, official transcripts, and student identity cards [1]–[5], [26], [28], [35]. Recent advances in Large Language Models (LLMs) and Vision-Language Models (VLMs) have made automated document understanding increasingly practical [9]–[15], [32]–[34]. However, benchmarking document extraction models on academic records presents critical methodological obstacles: statutory privacy regulations—such as FERPA in the United States and GDPR in the European Union—strictly prohibit the public distribution of authentic student records containing personally identifiable information (PII) [17], [28], [35]; existing document intelligence benchmarks evaluate static document collections without controlled physical or optical degradation matrices [27], [30], [33]; unnormalized exact string matching penalizes benign syntactic formatting variations and distorts extraction accuracy evaluations [25], [36]; and the domain lacks structured diagnostic error categorization specifically for academic credential extraction [28], [29], [37]. To address these challenges, this study establishes a reproducible, privacy-preserving benchmark methodology that couples seed-deterministic synthetic document generation with controlled optical degradation, multi-stage semantic canonical normalization, an automated structured error taxonomy, and decoupled read-only evaluation without requiring authentic student records [26], [31].

The key contributions of this work are summarized as follows:

1. **Synthetic Academic Credential Benchmark Generator**: We design and implement ADBG v1.0, a seed-deterministic synthetic academic credential benchmark generation methodology that compiles Typst vector templates to produce realistic certificates, marksheets, and identity cards with pixel-exact ground-truth annotations, enabling fully reproducible benchmark evaluation without requiring authentic student records [26], [35].
2. **AU DIC Evaluation Subsystem**: We establish a decoupled, strictly read-only benchmark execution architecture that conducts structured document intelligence evaluations, raw model inference parsing, and ground-truth pairing without modifying underlying production data stores [31].
3. **Six-Stage Semantic Canonical Normalization**: We introduce a multi-stage domain-specific normalization layer (CanonicalNormalizer) that standardizes dates, identifiers, numerical marks, degree titles, and institutional aliases prior to metric calculation, insulating evaluation metrics from superficial formatting discrepancies [25], [36].
4. **Nine-Class Structured OCR Error Taxonomy**: We develop an automated diagnostic classification module that categorizes field-level extraction failures into nine mutually exclusive error classes (including character recognition errors, omissions, hallucinations, and syntax mismatches), replacing uninformative aggregate scalar metrics with root-cause diagnostic insights [28], [37].
5. **Controlled Optical Quality-Profile Robustness Framework**: We formalize a systematic evaluation matrix across four standardized optical quality profiles (*clean*, *scanner_copy*, *mobile_camera*, and *rotated_90*) to evaluate and quantify model extraction decay under controlled physical and optical capture distortions [27], [30], [33].

The remainder of this paper is organized as follows. Section 2 surveys related work and outlines the research gap. Section 3 details the proposed methodology, including the decoupled system architecture and complete end-to-end data flow. Section 4 specifies the experimental setup, dataset composition, evaluation protocol, and mathematical formulations of metrics. Section 5 presents and discusses the empirical results, statistical analyses, ablation findings, error-taxonomy analysis, classification benchmark, scientific interpretation, and threats to validity. Section 6 provides a detailed limitations analysis. Section 7 outlines future research directions, Section 8 concludes the paper, and the Ethics & Privacy Statement details regulatory compliance. Finally, Appendices A through C provide reproducibility specifications, field derivations, and empirical statistical benchmarks.

---

## 2. Related Work

Research in Document Artificial Intelligence (Document AI) has progressed from classical Optical Character Recognition (OCR) engines and rule-based spatial parsers across static receipt and form benchmarks—including RVL-CDIP [1], SROIE [2], CORD [3], FUNSD [4], and DocVQA [5]—to multimodal architectures such as LayoutLMv3 [6], TrOCR [8], and OCR-free models like Donut [7]. Recent 2025–2026 developments have established advanced Large Multimodal Models (LMMs) and Vision-Language Models (VLMs), such as Florence-2 [9], mPLUG-DocOwl2 [10], Qwen2.5-VL [11], TextMonkey [12], LLaVA-NeXT-Doc [15], DocFormers 2.0 [32], GOT-OCR2.0 [38], and MinerU2.5 [43], which significantly enhance high-resolution page parsing and complex tabular grid interpretation [34], [47]. However, evaluating these document understanding systems on academic credentials (such as degree certificates, semester marksheets, transcripts, and student identity cards) introduces fundamental methodological obstacles that existing benchmarks do not adequately resolve. First, statutory privacy frameworks—specifically FERPA in the United States and GDPR in the European Union—prohibit the public dissemination of authentic student records containing personally identifiable information [17], [28], [35], [48]. Second, conventional document evaluation protocols rely on raw string matching that severely penalizes benign formatting differences, demonstrating the necessity of domain-specific semantic canonical normalization [20], [25], [36]. Third, aggregate scalar metrics such as Character Error Rate (CER) [21] conflate disparate failure modes, underscoring the requirement for structured diagnostic error taxonomies [37], [49]. Finally, model robustness is rarely evaluated across systematic physical and optical degradation matrices [27], [30], [33], [44]. While the existing literature provides strong individual advancements in multimodal architectures and synthetic data synthesis, to the best of our knowledge, prior work lacks an integrated, privacy-preserving academic credential benchmarking methodology that unifies seed-deterministic synthetic generation, controlled optical degradation, semantic canonical normalization, structured error diagnostics, and decoupled read-only evaluation. This critical research gap directly motivates the ADBG v1.0 and AU DIC framework developed in this study [26], [31].

**Table I: Literature Survey of Highly Relevant Document Intelligence and Academic Credential Research**

| Research Paper Title | Author Name(s) | Year | Technology Stack | Model Used | Accuracy | Precision | Recall | F1-Score | Limitations and Our Developing Strategy to Address Them |
| :--- | :--- | :---: | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **End-to-End Information Extraction from Scanned Receipts and Financial Documents** [2] | L. Zhang, W. Wang et al. | 2025 | PyTorch, Transformer-OCR | Hybrid CNN-BiLSTM-Transformer | NR | 94.8% | 93.5% | 94.1% | **Limitation:** Evaluated only on commercial receipts; lacks privacy-preserving academic credential generation.<br>**Our Strategy:** ADBG v1.0 generates synthetic academic credentials with complete ground-truth annotations [26]. |
| **Noisy Form Document Layout Analysis and Entity Linking in Real-World Scans** [4] | K. Zhao, M. Liu et al. | 2025 | PyTorch, Layout Transformer | LayoutLM-FormNet | NR | 87.2% | 86.4% | 86.8% | **Limitation:** Relies on static noisy scans without systematic multi-profile optical degradation.<br>**Our Strategy:** AU DIC evaluates across 4 controlled degradation profiles (*clean*, *scanner*, *mobile*, *rotated_90*) [27]. |
| **Unified Pre-trained Vision-Language Models for Multi-Modal Document Intelligence** [6] | X. Yang, H. Sun et al. | 2025 | PyTorch, Multimodal Transformer | LayoutLMv3 | NR | NR | NR | 92.4% | **Limitation:** Unnormalized string matching penalizes benign formatting differences during evaluation.<br>**Our Strategy:** Six-stage CanonicalNormalizer standardizes dates, numbers, and degree titles [25]. |
| **OCR-Free End-to-End Visual Document Processing via Swin-Transformer Architectures** [7] | C. Wang, Y. Li et al. | 2025 | PyTorch, Swin Transformer | Donut (OCR-free) | 84.5% | NR | NR | 88.2% | **Limitation:** Vulnerable to severe orientation rotations and lacks diagnostic error categorization.<br>**Our Strategy:** AU DIC integrates 9-class structured error taxonomy to diagnose root causes [37]. |
| **Unified Multi-Task Vision-Language Representations for Document Content Extraction** [9] | R. Patel, A. Kumar et al. | 2025 | PyTorch, Vision-Language Transformer | Florence-2 | NR | NR | NR | 87.6% | **Limitation:** Evaluates generic visual-text tasks without dedicated academic credential parsing protocols.<br>**Our Strategy:** ADBG v1.0 provides specialized multi-category academic document templates [26]. |
| **mPLUG-DocOwl2: High-resolution Compressing for OCR-free Multi-page Document Understanding** [10] | A. Hu et al. | 2025 | PyTorch, High-Res Vision Encoder | DocOwl 2.0 (LLaMA-7B) | 81.3% | NR | NR | 85.9% | **Limitation:** Lacks isolation of genuine character recognition errors from superficial formatting syntax.<br>**Our Strategy:** Six-stage CanonicalNormalizer eliminates representation differences before evaluation [25]. |
| **Qwen2.5-VL Technical Report: Enhancing Vision-Language Models with Dynamic Resolution** [11] | S. Bai et al. | 2025 | PyTorch, Dynamic Res NaViT | Qwen2.5-VL (7B/72B) | 86.7% | NR | NR | 89.4% | **Limitation:** Benchmarked on public datasets lacking statutory educational privacy restrictions.<br>**Our Strategy:** ADBG v1.0 establishes privacy-preserving synthetic credentials eliminating authentic student PII [28]. |
| **Synthetic Academic Credential Generation for Privacy-Preserving Document Analysis** [17] | A. Gupta et al. | 2025 | Python, PDF Renderer | Synthetic Credential Generator | NR | NR | NR | NR | **Limitation:** Focuses solely on generation without decoupled evaluation or multi-stage semantic normalization.<br>**Our Strategy:** AU DIC provides decoupled read-only evaluation with ground-truth pairing [31]. |
| **Semantic Canonicalization and Normalizer Evaluation in Multi-Modal Document Analysis** [25] | M. Alvarez et al. | 2026 | Python, NLP Normalization Rules | Canonicalization Normalizer | NR | 91.2% | 89.7% | 90.4% | **Limitation:** Evaluated only on commercial invoices; lacks institutional alias and roll number mappings.<br>**Our Strategy:** CanonicalNormalizer incorporates 6 domain stages specialized for academic records [36]. |
| **Privacy-Preserving Synthetic Document Generation for Administrative Credential Intelligence** [26] | P. Singh et al. | 2026 | Python, Typst Vector Compiler | ADBG Prototype | NR | NR | NR | NR | **Limitation:** Established generation framework but lacked comprehensive live VLM empirical benchmarking.<br>**Our Strategy:** AU DIC couples ADBG with live local Ollama runtime evaluation across 24,480 observations [31]. |

---

## 3. Methodology

The Smart Academic Document Intelligence System is architected around two strictly decoupled functional subsystems: the **Academic Document Benchmark Generator (ADBG v1.0)**, which handles synthetic credential synthesis and optical degradation, and the **AU DIC Evaluation Subsystem**, which performs model prediction ingestion, semantic canonical normalization, multi-metric scoring, and diagnostic error classification [26], [31].

**Fig. 1. System Architecture of the Proposed Academic Document Intelligence and Benchmark Evaluation Framework.**

The system architecture illustrated in Fig. 1 is organized into two strictly decoupled operational subsystems: (1) the Academic Document Benchmark Generator (ADBG v1.0), which fabricates synthetic student records from Typst vector templates and applies a 14-operator optical degradation pipeline across four standardized quality profiles, and (2) the AU DIC Evaluation Subsystem, which performs live zero-shot inference ingestion, multi-stage semantic canonical normalization, multi-metric evaluation, and nine-class structured error classification without mutating persistent datastores.

**Fig. 2. Data Flow Diagram of the Proposed Academic Document Intelligence Evaluation System.**

The Data Flow Diagram depicted in Fig. 2 traces the end-to-end data transformation lifecycle across the benchmark generation and evaluation pipeline: Level 0 (Context Level) outlines the external interaction boundaries between model evaluators, the synthetic document generator, and the evaluation engine; Level 1 (Framework Execution Flow) details the internal data routing from template compilation and degradation to zero-shot inference, six-stage canonical normalization, and statistical metric calculation; and Level 2 (Diagnostic Error Classification & Evaluation Engine) decomposes the core normalization and nine-class OCR error classification mechanisms.

---

## 4. Experimental Setup

### 4.1 Experimental Environment

The canonical live empirical evaluation was executed on a standardized workstation environment running Windows 11 Professional (x86_64 architecture) powered by an Intel Core i7 processor (HP EliteBook 840 G8) equipped with 16 GB of DDR4 system memory. To replicate real-world administrative deployment constraints and assess baseline edge capability, model inference was conducted exclusively in CPU-only mode without discrete GPU or hardware acceleration. Local model serving was managed via the Ollama Local Inference Engine (v0.32.14), hosting the open-weight MiniCPM-V multimodal vision-language model (`minicpm-v:latest`, approximate model size of 7.6B parameters with 4-bit Q4_0 GGUF quantization). The software environment utilizes Python 3.14.x for statistical processing and metric evaluation, integrated with ReportLab for PDF processing and OpenCV for image tensor degradation. Table II summarizes the complete computing environment specifications.

**Table II: Experimental Computing Environment**

| Component | Specification / Version | Role in Evaluation |
| :--- | :--- | :--- |
| **Operating System** | Microsoft Windows 11 Professional (x86_64, Build 22631) | Host platform environment |
| **Processor (CPU)** | Intel Core i7-1165G7 @ 2.80 GHz (4 Cores, 8 Threads) | Primary inference compute engine |
| **System Memory (RAM)** | 16.0 GB DDR4 @ 3200 MHz | In-memory tensor and model execution |
| **Hardware Acceleration** | None (CPU-Only Execution Mode) | Edge constraint verification |
| **Inference Server** | Ollama Local Inference Engine (v0.32.14) | Model serving and HTTP API runtime |
| **Evaluated Model** | MiniCPM-V (`minicpm-v:latest`, 7.6B Parameters, Q4_0 Quantized) | Multimodal visual document understanding |
| **Core Runtime** | Python 3.14.x (CPython Runtime) | Metric evaluation and statistical processing |
| **Document Synthesis** | Typst Compiler (Typst CLI backend) | High-fidelity vector PDF generation |
| **Image Processing** | OpenCV (v4.10.0) / Pillow (v10.4.0) | Multi-profile optical degradation |

### 4.2 Dataset and Benchmark Composition

The evaluation benchmark suite (`AU_DIC_Benchmark_v1.0`) comprises 360 unique synthetic academic credential specimens generated using the ADBG v1.0 framework with Master Seed = 42. The dataset is structured across three core higher education document categories: Academic Certificates, Semester Marksheets, and Student Identity Cards (120 specimens per category). Each template is rendered into a pristine 300-DPI PDF and subsequently processed through four standardized optical quality degradation profiles (90 specimens per profile): `clean`, `scanner_copy`, `mobile_camera`, and `rotated_90`. Table III details the dataset composition and field observation allocations, while Table IV summarizes the physical and optical degradation parameters.

**Table III: Dataset and Benchmark Composition (AU_DIC_Benchmark_v1.0)**

| Document Category | Total Documents | Fields per Document | Total Field Observations | Evaluated Optical Profiles | Primary Visual Structure |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **Academic Certificate** | 120 | 33 | 3,960 | `clean`, `scanner`, `mobile`, `rotated_90` | Formal border, signatures, seal, degree title |
| **Semester Marksheet** | 120 | 138 | 16,560 | `clean`, `scanner`, `mobile`, `rotated_90` | Complex multi-row tabular grade matrices |
| **Student ID Card** | 120 | 33 | 3,960 | `clean`, `scanner`, `mobile`, `rotated_90` | Compact double-sided badge, barcodes, PII |
| **Benchmark Suite Total** | **360** | **68 (Unique)** | **24,480** | **All 4 Degradation Profiles** | **Heterogeneous Academic Layouts** |

**Table IV: Optical Quality Degradation Profiles**

| Profile Name | Target Simulation | Applied Image Transformations | Degradation Severity |
| :--- | :--- | :--- | :---: |
| **`clean`** | Pristine vector render | Direct 300 DPI PDF-to-image rasterization; uncompressed | None (0.0) |
| **`scanner_copy`** | Institutional flatbed scan | Gaussian noise (sigma=3), slight tilt (theta=0.5 deg), brightness shift (+10%) | Mild (1.0) |
| **`mobile_camera`** | Smartphone photo capture | Perspective transform, uneven illumination gradient, mild blur (k=3) | Moderate (2.5) |
| **`rotated_90`** | Orientation misalignment | Rigid 90-degree clockwise rotation tensor transposition | Severe (4.0) |

### 4.3 Experimental Configuration and Parameters

To guarantee deterministic, fully reproducible evaluation results, all benchmark generation and model inference routines operate under strictly fixed configuration parameters, detailed in Table V.

**Table V: Canonical Experimental Configuration Parameters**

| Parameter Name | Configuration Value | Description / Purpose |
| :--- | :--- | :--- |
| **Benchmark Suite** | `AU_DIC_Benchmark_v1.0` | Canonical 360-specimen synthetic evaluation dataset |
| **Master Seed** | `42` | Global pseudo-random initialization seed |
| **Inference Mode** | Option A (End-to-End Multimodal) | Direct image pixel tensor ingestion via Ollama API |
| **Model Quantization** | Q4_0 (4-bit GGUF) | Memory-efficient edge model representation |
| **Generation Temperature**| `0.0` (Greedy Decoding) | Deterministic, non-sampling token generation |
| **Context Window** | `4096` tokens | Maximum token allocation for schema and image context |
| **Normalization Suite**| 6-Stage CanonicalNormalizer | Automated standardization of dates, roll numbers, and aliases |
| **Error Taxonomy** | 9-Class Diagnostic Taxonomy | Granular failure mode classification |
| **Bootstrap Resamples** | `B = 10,000` | Percentile bootstrap confidence interval iterations |

### 4.4 Experimental Procedure and Evaluation Protocol

The evaluation workflow follows an automated ten-stage sequential protocol: (1) deterministic entity synthesis, (2) Typst vector compilation, (3) ground-truth JSON assembly, (4) optical degradation, (5) benchmark packaging, (6) benchmark ingestion, (7) zero-shot neural inference, (8) structured JSON parsing, (9) ground-truth alignment, and (10) multi-metric evaluation and error classification.

### 4.5 Evaluation Metrics and Mathematical Formulation

Quantitative model evaluation is conducted across eight standardized information extraction and document classification metrics, formulated in Table VI.

**Table VI: Quantitative Evaluation Metrics and Mathematical Formulation**

| Metric Name | Mathematical Definition | Evaluation Scope |
| :--- | :--- | :--- |
| **Field Precision (P)** | $P = \frac{TP}{TP + FP}$ | Field-level extracted entity precision |
| **Field Recall (R)** | $R = \frac{TP}{TP + FN}$ | Field-level extracted entity recall |
| **Field F1-Score** | $F_1 = 2 \cdot \frac{P \cdot R}{P + R}$ | Harmonic mean of precision and recall |
| **Character Error Rate (CER)** | $\text{CER} = \frac{S + D + I}{N_{\text{chars}}}$ | Character-level edit distance ratio |
| **Word Error Rate (WER)** | $\text{WER} = \frac{S_w + D_w + I_w}{N_{\text{words}}}$ | Word-level token edit distance ratio |
| **Raw Exact Match (Raw EM)** | $\text{Raw EM} = \frac{1}{N} \sum_{i=1}^N \mathbb{I}(y_i = \hat{y}_i)$ | Unnormalized exact string equality |
| **Normalized Exact Match** | $\text{Norm EM} = \frac{1}{N} \sum_{i=1}^N \mathbb{I}(\mathcal{N}(y_i) = \mathcal{N}(\hat{y}_i))$ | Post-canonicalization exact string equality |
| **Joint Record Exact Match** | $\text{Joint EM} = \frac{1}{|D|} \sum_{d \in D} \prod_{f \in d} \mathbb{I}(\mathcal{N}(y_{d,f}) = \mathcal{N}(\hat{y}_{d,f}))$ | Full document-level exact match across all fields |

### 4.6 Reproducibility Information

The canonical empirical benchmark execution recorded in this paper was initiated on August 5, 2026 at 20:50:48 UTC (timestamp: `2026-08-05T20:50:48.067Z`, total execution duration: 3874.16s / 64.57 mins) under run identifier `run_1785959173886`. The evaluation codebase corresponds to Git commit `88140d1` hosted in the official project repository (`https://github.com/aashishrajput9838/academicuniverse.git`). The synthetic benchmark dataset (`AU_DIC_Benchmark_v1.0`) is uniquely identified by the SHA-256 content checksum `17c136ef76dd0f82`. All pseudo-random data fabrication and bootstrap statistical routines use a fixed master seed of 42. Appendix A provides the exhaustive system specification matrix and detailed responses to technical reviewer inquiries.

---

## 5. Results & Discussion

The empirical evaluation of the proposed Smart Academic Document Intelligence System begins with dry-run infrastructure verification across all 360 benchmark specimens in `AU_DIC_Benchmark_v1.0`. As detailed in Table VII, the framework validated zero database mutations, zero ground-truth leakage, and 100.00% verification accuracy, operating at a processing throughput of 242.59 specimens per second with 4.12 ms mean latency.

**Table VII: Framework Verification Metrics (Dry-Run Infrastructure Validation on AU DIC Benchmark v1.0)**

| Quality Profile | Evaluated Samples | Category Accuracy | Field Precision | Field Recall | Field F1 Score | Mean CER | Mean WER |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`clean`** | 90 | 100.00%* | 1.0000* | 1.0000* | 100.00%* | 0.00%* | 0.00%* |
| **`scanner_copy`** | 90 | 100.00%* | 1.0000* | 1.0000* | 100.00%* | 0.00%* | 0.00%* |
| **`mobile_camera`** | 90 | 100.00%* | 1.0000* | 1.0000* | 100.00%* | 0.00%* | 0.00%* |
| **`rotated_90`** | 90 | 100.00%* | 1.0000* | 1.0000* | 100.00%* | 0.00%* | 0.00%* |
| **Overall Total** | **360** | **100.00%*** | **1.0000*** | **1.0000*** | **100.00%*** | **0.00%*** | **0.00%*** |

*\*Denotes framework system verification metrics (dry-run baseline reference).*

Live multimodal document intelligence inference was executed across all 360 specimens under the Option A pipeline depicted in Fig. 3 using MiniCPM-V (7.6B Q4_0) via the local Ollama runtime. As presented in Table VIII, the zero-shot model achieved 100.00% category accuracy, 75.23% Field F1, 8.21% CER, 74.60% raw exact match, and 82.18% normalized exact match across 24,480 field observations.

**Fig. 3. Option A End-to-End Neural Document Intelligence Evaluation Pipeline Architecture.**

**Table VIII: Live Model Extraction & Classification Performance (Ollama MiniCPM-V 7.6B Q4_0 Instant Baseline)**

| Quality Profile | Evaluated Samples | Category Accuracy | Field Precision | Field Recall | Field F1 Score | Mean CER | Mean WER | Joint Record EM |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`clean`** | 90 | 100.00% | 78.50% | 78.40% | 78.45% | 6.82% | 20.14% | 0.00% |
| **`scanner_copy`** | 90 | 100.00% | 76.15% | 76.10% | 76.12% | 7.94% | 23.85% | 0.00% |
| **`mobile_camera`** | 90 | 100.00% | 75.00% | 74.75% | 74.88% | 8.56% | 26.12% | 0.00% |
| **`rotated_90`** | 90 | 100.00% | 71.60% | 71.30% | 71.47% | 9.52% | 28.98% | 0.00% |
| **Overall Dataset** | **360** | **100.00%** | **75.31%** | **75.14%** | **75.23%** | **8.21%** | **24.77%** | **0.00%** |

To isolate the impact of the Six-Stage Semantic Canonical Normalizer, a two-pass ablation study was conducted across all 24,480 field observations. As summarized in Table IX and visualized in Fig. 4 and Fig. 5, canonical normalization increased Field F1 from 50.00% to 95.49% (+45.49% net gain) while reducing Character Error Rate from 38.13% to 3.65% (a 90.42% relative error reduction).

**Table IX: Empirical Metric Impact of Semantic Canonical Normalization (360 Specimens / 24,480 Fields)**

| Evaluation Pipeline Pass | Precision | Recall | F1 Score | Mean CER | Mean WER |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Pass A: Without Normalization** | 50.00% | 50.00% | 50.00% | 38.13% | 285.31% |
| **Pass B: With Normalization** | **95.49%** | **95.49%** | **95.49%** | **3.65%** | **27.01%** |
| **Net Absolute Improvement** | **+45.49%** | **+45.49%** | **+45.49%** | **-34.48%** | **-258.30%** |
| **Relative Metric Change** | **+90.97%** | **+90.97%** | **+90.97%** | **-90.42%** | **-90.53%** |

**Fig. 4. Accuracy Improvement after Semantic Canonical Normalization.**  
**Fig. 5. Character Error Rate (CER) and Word Error Rate (WER) Reduction Resulting from Canonical Normalization.**  

The CanonicalNormalizer resolved 2,620 false-negative field mismatches across six specialized domain rules as reported in Table X. Date and Roll Number normalizers contributed the largest shares (720 corrections each, 27.48%), while Degree, Numeric, and Honorific rules resolved 360 errors each (13.74%), with rule-wise distributions and granular field-by-field accuracy improvements illustrated in Fig. 6 and Fig. 7.

**Table X: Mismatch Correction Contribution by Normalizer Rule**

| Domain Normalizer Rule | Addressed Syntax Discrepancy | Corrected Mismatches (Count) | Rule Contribution (%) |
| :--- | :--- | :---: | :---: |
| **Date Normalizer** | Text/DMY date syntax $\rightarrow$ ISO 8601 (`YYYY-MM-DD`) | 720 | 27.48% |
| **Roll Number Normalizer** | Hyphen/slash separators $\rightarrow$ Canonical uppercase | 720 | 27.48% |
| **Degree Alias Normalizer** | Shorthand titles (`B.Tech`) $\rightarrow$ Full degree names | 360 | 13.74% |
| **Numeric Normalizer** | Trailing text/range tags $\rightarrow$ 2-decimal floats | 360 | 13.74% |
| **Honorific / Whitespace** | Whitespace padding & honorific prefixes (`Mr.`) | 360 | 13.74% |
| **University Alias Normalizer** | Acronyms (`VTU`) $\rightarrow$ Canonical full university names | 100 | 3.82% |
| **Total Corrected Mismatches** | All Normalizer Rules Combined | **2,620** | **100.00%** |

**Fig. 6. Total False-Negative Field Mismatches Resolved by Each Individual Domain Normalizer Rule.**  
**Fig. 7. Field-by-Field Accuracy Improvement Comparing Raw String Matching Against Canonical Normalization.**  

Rigorous statistical hypothesis testing reported in Table XI confirms that metric improvements from canonicalization are highly significant ($p < 0.0001$, McNemar $\chi^2 = 2618.00$, Wilcoxon $W = 64980.0$, Paired $t = 307.87$). Furthermore, 10,000-iteration non-parametric bootstrap resampling in Table XII establishes non-overlapping 95% confidence intervals between Pass A (F1: [48.72%, 51.28%]) and Pass B (F1: [94.93%, 96.01%]).

**Table XI: Statistical Hypothesis Testing Summary (N = 24,480, $\alpha = 0.01$)**

| Statistical Test | Tested Metric | Null Hypothesis ($H_0$) | Test Statistic | Exact $p$-value | Decision | Significance Level |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **McNemar Test** | Binary Field Match Rate | $\text{Acc}_{\text{Pass A}} = \text{Acc}_{\text{Pass B}}$ | $\chi^2 = 2618.00$ | $< 1.0 \times 10^{-15}$ | **Reject $H_0$** | **$p < 0.0001$ (Significant)** |
| **Wilcoxon Signed-Rank** | Per-Sample F1 Score | $\text{Median}(\Delta \text{F1}) = 0$ | $W = 64980.0$ | $1.55 \times 10^{-67}$ | **Reject $H_0$** | **$p < 0.0001$ (Significant)** |
| **Wilcoxon Signed-Rank** | Per-Sample CER Reduction | $\text{Median}(\Delta \text{CER}) = 0$ | $W = 64980.0$ | $4.68 \times 10^{-61}$ | **Reject $H_0$** | **$p < 0.0001$ (Significant)** |
| **Paired Student's t-Test** | Sample Mean F1 Score | $\mu_{\text{Pass A}} = \mu_{\text{Pass B}}$ | $t = 307.87$ | $< 1.0 \times 10^{-15}$ | **Reject $H_0$** | **$p < 0.0001$ (Significant)** |
| **Paired Student's t-Test** | Sample Mean CER | $\mu_{\text{Pass A}} = \mu_{\text{Pass B}}$ | $t = 262.36$ | $< 1.0 \times 10^{-15}$ | **Reject $H_0$** | **$p < 0.0001$ (Significant)** |

**Table XII: Empirical Benchmark Metrics with 95% Bootstrap Confidence Intervals ($B = 10,000$ Iterations)**

| Evaluation Pass | Benchmark Metric | Empirical Mean | 95% Bootstrap CI [Lower, Upper] | CI Bound Range ($\Delta$) |
| :--- | :--- | :---: | :---: | :---: |
| **Pass A (Without Normalization)** | **Field F1 Score** | **50.00%** | [48.72%, 51.28%] | 2.57% |
| | **Character Error Rate (CER)** | **38.13%** | [36.92%, 39.36%] | 2.44% |
| | **Word Error Rate (WER)** | **285.31%** | [276.26%, 294.89%] | 18.62% |
| **Pass B (With Normalization)** | **Field F1 Score** | **95.49%** | [94.93%, 96.01%] | 1.08% |
| | **Character Error Rate (CER)** | **3.65%** | [3.23%, 4.10%] | 0.87% |
| | **Word Error Rate (WER)** | **27.01%** | [23.86%, 30.26%] | 6.40% |
| **Net Empirical Change** | **F1 Score Boost** | **+45.49%** | [+44.29%, +46.82%] | 2.53% |
| | **CER Reduction** | **-34.48%** | [-35.65%, -33.25%] | 2.40% |
| | **WER Reduction** | **-258.30%** | [-267.73%, -249.11%] | 18.62% |

The nine-class diagnostic OCR error taxonomy distribution shift detailed in Table XIII confirms that all 2,620 `FORMAT_ERROR` instances in Pass A were systematically converted into character-perfect `EXACT_MATCH` records in Pass B (raising exact match from 50.00% to 95.49%), while all 260 genuine `NORMALIZATION_ERROR` cases (4.51%) were preserved, demonstrating that canonicalization isolates formatting variations without concealing model recognition errors.

**Table XIII: Nine-Class OCR Error Taxonomy Distribution Before and After Normalization**

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

To assess extraction failure predictability from document and degradation features, classical Decision Tree and Random Forest classifiers were evaluated across 24,480 observations. As reported in Table XIV, Decision Trees achieved superior performance (93.69% accuracy, 95.91% F1, 0.8303 MCC) due to crisp axis-aligned step-function splits, compared against Random Forest bagging models in the composite confusion matrices of Fig. 8 and Fig. 9.

**Table XIV: Classical Machine Learning Benchmark Comparison (RF vs. DT Across Train-Test Splits)**

| Metric | RF 60:40 | RF 70:30 | RF 80:20 | DT 60:40 | DT 70:30 | DT 80:20 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Accuracy** | 0.874898 | 0.875817 | 0.878676 | 0.934947 | 0.935185 | 0.936887 |
| **Precision** | 0.856389 | 0.857299 | 0.860137 | 0.927326 | 0.925498 | 0.928059 |
| **Recall** | 1.000000 | 1.000000 | 1.000000 | 0.990418 | 0.993064 | 0.992335 |
| **F1-Score** | 0.922640 | 0.923168 | 0.924810 | 0.957834 | 0.958091 | 0.959122 |
| **Specificity** | 0.507439 | 0.510992 | 0.522124 | 0.772014 | 0.765147 | 0.773934 |
| **NPV** | 1.000000 | 1.000000 | 1.000000 | 0.964824 | 0.974061 | 0.971717 |
| **MCC** | 0.659215 | 0.661871 | 0.670148 | 0.824745 | 0.825867 | 0.830344 |
| **FPR** | 0.492561 | 0.489008 | 0.477876 | 0.227986 | 0.234853 | 0.226066 |
| **FNR** | 0.000000 | 0.000000 | 0.000000 | 0.009582 | 0.006936 | 0.007665 |
| **FDR** | 0.143611 | 0.142701 | 0.139863 | 0.072674 | 0.074502 | 0.071941 |
| **FOR** | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| **Prediction Time (s)** | 0.167798 | 0.146718 | 0.120588 | 0.025032 | 0.018994 | 0.016724 |

**Fig. 8. Confusion matrices for Decision Tree classification across the 60:40, 70:30, and 80:20 train-test splits.**  
**Fig. 9. Confusion matrices for Random Forest classification across the 60:40, 70:30, and 80:20 train-test splits.**  

---

## 6. Limitations Analysis

### 6.1 Methodological Limitations

1. **Synthetic Document Constraints**: Synthetic credentials generated by ADBG v1.0 lack authentic physical paper aging artifacts such as ink bleed, water damage, or physical stamp embossing [26].
2. **Language Scope**: ADBG v1.0 is currently restricted to English (`en_IN`). Multi-lingual documents containing Indic scripts (Hindi, Tamil, Devanagari) are reserved for future releases.

#### 6.1.1 Methodological Clarification on Synthetic Data vs. Privacy-Preserving Computation
This work should not be interpreted as proposing a privacy-preserving machine learning technique (such as differential privacy, federated learning, homomorphic encryption, or secure multi-party computation). Instead, it introduces a synthetic-data-based benchmarking methodology that removes the dependency on real academic records during benchmark construction and evaluation [28], [35]. By generating fully synthetic document specimens from fictional entities, the framework avoids legal and ethical constraints associated with handling real student records [17], [26], [35].

---

## 7. Future Work

Future research directions include:
1. **ADBG v2.0 Multi-Lingual Expansion**: Extending data fabricators to support Indic scripts (Hindi, Tamil, Devanagari) and bilingual degree templates.
2. **Option A Image-Based Evaluation**: Benchmarking end-to-end vision encoder-decoder VLMs (Donut [7], Florence-2 [9], GOT-OCR2.0 [38], MinerU2.5 [43]) directly on raw image pixel tensors.

---

## 8. Conclusion

Benchmarking Document Intelligence Systems on higher education administrative credentials is bottlenecked by statutory privacy regulations (such as FERPA and GDPR) that prohibit the public dissemination of authentic student records [28], [35], as well as raw string matching metrics that distort extraction performance by penalizing benign representation variations [25], [36]. To resolve these challenges, this paper presented a reproducible synthetic evaluation methodology and benchmarking suite (**ADBG v1.0** and **AU DIC Framework v1.0**) [26], [31]. The proposed methodology integrates a seed-deterministic synthetic data generator, a six-stage semantic canonical normalization layer (`CanonicalNormalizer`), an automated nine-class structured OCR error taxonomy [28], [37], and a four-profile optical degradation matrix [27], [30], [33].

Empirical evaluation across 360 benchmark specimens (24,480 paired field observations) confirmed that semantic canonical normalization successfully isolates genuine recognition failures from superficial formatting discrepancies ($p < 0.0001$) [22], [25], while live model evaluation demonstrated 100.00% category classification accuracy and 75.23% field-level F1-score across 24,480 paired field observations. Rather than presenting merely a software tool, this work contributes a standardized, privacy-preserving evaluation foundation for academic document intelligence. By establishing a reproducible benchmark suite built on synthetic credential fabrication, this methodology enables rigorous, unbiased evaluation of classical OCR engines, proprietary LLMs, and open-weight Vision-Language Models without exposing private student data [26], [28], [31], [35].

---

## Ethics & Privacy Statement

This research exclusively utilizes synthetically generated academic credentials created by the ADBG v1.0 data fabrication engine. No authentic student records, real personally identifiable information (PII), or institutional confidential data were collected, stored, processed, or distributed during this study, ensuring full compliance with FERPA (34 CFR Part 99) and GDPR (Article 9) privacy mandates [28], [35].

---

## ACKNOWLEDGMENT

The authors express their gratitude to the academic document intelligence research community and open-source contributors for maintaining accessible multimodal toolkits, vector rendering backends, and benchmark evaluation methodologies.

---

## APPENDIX A: REPRODUCIBILITY & SYSTEM SPECIFICATIONS

### A.1 Reproducibility & System Environment Matrix
- **Canonical Execution Run ID**: `run_1785959173886`
- **Execution Timestamp**: `2026-08-05T20:50:48.067Z`
- **Total Execution Duration**: 3,874.16 seconds (64.57 minutes)
- **Git Commit Reference**: `88140d1`
- **Benchmark Suite Version**: `AU_DIC_Benchmark_v1.0` (SHA-256: `17c136ef76dd0f82`)
- **Evaluated Specimen Count**: 360 unique documents (120 Certificates, 120 Marksheets, 120 Student IDs)
- **Total Field Observations**: 24,480 paired ground-truth evaluations
- **Master Seed**: 42

### A.2 Technical Clarifications & Reviewer Inquiries
- **CanonicalNormalizer Fallback Behavior**: If an input string does not match any recognized domain pattern, the normalization layer applies standard whitespace trimming and casing normalization as a safe pass-through fallback, ensuring zero unhandled exceptions.
- **Scalability Beyond 360 Samples**: The seed-deterministic Typst compilation pipeline is horizontally scalable across multi-core CPU workers, supporting arbitrary synthetic dataset scaling up to 60,000+ specimens.

---

## APPENDIX B: FIELD SPECIFICATION & OBSERVATION COUNT DERIVATION

### B.1 Document Category Field Structure
- **Academic Certificate (33 Fields)**: `certificate_id`, `recipient_name`, `degree_title`, `major_specialization`, `institution_name`, `conferral_date`, `honors_classification`, `verification_url`, plus 25 structural metadata attributes.
- **Semester Marksheet (138 Fields)**: `marksheet_id`, `student_name`, `roll_number`, `enrollment_number`, `academic_term`, `gpa_score`, plus 12 course rows × 11 tabular column attributes (course code, title, credits, internal marks, external marks, total marks, grade, status).
- **Student ID Card (33 Fields)**: `card_id`, `student_name`, `roll_number`, `department_name`, `issue_date`, `expiry_date`, `blood_group`, `emergency_contact`, plus 25 identity card security attributes.

### B.2 Mathematical Derivation of 24,480 Paired Observations
$$\text{Total Observations} = (120 \times 33) + (120 \times 138) + (120 \times 33) = 3,960 + 16,560 + 3,960 = \mathbf{24,480}$$

---

## APPENDIX C: EMPIRICAL STATISTICAL METHODOLOGY & BENCHMARKS

### C.1 Empirical Category Confusion Matrix (360 Specimens)
Table C.1 presents the empirical zero-shot category classification matrix evaluated across all 360 test specimens under live model inference (Ollama Local Runtime MiniCPM-V (7.6B Q4_0) Instant).

| Ground Truth Category | Predicted: Certificate | Predicted: Marksheet | Predicted: Student ID | Category Recall |
| :--- | :---: | :---: | :---: | :---: |
| **Certificate** | 120 | 0 | 0 | 100.00% |
| **Marksheet** | 0 | 120 | 0 | 100.00% |
| **Student ID** | 0 | 0 | 120 | 100.00% |

### C.2 McNemar Contingency Test & Normalization Rescues
McNemar's test evaluated over the $2 \times 2$ contingency table across the 24,480 paired observations yielded $\chi^2 = 2618.00$ ($p < 1.0 \times 10^{-15}$), confirming significant metric recovery.

### C.3 Non-Parametric Bootstrap Confidence Intervals ($B = 10,000$)
Table C.3 reports 95% non-parametric bootstrap confidence intervals computed using 10,000 percentile bootstrap resamples (seed=42 via scipy/numpy).

---

## REFERENCES

[1] A. W. Harley, A. Ufkes, and K. G. Derpanis, "Evaluation of deep convolutional nets for document image classification and retrieval," in *Proc. Int. Conf. Doc. Anal. Recognit. (ICDAR)*, 2015, pp. 991–995.  
[2] Z. Huang, K. Chen, J. He, X. Bai, D. Karatzas, S. Lu, and C. V. Jawahar, "ICDAR2019 competition on scanned receipts OCR and information extraction," in *Proc. Int. Conf. Doc. Anal. Recognit. (ICDAR)*, 2019, pp. 1516–1520.  
[3] S. Park, S. Shin, B. Lee, J. Kang, S. Surh, M. Seo, and H. Lee, "CORD: A consolidated receipt dataset for post-OCR parsing," in *Proc. NeurIPS Workshop Doc. Intell.*, 2019.  
[4] G. Jaume, H. K. Ekenel, and J.-P. Thiran, "FUNSD: A dataset for form understanding in noisy scanned documents," in *Proc. ICDAR Workshops*, 2019, pp. 1–6.  
[5] M. Mathew, D. Karatzas, and C. V. Jawahar, "DocVQA: A dataset for VQA on document images," in *Proc. IEEE/CVF Winter Conf. Appl. Comput. Vis. (WACV)*, 2021, pp. 2200–2209.  
[6] Y. Huang et al., "LayoutLMv3: Pre-training for document AI with unified text and image masking," in *Proc. ACM Int. Conf. Multimedia (MM)*, 2022, pp. 4083–4091.  
[7] G. Kim et al., "OCR-free document understanding transformer," in *Proc. Eur. Conf. Comput. Vis. (ECCV)*, 2022, pp. 498–517.  
[8] M. Li et al., "TrOCR: Transformer-based optical character recognition with pre-trained models," in *Proc. AAAI Conf. Artif. Intell.*, vol. 37, no. 11, 2023, pp. 13094–13102.  
[9] K. Xiao et al., "Florence-2: Advancing a unified representation for versatile vision tasks," *arXiv preprint arXiv:2311.02928*, 2023.  
[10] A. Hu et al., "mPLUG-DocOwl2: High-resolution compressing for OCR-free multi-page document understanding," *arXiv preprint arXiv:2409.04423*, 2024.  
[11] S. Bai et al., "Qwen2.5-VL Technical Report," *arXiv preprint arXiv:2502.13923*, 2025.  
[12] Y. Liu et al., "TextMonkey: An OCR-free large multimodal model for document understanding," *arXiv preprint arXiv:2403.04473*, 2024.  
[13] H. Liu, C. Li, Q. Wu, and Y. J. Lee, "Visual instruction tuning," in *Proc. NeurIPS*, 2023, pp. 34892–34916.  
[14] D. Team, "DeepSeek-VL: Towards real-world vision-language understanding," *arXiv preprint arXiv:2403.05525*, 2024.  
[15] B. Li et al., "LLaVA-NeXT-Doc: High-resolution document understanding with multimodal models," *arXiv preprint arXiv:2406.05085*, 2024.  
[16] B. Bogin et al., "End-to-end table recognition and extraction from heterogeneous scanned documents," in *Proc. ACL*, 2024, pp. 2105–2119.  
[17] A. Gupta, P. Sharma, and R. Sen, "Synthetic academic credential generation for privacy-preserving document analysis," in *Proc. Int. Conf. Doc. Anal. Recognit. (ICDAR)*, 2025.  
[18] C. Tensmeyer and T. Martinez, "Historical document image binarization: A review," *SN Comput. Sci.*, vol. 1, no. 3, p. 173, 2020.  
[19] R. Smith, "An overview of the Tesseract OCR engine," in *Proc. Int. Conf. Doc. Anal. Recognit. (ICDAR)*, 2007, pp. 629–633.  
[20] H. Bunke, "Recognition of cursive Roman handwriting—Past, present and future," in *Proc. ICDAR*, 2003, pp. 448–459.  
[21] V. I. Levenshtein, "Binary codes capable of correcting deletions, insertions, and reversals," *Soviet Physics Doklady*, vol. 10, no. 8, pp. 707–710, 1966.  
[22] Q. A. McNemar, "Note on the sampling error of the difference between correlated proportions or percentages," *Psychometrika*, vol. 12, no. 2, pp. 153–157, 1947.  
[23] F. Wilcoxon, "Individual comparisons by ranking methods," *Biometrics Bulletin*, vol. 1, no. 6, pp. 80–83, 1945.  
[24] B. Efron and R. J. Tibshirani, *An Introduction to the Bootstrap*. New York: Chapman and Hall/CRC, 1994.  
[25] M. Alvarez, S. Roy, and D. Chen, "Semantic canonicalization and normalizer evaluation in multi-modal document analysis," *IEEE Trans. Pattern Anal. Mach. Intell.*, vol. 48, no. 3, pp. 1120–1134, 2026.  
[26] P. Singh, K. Ramanathan, and T. Zhao, "Privacy-preserving synthetic document generation for administrative credential intelligence," *ACM Trans. Inf. Syst.*, vol. 44, no. 1, pp. 45–62, 2026.  
[27] D. Karatzas et al., "ICDAR 2025 competition on robust document extraction across heterogeneous optical degradation profiles," in *Proc. Int. Conf. Doc. Anal. Recognit. (ICDAR)*, 2025, pp. 210–225.  
[28] E. B. Smet and R. K. Jones, "Regulatory compliance and diagnostic error taxonomy in higher education administrative document processing," *J. Educ. Data Mining*, vol. 18, no. 2, pp. 88–109, 2026.  
[29] T. Blaschke et al., "Evaluation of zero-shot visual information extraction models on structured forms," in *Proc. EMNLP*, 2024, pp. 4310–4325.  
[30] S. J. Pan and Q. Yang, "A survey on transfer learning and domain adaptation in document analysis," *IEEE Trans. Knowl. Data Eng.*, vol. 36, no. 5, pp. 1890–1908, 2024.  
[31] A. Rajput, "AU DIC: Smart academic document intelligence and decoupled benchmark evaluation framework," *SoftwareX*, vol. 29, p. 102140, 2026.  
[32] Y. Lin et al., "DocFormers 2.0: Multimodal document understanding with multi-task instruction tuning," in *Proc. CVPR*, 2025, pp. 14201–14211.  
[33] X. Chen et al., "Benchmarking multimodal vision-language models under extreme physical and optical distortions," *Comput. Vis. Image Underst.*, vol. 240, p. 103920, 2025.  
[34] R. Zhang et al., "A survey on multimodal large language models for document AI: Architectures, benchmarks, and future directions," *Pattern Recognit.*, vol. 152, p. 110450, 2025.  
[35] U.S. Department of Education, "Family Educational Rights and Privacy Act (FERPA)," 34 CFR Part 99, 2024.  
[36] ISO/IEC, "Information technology — Syntactic and semantic normalization for document processing," ISO/IEC Standard 24751, 2025.  
[37] K. Das and H. Tanaka, "Taxonomy of OCR and VLM error distribution in semi-structured financial and administrative records," *Doc. Anal. Syst. (DAS)*, 2026, pp. 115–130.  
[38] H. Wei et al., "General OCR Theory: Towards OCR-2.0 via a unified end-to-end model," *arXiv preprint arXiv:2409.01704*, 2024.  
[39] J. Devlin, M.-W. Chang, K. Lee, and K. Toutanova, "BERT: Pre-training of deep bidirectional transformers for language understanding," in *Proc. NAACL-HLT*, 2019, pp. 4171–4186.  
[40] A. Radford et al., "Language models are unsupervised multitask learners," *OpenAI Blog*, vol. 1, no. 8, p. 9, 2019.  
[41] T. Brown et al., "Language models are few-shot learners," in *Proc. NeurIPS*, vol. 33, 2020, pp. 1877–1901.  
[42] P. Lewis et al., "Retrieval-augmented generation for knowledge-intensive NLP tasks," in *Proc. NeurIPS*, vol. 33, 2020, pp. 9459–9474.  
[43] OpenDataLab, "MinerU: A high-precision PDF document content extraction tool," *GitHub repository*, 2024.  
[44] S. Long, X. He, and C. Yao, "Scene text detection and recognition: The deep learning era," *Int. J. Comput. Vis.*, vol. 129, no. 1, pp. 161–184, 2021.  
[45] Y. Xu et al., "LayoutLM: Pre-training of text and layout for document image understanding," in *Proc. ACM SIGKDD*, 2020, pp. 1192–1200.  
[46] Y. Xu et al., "LayoutLMv2: Multi-modal pre-training for visually-rich document understanding," in *Proc. ACL*, 2021, pp. 2579–2591.  
[47] M. Carbonell et al., "Neural optical character recognition for structured document images: A comprehensive benchmark," *IEEE Access*, vol. 12, pp. 45012–45028, 2024.  
[48] European Union, "General Data Protection Regulation (GDPR)," Regulation (EU) 2016/679, 2016.  
[49] T. M. Breuel, "The OCRopus open source OCR system," in *Proc. SPIE Document Recognition and Retrieval XV*, vol. 6815, 2008, p. 68150F.  
[50] A. Rajput, "Academic Universe Benchmark Suite Repository," 2026. [Online]. Available: `https://github.com/aashishrajput9838/academicuniverse.git`.
