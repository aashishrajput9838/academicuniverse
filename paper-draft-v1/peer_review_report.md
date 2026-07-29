# Peer Review Report

**Manuscript**: Human-in-the-Loop Multimodal Document Intelligence for Verifiable Academic Credential Parsing in Multi-Tenant SaaS Environments  
**Authors**: Academic Universe Research Team  
**Journal Target**: IEEE Access (Scopus Q1)  
**Review Date**: 2026-07-29  
**Reviewer**: Independent Peer Reviewer  
**Manuscript Version**: Draft V1 (Internal Research Manuscript)

---

## 1. Executive Summary

This manuscript presents the Academic Universe Document Intelligence Core (AU DIC), a multi-tenant SaaS document intelligence system for academic credential parsing. The paper integrates dual-provider multimodal LLM orchestration (Gemini 2.5 Flash + OpenRouter), a Human-in-the-Loop (HITL) staging pipeline, and transaction-safe soft deletion within an Express.js/MongoDB architecture.

**Critical Context**: The authors explicitly and repeatedly state that this draft represents a **workflow validation** using a minimal 5-document synthetic dataset, not a statistically rigorous scientific evaluation. Large-scale evaluation is deferred to Version 2. This context must govern the review.

**Overall Assessment**: The manuscript is **well-structured, technically coherent, and internally consistent in its architecture descriptions**. The writing is clear, the figures are conceptually sound, and the bibliography is comprehensive. However, the manuscript contains **significant data inconsistencies in the benchmark results** that undermine the experimental validation narrative, even as a workflow proof-of-concept. The citation quality is mixed, with several uncited references and duplicate entries.

**Recommendation**: **MAJOR REVISION** (specifically to fix data inconsistencies before any submission consideration).

---

## 2. Major Strengths

1. **Clear Positioning and Scope Management**: The authors demonstrate exceptional intellectual honesty by explicitly framing the manuscript as a workflow validation rather than a scientific claim. The disclaimer appears in the Abstract, Section 11.3, Section 14.6, Section 15.5, and Section 19, leaving no ambiguity about the study's limitations.

2. **Comprehensive Architecture Documentation**: The system architecture (Fig. 1, Fig. 2, Fig. 4) is described with implementation traceability to specific source files (`backend/src/modules/documentIntelligence/`, `backend/src/core/ai/failover.provider.ts`, etc.). This level of detail is rare in systems papers and enables reproducibility.

3. **Mathematical Rigor**: The methodology includes properly typeset IEEE equations for precision, recall, F1-score, latency decomposition, transaction sets, and aggregate metrics. The notation is consistent and correct.

4. **Thorough Threats-to-Validity Analysis**: Table 8 catalogues 10 threats across internal, external, construct, and conclusion validity dimensions. The authors do not shy away from acknowledging the severe limitations of N=5 and synthetic data.

5. **Complete Manuscript Structure**: All 20 required sections are present and fully written. No placeholders, no TODO markers, no unfinished subsections. This alone represents a significant authoring achievement.

6. **Strong Related Work Coverage**: Sections 5 and 6 cite 26 relevant works covering OCR, multimodal LLMs, HITL systems, multi-tenant architecture, benchmark frameworks, and enterprise alternatives.

---

## 3. Major Weaknesses

### 3.1 Critical Data Inconsistencies in Benchmark Results

This is the most serious issue. The benchmark results JSON (`experiment_VAL-20260729.json`) contains internal mathematical inconsistencies between `fieldMatches` and `fieldScores` for multiple evaluations. A reviewer verifying the data will immediately flag these errors.

**Specific Examples**:

| Document | System | fieldMatches (isMatch=true count) | Reported TP/FP/FN | Expected TP/FP/FN | Discrepancy |
|---|---|---|---|---|---|
| SYNTH_MS_004 | SYS-BASE-1 | 6 of 7 fields match | TP=4, FP=3, FN=3 | Should be TP=6, FP=0, FN=1 | **Major** |
| SYNTH_MS_005 | SYS-BASE-1 | 7 of 7 fields match | TP=6, FP=1, FN=1 | Should be TP=7, FP=0, FN=0 | **Major** |
| SYNTH_TT_002 | SYS-BASE-1 | 6 of 7 fields match | TP=5, FP=3, FN=2 | Should be TP=6, FP=0, FN=1 | **Major** |

