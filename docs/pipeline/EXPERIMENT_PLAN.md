# AU DIC & ADBG v1.0 — Formal Experimental Research Plan

**Document Version**: 1.0.0  
**Date**: August 4, 2026  
**Role**: PhD Research Supervisor & Principal Research Scientist  
**Status**: **APPROVED FOR EXPERIMENTAL EXECUTION**  

---

## 1. Research Questions (RQs) & Formal Hypotheses (H)

### RQ1: Impact of Visual Quality Degradation on Extraction Accuracy
- **Question**: To what extent do physical optical degradations (`scanner_copy`, `mobile_camera`, `rotated_90`) degrade key-value extraction accuracy compared to vector digital baselines (`clean`)?
- **Hypothesis $H_1$**: Optical degradations introduce non-linear character error rate (CER) spikes, with 90-degree rotations causing catastrophic accuracy drop ($> 50\%$ drop in macro F1) unless un-rotated by orientation preprocessing.

### RQ2: Efficacy of Semantic Canonical Normalization
- **Question**: How significantly does semantic canonical normalization reduce false-positive field extraction errors caused by benign string formatting variations?
- **Hypothesis $H_2$**: Applying a 6-stage canonical normalizer (`CanonicalNormalizer`) significantly improves field precision and recall by eliminating trivial date, roll number, and institution name formatting penalties.

### RQ3: Fine-Grained Error Taxonomy Distribution
- **Question**: What are the dominant failure modes when extracting structured data from academic credentials under physical optical noise?
- **Hypothesis $H_3$**: `OCR_ERROR` and `FIELD_MISSING` account for over 70% of total extraction failures in degraded document specimens.

---

## 2. Experimental Variables & Design

- **Independent Variables**:
  1. **Document Category** (3 levels: `certificate`, `marksheet`, `student_id`).
  2. **Quality Profile** (4 levels: `clean`, `scanner_copy`, `mobile_camera`, `rotated_90`).
  3. **Normalization State** (2 levels: Raw Literal String Match vs. Canonical Normalized Match).

- **Dependent Variables**:
  1. **Character Error Rate (CER)**: Levenshtein distance divided by ground truth character length.
  2. **Word Error Rate (WER)**: Word-level edit distance divided by ground truth word count.
  3. **Field Precision ($P$)**, **Recall ($R$)**, and **F1 Score ($F_1$)**.
  4. **Exact Match Rate (EM)**: Percentage of specimens with 100% field equality.
  5. **System Latency ($\text{ms/sample}$)** and **Throughput ($\text{samples/sec}$)**.

- **Controlled Variables**:
  - Hardware CPU allocation (8-core x86_64).
  - Seed random number generator policy (`SeedManager`, `seed = 42`).
  - Specimen image resolution (300 DPI rasterization).

---

## 3. Experimental Protocol & Execution Matrix

- **Total Dataset Size**: 360 specimens (3 categories $\times$ 30 document instances $\times$ 4 quality profiles).
- **Execution Run Strategy**: 5 independent evaluation runs to compute mean, standard deviation, and processing latency stability.
- **Checkpoint Policy**: Update `checkpoint.json` after every batch increment of 10 samples to ensure execution fault-tolerance.
