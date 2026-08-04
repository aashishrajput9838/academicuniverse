# Author Response to Peer Review Comments (Reviewer #2)

**Manuscript Title**: *AU DIC: A Quality-Aware Benchmark Evaluation Framework and Synthetic Document Generator for Academic Credential Intelligence*  
**Manuscript Version**: V2.1 (Revised)  
**Target Venue**: IEEE Access / IEEE TPAMI / Springer Document Analysis  

---

We thank Reviewer #2 for the thorough, insightful, and constructive evaluation of our manuscript. We have addressed every comment, expanded the literature review, clarified the experimental context, updated the limitations section, and added an Appendix answering technical questions.

Below is our point-by-point response detailing the revisions made in **`Paper_V2.1.md`**.

---

### Reviewer Comment 1: Recommendation & Overall Scope
> **Reviewer Comment**: "The manuscript presents a sound methodology... The paper is recommended for Minor Revision subject to the authors addressing minor textual clarifications, expanding citations of key baseline architectures, and detailing planned multi-model comparative experiments."

- **Author Response**: We appreciate the positive evaluation and constructive recommendation. We have performed a thorough revision (V2.1) addressing all textual, literature, and technical comments.
- **Location of Change**: Entire Manuscript (`Paper_V2.1.md`).
- **Revision Summary**: Updated manuscript to V2.1 incorporating formal literature citations, explicit validation sectioning, expanded limitations, and technical appendices.

---

### Reviewer Comment 2: Literature Review & Baseline Citations
> **Reviewer Comment**: "The paper currently cites general concepts... To strengthen Section 2 (Related Work), the authors should add formal academic citations for FUNSD (Jaume et al.), CORD (Park et al.), LayoutLMv3 (Huang et al.), Donut (Kim et al.), and DocVQA (Mathew et al.)."

- **Author Response**: We agree completely. We have substantially expanded Section 2 (Related Work) with dedicated sub-analyses for FUNSD, CORD, DocVQA, LayoutLMv3, and Donut. We have explicitly positioned AU DIC relative to these landmarks, highlighting why academic credentials (dense multi-column mark tables and institutional metadata) require specialized benchmark generation and semantic canonical normalization.
- **Location of Change**: Section 2 (`Related Work`, Subsections 2.1, 2.2, 2.3).
- **Revision Summary**: Cites and discusses Jaume et al. (FUNSD), Park et al. (CORD), Mathew et al. (DocVQA), Huang et al. (LayoutLMv3), and Kim et al. (Donut), comparing their domain focus against AU DIC.

---

### Reviewer Comment 3: Clarification of Section 7.1 Baseline Context
> **Reviewer Comment**: "Ensure that the text explicitly reiterates that 100% baseline accuracy represents dry-run system validation, and encourage future benchmark users to submit model evaluation scores against the dataset."

- **Author Response**: We thank the reviewer for this crucial distinction. We have restructured Section 7.1 to explicitly separate **Framework Architectural Validation** (system non-destructiveness and execution speed), **Benchmark Validation** (controlled error detection and ground truth non-leakage), and **Model Baseline Performance**. We have explicitly clarified that the 100.00% baseline metrics reflect dry-run verification of the benchmark framework itself, providing a clean ground-truth reference for future model submissions.
- **Location of Change**: Section 7 (`Results & Validation`, Subsections 7.1, 7.2).
- **Revision Summary**: Delineated the three validation dimensions and clarified baseline metric context.

---

### Reviewer Comment 4: Expansion of Limitations Section
> **Reviewer Comment**: "Expand the discussion on Typst PDF template coverage to discuss potential layout variance between different university registrars worldwide."

- **Author Response**: We have expanded Section 8.3 (Limitations) to thoroughly discuss synthetic layout constraints, single-language bounds (`en_IN`), regional template diversity, real-world physical paper aging, and planned future validation on historical registrar archives.
- **Location of Change**: Section 8 (`Discussion, Threats to Validity & Limitations`, Subsection 8.3).
- **Revision Summary**: Added detailed analysis of synthetic template limitations, regional document variations, and physical archiving factors.

---

### Reviewer Comment 5: Technical Questions & Appendix Additions
> **Reviewer Comment**: "List every question that a reviewer is likely to ask during peer review: Q1 (CanonicalNormalizer fallback behavior), Q2 (Scalability beyond 360 samples), Q3 (Handling of multi-page transcripts)."

- **Author Response**: We have added **Appendix B (Technical Clarifications & Reviewer Inquiries)** to the manuscript, providing detailed technical answers for each question:
  1. **Q1 (Normalizer Fallbacks)**: `CanonicalNormalizer` falls back to `StringNormalizer.normalize(val, true)` (trimming, whitespace collapsing, lowercasing) if a field value does not match known date, roll number, or numeric patterns.
  2. **Q2 (Scalability)**: Benchmark execution scales linearly $O(N)$ with dataset size $N$. Concurrency batching (`concurrency: 4`) and checkpointing (`checkpoint.json`) enable scaling to 10,000+ specimens.
  3. **Q3 (Multi-Page Transcripts)**: Ground truth JSON schemas support `semester_records` arrays containing nested `course_marks` elements with page index attributes.
- **Location of Change**: Appendix B (`Technical Clarifications & Reviewer Inquiries`).
- **Revision Summary**: Added complete technical explanations for all three reviewer inquiries.