The fieldScores values appear to be independently simulated without recomputing from fieldMatches. This breaks the fundamental relationship:
- If a field's `isMatch=true`, it contributes to TP (not FP or FN).
- If `isMatch=false`, it contributes to either FP or FN, depending on whether the field was extracted at all.

**Impact**: Even though the aggregate numbers in Table 6 happen to be internally consistent (they sum correctly from the per-system fieldScores), the per-document breakdown in Table 5 and the raw JSON data are mathematically incoherent. For a paper whose primary contribution is empirical validation, this is a fatal flaw.

### 3.2 HITL Metrics Inconsistencies

Table 7 states:
- "Documents requiring HITL review: 2 of 5 (40%)"
- "Total review time: 35 seconds"
- "Mean review time per document: 7.0 seconds"
- "Fallback-to-HITL correlation: 100% (all fallback docs required review)"

However, the benchmark JSON shows:
- **All 5 SYS-PROP documents** have `reviewDurationSec > 0` (5, 8, 12, 3, and 7 seconds respectively).
- Total review time = 35 seconds across all 5 documents, not 2.
- Fallback triggered on 3 documents (SYNTH_TT_002, SYNTH_ID_003, SYNTH_MS_005), but review times are non-zero for ALL documents including non-fallback ones (SYNTH_CERT_001: 5s, SYNTH_MS_004: 3s).
- Total fieldsCorrected = 2, but Table 7 reports "Total Corrections: 3" and "Fields corrected per reviewed doc: 1.5".

These inconsistencies suggest the HITL simulation logic and the reporting logic are not aligned.

### 3.3 Citation Quality Issues

**Uncited References**: References [27], [29], [30], [34], [35], [36], [37], [38], [39], [40], [41], [42], [43], [44], [45], [46], [47], and [48] appear in the bibliography but are never cited in the text. This represents 18 of 48 references (37.5%) that serve no purpose in the current manuscript.

**Duplicate Citations**: References [13] and [15] both cite Settles (2008) with different keys. References [31] and [33] both cite Subramanian (2023).

**Missing Context**: Several citations [5], [6], [7] (SAP, Workday, Moodle) are marked `[NEEDS VERIFICATION]` with URLs to generic documentation pages rather than specific technical documents about their document processing capabilities. This weakens the Related Work section.

### 3.4 Table 6 Performance Analysis Contains Unsupported Claims

Table 6 includes a "Performance Analysis" subsection that states:
> "SYS-PROP achieves the highest precision-recall balance (F1 = 0.882) among all systems"

This is **not supported by the data**. SYS-BASE-2 achieves F1=0.958 and SYS-BASE-3 achieves F1=0.943, both higher than SYS-PROP's 0.882. The paper's own data contradicts this claim. The correct statement would be: "SYS-PROP achieves the highest precision-recall balance among systems with fallback resilience" or similar.

---

## 4. Major Revision Requests

### M1: Fix Benchmark Data Inconsistencies

**Required**: Reconcile all `fieldMatches` and `fieldScores` in `experiment_VAL-20260729.json` so that:
1. For every document-system pair, the number of `isMatch=true` fields equals TP + (some FP/FN accounting).
2. The arithmetic `TP/(TP+FP) = precision`, `TP/(TP+FN) = recall`, `2PR/(P+R) = F1` holds exactly.
3. Table 5 values match the recomputed values from the JSON.
4. Table 6 aggregate values are the correct sums of Table 5 values.

**Type**: Requires rerunning/regenerating benchmark data and updating tables. Does NOT require new experiments.

### M2: Fix HITL Metrics Reporting

**Required**: Clarify whether:
- All 5 documents received HITL review (non-zero `reviewDurationSec`), or
- Only 2 documents required HITL corrections.

Then update Table 7, Section 14.5, and the JSON consistently. If all 5 documents received review time, update Table 7 to say "5 of 5" and adjust the "Fallback-to-HITL correlation" claim accordingly. If only 2 documents required review, set `reviewDurationSec=0` for the other 3 in the JSON.

**Type**: Requires rewriting manuscript sections and regenerating tables. Does NOT require new experiments.

### M3: Remove or Cite Uncited References

**Required**: Either:
- Add in-text citations for references [27], [29], [30], [34]–[48], or
- Remove them from the bibliography.

Given that this is a workflow validation paper, many of these references (e.g., BERT, ViT, Transformer, Firebase Auth, Express.js, Docker) are not directly relevant to the core contributions. They should be removed to keep the bibliography lean and focused.

**Type**: Manuscript-only change.

### M4: Consolidate Duplicate Citations

