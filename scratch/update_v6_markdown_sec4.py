from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v6_md_path = workspace / "docs" / "paper" / "Paper_V6.md"

v6_text = v6_md_path.read_text(encoding="utf-8")

# Extract parts before Section 4 and after Section 4
part_before_sec4, rest = v6_text.split("## 4. Experimental Setup\n", 1)
_, part_sec5_and_after = rest.split("\n## 5. Results & Empirical Validation\n", 1)

v6_sec4 = """## 4. Experimental Setup

### 4.1 Experimental Environment
The canonical live empirical evaluation was executed on a standardized workstation environment running Microsoft Windows 11 Professional (64-bit, x86_64 architecture) powered by an Intel Core i7 processor (HP EliteBook 840 G8) equipped with 16 GB of DDR4 system memory. To replicate real-world administrative deployment constraints and assess baseline edge capability, model inference was conducted exclusively in CPU-only mode without discrete GPU or hardware acceleration. Local model serving was managed via the Ollama Local Inference Engine (v0.32.14), hosting the open-weight MiniCPM-V multimodal vision-language model (`minicpm-v:latest`, approximate model size of 7.6B parameters with 4-bit Q4_0 GGUF quantization). The software environment utilizes Python 3.14.x for statistical processing and Node.js v18.x with npm v9.x for benchmark orchestration. Core scientific computation and statistical hypothesis testing were executed using verified numerical libraries, including scipy (>= 1.11), pandas (>= 2.0), numpy (>= 1.24), and scikit-learn (>= 1.3). Table II summarizes the experimental computing infrastructure and software runtime configuration.

**Table II: Experimental Computing Environment**

| Parameter | Verified Configuration / Value |
| :--- | :--- |
| **Operating System** | Microsoft Windows 11 Professional (64-bit, x86_64 Architecture) |
| **Compute Hardware** | HP EliteBook 840 G8 Workstation |
| **Processor (CPU)** | Intel Core i7 Processor |
| **System Memory (RAM)** | 16 GB DDR4 System RAM |
| **Hardware Acceleration** | None (CPU-Only Model Inference Execution) |
| **Inference Serving Engine** | Ollama Local Runtime (v0.32.14, Local Host) |
| **Evaluated Neural Engine** | MiniCPM-V (`minicpm-v:latest`, ~7.6B Parameters, Q4_0 GGUF) |
| **Software Environments** | Python 3.14.x, Node.js v18.x, npm v9.x |
| **Scientific & Statistical Stack** | `scipy >= 1.11`, `pandas >= 2.0`, `numpy >= 1.24`, `scikit-learn >= 1.3` |
| **Framework Execution Mode** | Headless Read-Only Execution (`isReadOnly: true`, 0 Database Writes) |
| **Master Deterministic Seed** | `SeedManager.masterSeed = 42` |

### 4.2 Dataset and Benchmark Composition
The evaluation dataset (`AU_DIC_Benchmark_v1.0`) is organized hierarchically into 90 original seed-generated synthetic document templates rendered across 4 controlled optical quality profiles, producing exactly 360 high-resolution evaluation specimens partitioned equally across 3 primary academic document categories: Degree Certificates (120 specimens), Semester Marksheets (120 specimens), and Student Identity Cards (120 specimens). Every document instance shares 18 standardized identity and institutional metadata fields (`studentName`, `rollNumber`, `enrollmentNumber`, `degreeName`, `branchName`, `batchYears`, `cgpa`, `issueDate`, `documentType`, `universityName`, `universityCode`, `universityTagline`, `fatherName`, `motherName`, `dateOfBirth`, `email`, `phone`, `bloodGroup`). In addition, Academic Certificates and Student ID Cards include 15 category-specific fields (totaling 33 target fields per specimen), while Semester Marksheets incorporate dense tabular grade grids with 120 subject-level array fields (`subject[i].code`, `subject[i].name`, `subject[i].credits`, `subject[i].grade`), yielding 138 target fields per marksheet specimen. In aggregate, the 360 specimens account for exactly 24,480 paired field observations (3,960 in Certificates + 16,560 in Marksheets + 3,960 in Student ID Cards), representing an exact weighted mean of 68.0 target fields per specimen. Table III summarizes the benchmark dataset composition, and Table IV details the 4 optical quality profiles.

**Table III: Dataset and Benchmark Composition (AU_DIC_Benchmark_v1.0)**

| Document Category | Original Templates | Rendered Specimens | Target Fields / Specimen | Total Paired Observations |
| :--- | :---: | :---: | :---: | :---: |
| **Academic Certificate** | 30 Templates | 120 Specimens | 33 Fields (18 Metadata + 15 Specific) | 3,960 Observations |
| **Semester Marksheet** | 30 Templates | 120 Specimens | 138 Fields (18 Metadata + 120 Tabular) | 16,560 Observations |
| **Student ID Card** | 30 Templates | 120 Specimens | 33 Fields (18 Metadata + 15 Specific) | 3,960 Observations |
| **Total / Weighted Mean** | **90 Unique Templates** | **360 Evaluated Specimens** | **68.0 Mean Fields / Specimen** | **24,480 Total Observations** |

**Table IV: Optical Quality Degradation Profiles**

| Quality Profile | Specimens | Degradation Transformation Description | Target Robustness Evaluation |
| :--- | :---: | :--- | :--- |
| **`clean`** | 90 Specimens | Pristine digital vector PDF exports rendered at 300 DPI (0% degradation). | Baseline zero-noise neural extraction capability. |
| **`scanner_copy`** | 90 Specimens | Simulated flatbed scanner capture: 8-bit grayscaling, mild speckle noise, contrast attenuation, and edge fading. | Robustness against photocopying, xerographic aging, and office archive scanning. |
| **`mobile_camera`** | 90 Specimens | Simulated handheld mobile capture: non-uniform ambient illumination gradient, perspective trapezoidal skew, and radial lens distortion. | Robustness against unconstrained smartphone document photography in field verifications. |
| **`rotated_90`** | 90 Specimens | Rigid 90° clockwise spatial matrix rotation applied directly to image bitmap tensors. | Orientation invariance and spatial bounding box alignment under 90° misorientation. |

### 4.3 Experimental Configuration and Parameters
The canonical live evaluation was executed under strictly controlled, deterministic runtime parameters. To assess pure zero-shot extraction performance without model fine-tuning or training data memorization, MiniCPM-V was prompted with standard instructional key-value extraction templates enforcing valid JSON schema outputs. Decoding temperature was set to 0.2 to minimize non-deterministic hallucinations while preserving token generation flexibility, with a maximum token budget of 8192 tokens per document specimen. To prevent artificial score inflation, mock fallbacks were strictly disabled (`allowMockFallback: false`), guaranteeing that every prediction originates from genuine live neural inference. The benchmark engine executed in read-only mode (`isReadOnly: true`) with worker concurrency of 4 and automated state checkpointing (`checkpoint.json`). Statistical significance was evaluated at $\alpha = 0.05$ using 10,000 bootstrap iterations (seed = 42). Table V outlines the full experimental parameter matrix.

**Table V: Canonical Experimental Configuration Parameters**

| Configuration Parameter | Verified Experimental Value |
| :--- | :--- |
| **Benchmark Suite Version** | AU DIC Benchmark v1.0 (Release Candidate 1 - RC1) |
| **Benchmark Execution Mode** | Headless Read-Only Mode (`isReadOnly: true`, 0 Database Writes) |
| **Model-Serving Runtime** | Local Ollama Inference Engine (v0.32.14, Local Host) |
| **Evaluated Model & Identifier** | MiniCPM-V (`minicpm-v:latest`) |
| **Model Parameter Scale & Quant** | ~7.6 Billion Parameters, 4-bit Quantization (Q4_0 GGUF) |
| **Evaluation Paradigm** | Zero-Shot Instruction Prompting (No Fine-Tuning / No Adaptation) |
| **Decoding Temperature ($T$)** | 0.2 (Greedy / Low-Entropy Deterministic Sampling) |
| **Maximum Generation Budget** | 8192 Output Tokens / Specimen |
| **Mock Fallback Setting** | Disabled (`allowMockFallback: false`, Live Neural Inference Only) |
| **Total Evaluated Specimens** | 360 Document Specimens (3 Categories $\times$ 30 Templates $\times$ 4 Profiles) |
| **Total Paired Observations** | 24,480 Paired Field Observations (68.0 Mean Fields / Specimen) |
| **Master Deterministic Seed** | `SeedManager.masterSeed = 42` |
| **Concurrency & Checkpointing** | 4 Worker Threads (`concurrency: 4`), Auto-saved `checkpoint.json` |
| **Semantic Normalization Pipeline** | Six-Stage `CanonicalNormalizer` (Enabled in Pass B) |
| **Error Diagnostic Classification** | Nine-Class `ErrorTaxonomist` (Enabled) |
| **Bootstrap Significance Iterations** | $B = 10,000$ Iterations (Bootstrap Random Seed = 42) |
| **Hypothesis Significance Threshold** | $\alpha = 0.05$ (Achieved Significance $p < 0.0001$) |
| **Canonical Execution Run ID** | `run_1785959173886` (Duration: 3874.16s / 64.57 mins) |
| **Git Repository Commit** | Commit `88140d1` (`https://github.com/aashishrajput9838/academicuniverse.git`) |
| **Dataset SHA-256 Checksum** | `17c136ef76dd0f82` |

### 4.4 Experimental Procedure and Evaluation Protocol
The experimental evaluation protocol follows a standardized fifteen-step execution lifecycle designed for end-to-end reproducibility:

1. **Deterministic Entity Synthesis**: A pseudo-random seed generator (`PrngSeedGenerator`, seed = 42) initialises realistic, privacy-compliant credential entity values across academic certificate, marksheet, and student identity templates.
2. **Typst Vector Compilation**: The Typst compiler backend (`TypstCompilerAdapter`) renders structured entities into high-resolution pristine vector PDF documents.
3. **Ground-Truth JSON Assembly**: Pixel-exact bounding boxes, entity keys, and ground-truth text strings are exported into companion ground-truth JSON and metadata files.
4. **Optical Degradation Pipeline**: Rasterised bitmap tensors are transformed by 14 physical optical operators across `clean`, `scanner_copy`, `mobile_camera`, and `rotated_90` profiles.
5. **Benchmark Suite Assembly**: All 360 paired image and JSON instances are packaged into the `AU_DIC_Benchmark_v1.0` repository.
6. **Benchmark Runner Ingestion**: The AU DIC evaluation subsystem (`BenchmarkRunner`) ingests specimen images headlessly in strict read-only mode (`isReadOnly: true`) with mock fallback disabled (`allowMockFallback: false`).
7. **Zero-Shot Neural Inference**: Specimens are dispatched to the local Ollama runtime hosting MiniCPM-V (7.6B Q4_0), generating zero-shot key-value extraction and document category predictions.
8. **Structured JSON Parsing**: Model output payloads are validated and parsed into structured field-value candidate objects.
9. **Ground-Truth Alignment**: Candidate extractions are aligned one-to-one with ground-truth entity records across all 24,480 paired field observations.
10. **Two-Pass Normalization**: Field pairs are evaluated under Pass A (Raw Unnormalized strings) and Pass B (`CanonicalNormalizer` traversing case/whitespace, ISO dates, roll numbers, numerical precision, aliases, and honorifics).
11. **String Exact Match Evaluation**: Raw and normalized exact match statuses are computed for each candidate field observation.
12. **Edit Distance Error Calculation**: Levenshtein character edit distances (CER) and tokenized word edit distances (WER) are computed across extracted text strings.
13. **Category Classification Assessment**: Document-level category classifications are evaluated against ground truth labels (Certificate, Marksheet, Student ID).
14. **Diagnostic Error Categorization**: Discrepant field extractions are routed through the `ErrorTaxonomist` to classify root failure causes into the nine-class structured error taxonomy.
15. **Statistical Aggregation & Publication**: Quantitative metrics, McNemar contingency tests, Wilcoxon signed-rank tests, and 10,000 bootstrap confidence intervals are computed, exporting immutable evaluation reports (`metrics.json`, `predictions.json`, `comparisons.json`).

### 4.5 Evaluation Metrics and Mathematical Formulation
To rigorously quantify information extraction precision, character recognition fidelity, and classification correctness, the evaluation framework establishes sixteen mathematical metrics. Let $s \in \mathcal{S}$ denote the expected ground truth character string and $\hat{s} \in \mathcal{S}$ denote the extracted predicted string for a candidate entity. Let $C: \mathcal{S} \rightarrow \mathcal{S}$ represent the six-stage semantic canonical normalizer function (`CanonicalNormalizer`). Let $\mathbb{I}(\text{cond})$ denote the binary indicator function returning 1 if $\text{cond}$ is true and 0 otherwise. Let $D_{\text{char}}(\hat{s}, s)$ represent the Levenshtein character edit distance [21] (the minimum number of character insertions, deletions, and substitutions required to transform $\hat{s}$ into $s$), and let $D_{\text{word}}(\hat{w}, w)$ denote tokenized word-level edit distance. Let $\text{TP}, \text{FP}, \text{TN},$ and $\text{FN}$ denote True Positives, False Positives, True Negatives, and False Negatives, respectively. Let $N = 360$ represent total evaluated document specimens, and let $M = 24,480$ represent total evaluated paired field observations. Table VI provides the consolidated mathematical formulations and scientific purposes for all reported evaluation metrics.

**Table VI: Quantitative Evaluation Metrics and Mathematical Formulation**

| Metric Name | Scientific Purpose / Description | Mathematical Formulation |
| :--- | :--- | :--- |
| **Category Accuracy ($\text{Acc}_{\text{cat}}$)** | Proportion of specimens where predicted category matches ground truth. | $\text{Acc}_{\text{cat}} = \frac{1}{N} \sum_{i=1}^N \mathbb{I}(\hat{y}_i = y_i)$ |
| **Precision ($\text{Prec}$)** | Macro-averaged precision of extracted key-value field entities. | $\text{Prec} = \frac{\text{TP}}{\text{TP} + \text{FP}}$ |
| **Recall ($\text{Rec}$)** | Macro-averaged recall / true positive rate of target field entities. | $\text{Rec} = \frac{\text{TP}}{\text{TP} + \text{FN}}$ |
| **F1-Score ($\text{F1}$)** | Harmonic mean of extraction precision and extraction recall. | $\text{F1} = \frac{2 \cdot \text{Prec} \cdot \text{Rec}}{\text{Prec} + \text{Rec}}$ |
| **Character Error Rate ($\text{CER}$)** | Normalized character edit distance between predicted and ground truth strings. | $\text{CER} = \frac{1}{M} \sum_{j=1}^M \frac{D_{\text{char}}(\hat{s}_j, s_j)}{\max(|s_j|, 1)}$ |
| **Word Error Rate ($\text{WER}$)** | Normalized tokenized word edit distance across predicted field values. | $\text{WER} = \frac{1}{M} \sum_{j=1}^M \frac{D_{\text{word}}(\hat{w}_j, w_j)}{\max(|w_j|, 1)}$ |
| **Raw Exact Match ($\text{EM}_{\text{raw}}$)** | Percentage of fields identically matching ground truth before normalization. | $\text{EM}_{\text{raw}} = \frac{1}{M} \sum_{j=1}^M \mathbb{I}(\hat{s}_j == s_j)$ |
| **Normalized Exact Match ($\text{EM}_{\text{norm}}$)** | Percentage of fields matching ground truth after six-stage canonicalization. | $\text{EM}_{\text{norm}} = \frac{1}{M} \sum_{j=1}^M \mathbb{I}(C(\hat{s}_j) == C(s_j))$ |
| **Joint Record EM ($\text{EM}_{\text{joint}}$)** | Percentage of specimens achieving both 100% field F1 and correct category. | $\text{EM}_{\text{joint}} = \frac{1}{N} \sum_{i=1}^N \mathbb{I}(\hat{y}_i == y_i \land \text{F1}_i = 1.0)$ |
| **Matthews Correlation ($\text{MCC}$)** | Balanced binary classification metric robust to class imbalance. | $\text{MCC} = \frac{\text{TP}\cdot\text{TN} - \text{FP}\cdot\text{FN}}{\sqrt{(\text{TP}+\text{FP})(\text{TP}+\text{FN})(\text{TN}+\text{FP})(\text{TN}+\text{FN})}}$ |
| **Specificity / TNR** | True negative rate / proportion of negative instances correctly identified. | $\text{Specificity} = \frac{\text{TN}}{\text{TN} + \text{FP}}$ |
| **Negative Predictive Value ($\text{NPV}$)** | Proportion of predicted negative instances that are true negatives. | $\text{NPV} = \frac{\text{TN}}{\text{TN} + \text{FN}}$ |
| **False Positive Rate ($\text{FPR}$)** | Fall-out / proportion of true negative instances incorrectly flagged. | $\text{FPR} = \frac{\text{FP}}{\text{FP} + \text{TN}} = 1 - \text{Specificity}$ |
| **False Negative Rate ($\text{FNR}$)** | Miss rate / proportion of true positive instances missed by extractor. | $\text{FNR} = \frac{\text{FN}}{\text{FN} + \text{TP}} = 1 - \text{Recall}$ |
| **False Discovery Rate ($\text{FDR}$)** | Proportion of positive predictions that are false positives. | $\text{FDR} = \frac{\text{FP}}{\text{FP} + \text{TP}} = 1 - \text{Precision}$ |
| **False Omission Rate ($\text{FOR}$)** | Proportion of negative predictions that are false negatives. | $\text{FOR} = \frac{\text{FN}}{\text{FN} + \text{TN}} = 1 - \text{NPV}$ |
| **Processing Latency ($L_{\text{proc}}$)** | Mean execution latency per evaluated document specimen in milliseconds. | $L_{\text{proc}} = \frac{T_{\text{total}}}{N} \quad (\text{ms/sample})$ |
| **Processing Throughput ($\text{TH}$)** | End-to-end framework execution throughput in specimens per second. | $\text{TH} = \frac{N}{T_{\text{total}}} \quad (\text{samples/sec})$ |

### 4.6 Reproducibility Information
To facilitate independent scientific verification and benchmark replication, all code, benchmark configurations, and evaluation artifacts are preserved under open-access version control. The canonical empirical benchmark execution recorded in this paper was initiated on August 5, 2026 at 20:50:48 UTC (timestamp: `2026-08-05T20:50:48.067Z`, total execution duration: 3874.16s / 64.57 mins) under run identifier `run_1785959173886`. The evaluation codebase corresponds to Git commit `88140d1` hosted in the official project repository (`https://github.com/aashishrajput9838/academicuniverse.git`). The synthetic benchmark dataset (`AU_DIC_Benchmark_v1.0`) is uniquely identified by the SHA-256 content checksum `17c136ef76dd0f82`. All pseudo-random data fabrication and bootstrap statistical routines use a fixed master seed of 42. Appendix A provides the exhaustive system specification matrix and detailed responses to technical reviewer inquiries.
"""

new_v6_content = part_before_sec4 + v6_sec4 + "\n---\n\n## 5. Results & Empirical Validation\n" + part_sec5_and_after
v6_md_path.write_text(new_v6_content, encoding="utf-8")
print(f"[SUCCESS] Updated {v6_md_path.name} with restructured Section 4!")
