# OFFICIAL RELATED WORK REVISION REPORT

**Target Section**: Section 2 (**Related Work**)  
**Manuscript Target**: `Paper_V3.md`, `Paper_V3_IEEE_Final.docx`, `Paper_V3_IEEE_Final.pdf`  
**Revision Scope**: Comparative Synthesis & Structured Literature Organization  
**Auditor Lead**: IEEE Access Senior Reviewer & Literature Review Specialist  
**Date**: `2026-08-04`

---

## 1. Executive Summary

Section 2 (**Related Work**) was restructured into **six logically organized subsections (2.1 through 2.6)**, replacing static paper lists with comparative scientific synthesis. Prior work is systematically analyzed across strengths, architectural paradigms, evaluation metrics, and domain-specific limitations.

---

## 2. Subsection Structure & Comparative Synthesis Mapping

### Section 2.1: Traditional OCR and Document Understanding
- **Focus**: Early classical OCR engines (Tesseract [18], line-finding LSTM RNNs [31]), binarization ensembles [16], and foundational form/receipt datasets (RVL-CDIP [1], SROIE [2], CORD [3], FUNSD [4], DocVQA [5]).
- **Early Multimodal Models**: LayoutLMv3 [6], OCR-free transformer Donut [7], sequence-to-sequence TrOCR [8].
- **Critical Limitation Highlighted**: Reliance on raw unnormalized string matching or raw character edit distances.

### Section 2.2: Modern Vision-Language Models for Document AI (2024–2025 Advances)
- **Focus**: Sequence-to-sequence visual task learning (Florence-2 [9]), high-resolution crop embeddings (mPLUG-DocOwl 2.0 [10]), dynamic resolution NaViT encoders (Qwen2-VL [11]), shifted cross-window attention (TextMonkey [12]), layout-aware instruction tuning (LayoutLLM [13]), universal pretraining (UDOP-v2 [14]), fine-grained document parsing (LLaVA-NeXT-Doc [15]), visual vocabulary scaling (Vary [19]).
- **Critical Synthesis**: Analyzes why generic VQA metrics fail on complex academic credentials with multi-column grade grids.

### Section 2.3: Synthetic Document Generation Paradigms
- **Focus**: Privacy-preserving synthetic dataset fabrication under FERPA/GDPR statutory constraints (Lu et al. [17]), vector document compilation backends like Typst (Zheng et al. [32]).
- **ADBG v1.0 Positioning**: Seed-deterministic generation combining Typst compilation with 14 physical degradation operators.

### Section 2.4: Benchmark Methodologies & Optical Degradation Robustness
- **Focus**: Standardized robust reading competitions (Karatzas et al. [33]), optical degradation modeling (Patel et al. [27]), semantic canonical normalization layers (Price & Smith [25]), structured diagnostic OCR error taxonomies (Zhang et al. [28]), reproducibility protocols (Banerjee et al. [35]).

### Section 2.5: Academic Credential & Sensitive Administrative Document Analysis
- **Focus**: Fictional credential rendering for privacy compliance (Gupta et al. [26]), complex tabular grid evaluation protocols (Wilson et al. [29]), statutory privacy-preserving benchmark design (Raman & Subramanian [30]).

### Section 2.6: Summary of Research Gap & Methodological Motivation
- **Synthesis of Four Core Gaps**:
  1. Statutory privacy restrictions prohibiting public authentic academic datasets.
  2. Lack of controlled physical optical degradation benchmarking matrices.
  3. Absence of semantic canonical normalization to insulate metrics from superficial representation differences.
  4. Lack of automated nine-class diagnostic OCR error categorization.

---

## 3. Comprehensive Benchmark Comparison Matrix (Table 0)

Updated **Table 0** with 11 representative benchmarks/models and 7 feature columns, contrasting ADBG v1.0 / AU DIC against foundational (RVL-CDIP, SROIE, CORD, FUNSD, DocVQA, LayoutLMv3, Donut) and modern (Florence-2, DocOwl 2.0, Qwen2-VL) paradigms.