**Required**: Merge references [13] and [15] (both Settles 2008) into a single citation, and merge [31] and [33] (both Subramanian 2023). Update in-text citations accordingly.

**Type**: Manuscript-only change.

### M5: Correct the Unsupported Claim in Table 6

**Required**: Change "SYS-PROP achieves the highest precision-recall balance (F1 = 0.882) among all systems" to a claim that is actually supported by the data, such as "SYS-PROP achieves the highest precision-recall balance among systems with automatic fallback resilience."

**Type**: Manuscript-only change.

---

## 5. Minor Revision Requests

### m1: Add Missing Table Cross-References

Table 1 is referenced in Section 6.1 (already added). Table 2 is referenced in Section 10 (already added). Consider adding explicit "See Table N" references in:
- Section 13 when discussing metrics definitions (Table 4)
- Section 14.6 when discussing category breakdown (Table 7)

### m2: Standardize AI Model Naming

The paper alternates between "Gemini 1.5 Pro", "Gemini 1.5 Pro (Single)", "Gemini 2.5 Flash", and "Gemini 2.5 Flash" for the primary provider. In Section 12.1, the baseline is "Gemini 1.5 Pro", but in Section 9.2, the primary provider is "Gemini 2.5 Flash". This inconsistency should be resolved. Since the system architecture describes "Gemini 2.5 Flash" as the production primary, the baseline should be updated to match, or the discrepancy should be explicitly explained.

### m3: Add Equation Numbers

IEEE Access requires numbered display equations. Currently, all equations are unnumbered. Number equations (1) through (n) for all display-mode LaTeX blocks.

### m4: Reduce Keyword Count

IEEE Access allows 5–8 keywords. The current manuscript lists 11 keywords. Reduce to 8 by removing the least essential: "benchmark validation", "structured extraction", "OCR fallback", or similar.

### m5: Abstract Word Count

The abstract is approximately 250 words. IEEE Access recommends < 250 words. Trim slightly by removing redundant phrasing.

### m6: Add Missing References for Cited Technologies

When discussing Firebase Auth [37], Express.js [38], Mongoose [39], Next.js [40], Tailwind [41], Sentry [42], Docker [43], and OpenRouter [44], the paper should either cite these references or remove the citations. Currently these are cited nowhere in the text but present in the bibliography.

---

## 6. Missing Evidence

1. **No Empirical Architecture Validation**: The paper claims the system is "production-grade" and "transaction-safe" but provides no evidence of production deployment, load testing, or transaction failure rates. This is acceptable for V1 but should be explicitly noted as deferred evidence.

2. **No Prompt Engineering Details**: The AI extraction prompt is described as "structured JSON output conforming to the canonical schema" but the actual prompt template is not provided. For reproducibility, the prompt (or at least its structure) should be documented.

3. **No Error Rate Baseline**: The paper does not report the baseline error rate for manual transcript data entry, which is necessary to contextualize the 60% administrative time savings claim in H2.

4. **No Cost Analysis**: While mentioned as a limitation, no API cost data is provided even as anecdotal evidence.

---

## 7. Missing Experiments

For V1 (workflow validation), the current experiments are sufficient. For V2 (scientific validation), the following are required:

1. **Ablation Studies**: Remove HITL, remove fallback, remove dual-provider to measure individual component contributions.
2. **Statistical Hypothesis Testing**: Paired t-tests or Wilcoxon signed-rank tests with N >= 500.
3. **Inter-Rater Reliability**: Cohen's kappa for multi-reviewer HITL studies.
4. **Real-World Dataset**: 500+ human-annotated documents from actual educational institutions.
5. **Baseline Expansion**: Add PaddleOCR, LayoutLMv3, GPT-4o structured output, and Donut as additional baselines.
6. **Longitudinal Study**: Evaluate system performance across multiple model versions over time.

---

## 8. Missing References

1. **Prompt Engineering / JSON-mode LLMs**: No reference to techniques for enforcing structured JSON output from LLMs (e.g., ReAct, constrained decoding, JSON mode APIs).
2. **Document Preprocessing**: No reference to deskewing, denoising, or binarization techniques specifically for academic documents.
3. **Confidence Calibration**: No reference to work on calibrating LLM confidence scores, which is relevant to the HITL routing logic.
4. **Multi-Tenant Benchmarking**: No reference to prior work benchmarking multi-tenant SaaS performance or isolation guarantees.
5. **Document Intelligence Surveys**: While [8] (Kundu 2023) is cited, more recent surveys (2024–2025) on document AI with LLMs would strengthen the literature review.

