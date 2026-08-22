from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v6_md_path = workspace / "docs" / "paper" / "Paper_V6.md"

v6_text = v6_md_path.read_text(encoding="utf-8")

# Update Introduction cross-reference in Section 1
old_intro_ref = (
    "Section 3 details the proposed methodology, including overall framework architecture, "
    "ADBG synthetic benchmark generation, the AU DIC evaluation framework, the semantic canonical "
    "normalization layer, and the nine-class structured OCR error taxonomy."
)
new_intro_ref = (
    "Section 3 details the proposed methodology, including the decoupled system architecture "
    "and complete end-to-end data flow."
)

if old_intro_ref in v6_text:
    v6_text = v6_text.replace(old_intro_ref, new_intro_ref)

# Extract parts before Section 3 and after Section 3
part_before_sec3, rest = v6_text.split("## 3. Proposed Methodology\n", 1)
_, part_sec4_and_after = rest.split("\n## 4. Experimental Setup\n", 1)

v6_sec3 = """## 3. Methodology

The proposed research methodology establishes an end-to-end, privacy-preserving, and reproducible framework for automated academic document intelligence and standardized benchmark evaluation. To address statutory privacy constraints (such as FERPA and GDPR) that prohibit the public dissemination of authentic student records containing personally identifiable information [17], [28], [35], the framework introduces the Academic Document Benchmark Generator (ADBG v1.0) [26]. ADBG v1.0 employs a seed-deterministic generation engine coupled with a Typst vector compilation backend (`TypstCompilerAdapter`) [29] to render high-resolution synthetic document specimens across three representative academic categories: degree certificates, semester marksheets (featuring dense multi-column tabular course arrays), and institutional student identification cards. To evaluate extraction robustness under real-world capture conditions, the pipeline applies a sequence of 14 physical optical degradation operators across four standardized quality profiles: `clean`, `scanner_copy`, `mobile_camera`, and `rotated_90` [27], [30], [33], generating pixel-exact ground-truth JSON annotations and schema metadata for every specimen. The resulting benchmark suite (`AU_DIC_Benchmark_v1.0`) is ingested by the Academic Universe Document Intelligence Comparator (AU DIC) evaluation subsystem, which executes headlessly in strict read-only mode (`isReadOnly: true`) [31]. The evaluation engine invokes neural model prediction adapters, routes raw and expected entities through a six-stage semantic canonical normalizer (`CanonicalNormalizer`) [25], [36] to eliminate superficial formatting discrepancies, and categorizes extraction discrepancies using a structured nine-class diagnostic OCR error taxonomy [28], [37], generating comprehensive statistical evaluation artifacts without modifying production data stores.

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

**Fig. 1. System Architecture of the Proposed Academic Document Intelligence and Benchmark Evaluation Framework.**

The system architecture illustrated in Fig. 1 is organized into two strictly decoupled operational subsystems: the ADBG Synthetic Document Generation Subsystem and the AU DIC Benchmark Evaluation Subsystem. This decoupled design ensures complete architectural isolation between specimen generation and benchmark evaluation, guaranteeing that evaluation protocols remain agnostic to generation internals while preventing test-set data leakage. Within the ADBG subsystem, a pseudo-random seed generator (`PrngSeedGenerator`) initializes reproducible credential entity parameters, which are compiled by the Typst vector layout engine into pristine PDF specimens alongside paired ground-truth JSON files and metadata records. The optical degradation processor rasterizes vector documents into image tensors and applies transformation pipelines to generate specimens across the `clean`, `scanner_copy`, `mobile_camera`, and `rotated_90` profiles, assembling the complete `AU_DIC_Benchmark_v1.0` benchmark store. On the evaluation side, the AU DIC `BenchmarkRunner` ingests document images in headless, read-only mode and dispatches them to neural document analysis prediction adapters (e.g., local Ollama runtimes or vision-language models). Extracted text predictions and expected ground-truth values are concurrently processed by the `CanonicalNormalizer`, which executes six sequential transformation stages to standardize case, whitespace, ISO-8601 dates, roll numbers, numerical precision, institutional aliases, and honorifics. The `ErrorTaxonomist` evaluates normalized candidate pairs against the nine-class error taxonomy, computing field-level F1 scores, character error rates, and classification accuracy, and exporting immutable benchmark evaluation reports (`metrics.json`, `predictions.json`, `comparisons.json`).

```mermaid
flowchart TD
    subgraph Phase1["Phase I: Synthetic Benchmark Generation"]
        A1["Research Configuration"] --> A2["Deterministic Seed Initialization"]
        A2 --> A3["ADBG Synthetic Document Generation"]
        A3 --> A4["Typst Vector PDF Compilation"]
        A3 --> A5["Ground Truth JSON Assembly"]
        A4 --> A6["High-Resolution Rasterization"]
        A6 --> A7["Controlled Degradation Matrix\n(clean | scanner_copy | mobile_camera | rotated_90)"]
        A5 --> A8["AU_DIC_Benchmark_v1.0 Suite"]
        A7 --> A8
    end

    subgraph Phase2["Phase II: Read-Only Evaluation Subsystem"]
        A8 --> B1["Benchmark Runner Engine Initialization"]
        B1 --> B2["Live Vision-Language / OCR Model Inference\n(Local Ollama MiniCPM-V 7.6B)"]
        B2 --> B3["Raw Prediction Extraction"]
        B3 --> B4["Six-Stage Semantic Canonical Normalization\n(CanonicalNormalizer)"]
        B4 --> B5["Field-Level Candidate Comparison"]
        B5 --> B6["Nine-Class Structured OCR Error Taxonomy\n(ErrorTaxonomist)"]
    end

    subgraph Phase3["Phase III: Quantitative & Statistical Analysis"]
        B6 --> C1["Metric Computation\n(Category Accuracy, Precision, Recall, F1, CER, WER, Joint EM)"]
        C1 --> C2["Statistical Hypothesis Significance Testing\n(McNemar's χ², Wilcoxon Signed-Rank, Paired t-Test)"]
        C1 --> C3["Non-Parametric 95% Bootstrap Confidence Intervals\n(10,000 Iterations)"]
        C1 --> C4["Two-Pass Normalization Ablation Study\n(Pass A Unnormalized vs Pass B Normalized)"]
    end

    subgraph Phase4["Phase IV: Publication Artifact Generation"]
        C2 --> D1["Benchmark Reports & Payloads\n(metrics.json, predictions.json, comparisons.json)"]
        C3 --> D1
        C4 --> D1
        D1 --> D2["IEEE Publication Figures & LaTeX Tables"]
        D2 --> D3["Final Submission Package & Reproducibility Certification"]
    end
```

**Fig. 2. Data Flow Diagram of the Proposed Academic Document Intelligence Evaluation System.**

The Data Flow Diagram depicted in Fig. 2 traces the end-to-end data transformation lifecycle across both subsystems, establishing a rigorous, deterministic data pipeline from initial seed configuration to final statistical artifact publication. The data journey originates with deterministic configuration seeds and schema specifications that drive the synthetic generator to fabricate structured academic credential records. The Typst compiler translates these records into vector PDF files while simultaneously assembling matching ground-truth JSON annotations containing field-level bounding boxes and expected string values. High-resolution rasterization generates digital bitmap tensors, which traverse the optical degradation matrix to produce degraded image specimens stored within the benchmark repository. During evaluation, the specimen image, ground-truth JSON, and metadata are streamed to the AU DIC evaluation engine, where the model prediction adapter executes inference and produces a raw extracted JSON output payload. Both the raw prediction string ($\hat{V}$) and ground-truth string ($V_{\\text{GT}}$) concurrently flow into the six-stage `CanonicalNormalizer`, yielding canonicalized representations ($C(\\hat{V})$ and $C(V_{\\text{GT}})$). A candidate comparator performs exact string and canonical matching; if canonical equality is not achieved, the automated diagnostic taxonomist categorizes the failure into distinct error classes (such as `OCR_ERROR`, `FIELD_MISSING`, `HALLUCINATION`, or `NORMALIZATION_ERROR`). Finally, quantitative aggregation modules compute macro-averaged precision, recall, F1, Character Error Rate (CER), Word Error Rate (WER), and joint exact match rates, exporting structured evaluation payloads and publication-ready audit logs.
"""

new_v6_content = part_before_sec3 + v6_sec3 + "\n---\n\n## 4. Experimental Setup\n" + part_sec4_and_after
v6_md_path.write_text(new_v6_content, encoding="utf-8")
print(f"[SUCCESS] Updated {v6_md_path.name} with restructured Section 3!")
