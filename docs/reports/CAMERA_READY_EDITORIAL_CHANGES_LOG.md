# CAMERA-READY EDITORIAL CHANGES LOG

**Document Transition**: `Paper_V2.1.md` $\rightarrow$ `Paper_V3.md`  
**Lead Technical Writer**: Scientific Technical Writing Team  
**Date**: `2026-08-04`  

---

## 1. Summary of Accepted Editorial Revisions

| Manuscript Section | Type of Revision | Specific Improvement Integrated in `Paper_V3.md` |
| :--- | :--- | :--- |
| **Title & Abstract** | Clarification | Added explicit statement specifying Option B input pipeline (text-prompted LLM reasoning). |
| **Section 2 (Related Work)** | Comparative Synthesis | Added **Table 0 (Comparative Benchmark Feature Matrix)** comparing ADBG v1.0 against SROIE, CORD, FUNSD, DocVQA, RVL-CDIP, Donut, and TrOCR. |
| **Section 3 (Architecture)** | Visualization | Embedded formal Mermaid architecture diagram illustrating the decoupled ADBG and AU DIC subsystems. |
| **Section 6.2 (Metrics)** | Mathematical Precision | Embedded LaTeX equations for Category Accuracy, Precision, Recall, F1, CER, WER, and Joint Record EM. |
| **Section 7.4 (Results)** | Pipeline Disambiguation | Added Section 7.4.1 explicitly defining Option B input pipeline to resolve Reviewer #3 inquiry. |
| **Section 7.4 (Results)** | Data Presentation | Included **Table 2** with complete live neural inference metrics (Groq Llama 3.1 8B Instant across 360 specimens). |
| **Section 8 (Discussion)** | Risk Mitigation | Expanded discussion of prompt schema constraints and input modality limitations. |
| **Appendices A & B** | Reproducibility | Updated run identifiers (`run_1785796639905`), Git commits (`823334b`), and answers to reviewer technical inquiries. |

---

## 2. Specific Line-by-Line Changes Traceability

1. **Input Pipeline Architecture Diagram (Section 7.4.1)**:
   - Added Mermaid flowchart defining Option B (Image $\rightarrow$ OCR/Text Representation $\rightarrow$ Prompt $\rightarrow$ LLM $\rightarrow$ Structured JSON).
2. **Promotional Wording Removal**:
   - Replaced phrases like *"flawless accuracy"* with *"100.00% Field Extraction F1 score under zero-shot text representation prompting"*.
3. **Metric Terminology Alignment**:
   - Aligned all occurrences of "Exact Match" to "Joint Record Exact Match Rate (EM)" to clearly indicate joint sub-task evaluation.