---

## 9. Unsupported Claims

1. **"SYS-PROP achieves the highest precision-recall balance"** (Table 6): contradicted by Table 6 data showing SYS-BASE-2 (0.958) > SYS-PROP (0.882).

2. **"The system is production-grade"** (Section 4): Supported by the codebase structure but not by any production deployment evidence. Should be rephrased to "production-architecture-grade" or "enterprise-pattern-grade".

3. **"demonstrates the resilience of the dual-provider architecture"** (Section 14.4): With only 3 fallback triggers on 5 documents, this claim is anecdotal. Should be qualified as "suggests potential resilience" or "illustrates the failover mechanism".

4. **"ensuring continuous operation"** (Section 15.1): With N=5 and all documents succeeding, no system experienced downtime. The claim about continuity is not empirically demonstrated.

---

## 10. Technical Inconsistencies

1. **AI Model Name Mismatch**: Section 12.1 describes SYS-BASE-2 as "Gemini 1.5 Pro", but Section 9.2 describes the primary provider as "Gemini 2.5 Flash". These are different models.

2. **SYS-PROP F1-Score Uniformity**: All 5 SYS-PROP documents show identical F1=0.857 in Table 5. While possible, this exact uniformity across different quality profiles (CLEAN_PDF, SCANNER_COPY, MOBILE_CAMERA, ROTATED) is suspicious for a simulation and reduces perceived realism.

3. **Latency Total Discrepancy**: In Table 5, SYS-PROP on SYNTH_CERT_001 shows total latency 2,650 ms, but the JSON shows uploadMs=120 + aiInferenceMs=2400 + dbStagingMs=130 = 2,650 ms. This is consistent. However, Table 6 shows SYS-PROP mean latency = 2,796 ms. The average of the 5 SYS-PROP latencies (2650+2885+2730+2620+2980)/5 = 2773, not 2796. There is a 23 ms discrepancy.

4. **Review Duration Inconsistency**: Section 14.5 states "total review time of 19 seconds" (sum of SYNTH_ID_003: 12s + SYNTH_MS_005: 7s). But Table 7 shows total review time = 35 seconds. The section text and table contradict each other.

5. **Fields Corrected Count**: Section 14.5 states "2 fields corrected". Table 6 shows "Total Corrections: 3". The JSON shows total fieldsCorrected = 2 (1 on SYNTH_ID_003 + 1 on SYNTH_MS_005). Table 7 shows "Total fields corrected: 3" and "Fields corrected per reviewed doc: 1.5". These are inconsistent.

6. **Reference Number Gap**: The references jump from [26] to [28] (missing [27]), then [31], [32], [33]. This numbering gap is confusing and suggests references were removed without renumbering.

---

## 11. Reviewer Questions

1. **RQ1**: Why do all SYS-PROP documents in Table 5 show identical F1=0.857? Was this intentional simplification for the workflow validation, or a simulation artifact?

2. **RQ2**: Why does the benchmark JSON contain fieldScores values that are mathematically inconsistent with the corresponding fieldMatches? Were these values simulated independently?

3. **RQ3**: The paper states SYS-BASE-2 uses "Gemini 1.5 Pro" while the production system uses "Gemini 2.5 Flash". Is this intentional (different model versions for baseline vs. proposed), or a naming inconsistency?

4. **RQ4**: Why are 18 references present in the bibliography but never cited? Were they included for future use, or is this an oversight?

5. **RQ5**: The HITL review durations in the JSON are non-zero for ALL 5 SYS-PROP documents, but the paper text and Table 7 suggest only 2 documents required HITL review. What is the correct interpretation?

6. **RQ6**: The abstract claims "fallback triggered on 3 of 5 documents" and "HITL corrections applied on 2 of 5 documents". Is the fallback count of 3 accurate, or should it be 2 (matching the documents with non-zero corrections)?

---

## 12. Acceptance Probability

**Current Probability**: 15% (with Major Revisions)

**Rationale**:
- The manuscript is structurally complete and well-written.
- The authors demonstrate exceptional honesty about the study's limitations.
- However, the data inconsistencies (M1, M2) are fatal for a paper whose primary contribution is empirical validation. Even as a workflow validation, the benchmark data should be internally consistent.
- The unsupported claim in Table 6 and the citation quality issues further reduce confidence.
- With Major Revisions addressed, the probability would rise to approximately 60–70% for a special issue or workshop track, or 40–50% for a regular IEEE Access submission pending large-scale V2 experiments.

---

## 13. Recommendation

### **MAJOR REVISION**

The manuscript should **not** be accepted in its current form. The data inconsistencies in the benchmark results are serious enough to undermine the paper's primary narrative, even as a workflow validation. However, the paper's structure, writing quality, and architectural contributions are strong enough that it could become a solid contribution after revisions.

**Specific required actions before resubmission**:

1. Fix all fieldMatches/fieldScores mathematical inconsistencies in the benchmark JSON and regenerate Table 5.
2. Clarify and fix HITL metrics reporting across JSON, Table 7, and Section 14.5.
3. Remove or properly cite all uncited references.
4. Consolidate duplicate citations [13]/[15] and [31]/[33].
5. Correct the unsupported claim in Table 6.
6. Resolve the AI model naming inconsistency (Gemini 1.5 Pro vs. 2.5 Flash).

After these corrections, the manuscript would be suitable for:
- A **workshop track** or **special issue** on document intelligence systems (higher acceptance probability).
- **Version 2** with large-scale experiments as a full IEEE Access submission.

The Version 2 roadmap (`improvement_recommendations_v2.md`) is well-conceived and, if executed, would produce a scientifically rigorous paper worthy of a Q1 journal.

---

## 14. V2 Roadmap

### Critical Before Large Benchmark

| Item | Type | Description |
|---|---|---|
| Fix data inconsistencies | Rewrite | Reconcile fieldMatches/fieldScores, HITL metrics, and all cross-document data inconsistencies |
| Resolve model naming | Rewrite | Standardize on Gemini 2.5 Flash or explicitly differentiate baseline vs. proposed model versions |
| Clean bibliography | Rewrite | Remove uncited refs, consolidate duplicates, verify NEEDS VERIFICATION entries |
| Add prompt engineering appendix | New content | Document actual extraction prompts for reproducibility |

### Required Before Submission

| Item | Type | Description |
|---|---|---|
| Scale to N >= 500 | New experiment | Generate or collect 500+ documents with human annotations |
| Statistical testing | New analysis | Paired t-tests / Wilcoxon, Cohen's d, Bonferroni correction |
| Inter-rater reliability | New experiment | Multi-reviewer HITL study with Cohen's kappa |
| Real-world dataset | New experiment | Partner with institutions for anonymized real documents |
| Additional baselines | New experiment | PaddleOCR, LayoutLMv3, GPT-4o structured output, Donut |
| Ablation studies | New experiment | Remove HITL, fallback, dual-provider components individually |
| Cost analysis | New experiment | Track API costs per document per provider |
| Convert to IEEE LaTeX | Rewrite | Double-column, numbered equations, Roman section numbering |
| Numbered equations | Rewrite | Add equation numbers for all display-mode LaTeX |
| Reduce keywords to 5–8 | Rewrite | Trim keyword list |

### Nice to Have

| Item | Type | Description |
|---|---|---|
| BLEU/edit distance metrics | New experiment | Supplement F1 with text-similarity metrics |
| Latency CDF plots | New figure | Add Fig. 10 showing latency distribution |
| HITL threshold optimization | New experiment | Vary confidence thresholds and measure review burden |
| Dynamic field schema | Software modification | Replace hardcoded 7-field schema |
| Local LLM fallback | Software modification | Integrate Llama 3 for offline mode |
| Multilingual evaluation | New experiment | Hindi, Tamil, Bengali documents |
| Explainable AI outputs | Software modification | Log AI reasoning per extracted field |
| Cross-domain adaptation | New experiment | Invoices, receipts, legal contracts |
| Federated learning | Research | Multi-tenant model fine-tuning without data sharing |
| Mobile HITL interface | Software modification | On-the-go reviewer interface |

### Future Research

| Item | Type | Description |
|---|---|---|
| Self-improving system | Long-term | Use HITL corrections as fine-tuning data |
| Cross-institutional benchmark | Long-term | Public benchmark with ground truth |
| LMS integrations | Software modification | Moodle, Canvas, Google Classroom APIs |
| Compliance framework | Software modification | GDPR, DPDP, HIPAA features |
| Theoretical bounds | Research | Formal analysis of dual-provider error correlation |
| Adversarial robustness | Research | Evaluate resilience to crafted documents |
| Economic modeling | Research | Cost-benefit model for HITL vs. automated |
| Cross-lingual transfer | Research | Study language transfer effects |
