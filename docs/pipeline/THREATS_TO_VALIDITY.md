# Threats to Validity — AU DIC Benchmark v1.0

This document analyzes threats to internal, external, construct, and conclusion validity in accordance with empirical software engineering research standards.

---

## 1. Internal Validity (Causal Relationship Integrity)

- **Ground Truth Leakage**: Threat: Ground truth JSON fields might inadvertently leak into model prompt inputs. Mitigation: `AuDicPredictionAdapter` was audited to confirm it extracts text strictly from PDF/PNG specimens or isolated metadata, never reading `extractedFields` during live inference.
- **Deterministic Seed Contamination**: Threat: Seed reuse could cause over-fitting. Mitigation: ADBG uses a strict hierarchical seed derivation model (`SeedManager.derive_child_seed()`) ensuring statistical independence between specimens.

---

## 2. External Validity (Generalizability of Findings)

- **Synthetic vs. Real-World Gap**: Threat: Models trained/evaluated on synthetic data may show degraded accuracy on physical scans. Mitigation: ADBG incorporates 14 optical degradation operators (`lens_distortion`, `defocus_blur`, `gradient_shadow`, `rotated_90`) modeling real-world camera optics and scan artifacts.

---

## 3. Construct Validity (Measurement Accuracy)

- **String Representation Mismatches**: Threat: Literal string comparison penalizes valid output formatting (e.g. `2021-IT-000150` vs `2021IT000150`). Mitigation: `CanonicalNormalizer` transforms inputs into canonical representations prior to metric evaluation.
- **Error Metric Granularity**: Character Error Rate (CER) and Word Error Rate (WER) are augmented by per-field Precision, Recall, F1 Score, and 9-class Error Taxonomy.

---

## 4. Conclusion Validity (Statistical & Benchmark Rigor)

- All evaluations run deterministically across **360 specimens** with 100% sample coverage, zero missing data, and reproducible dataset SHA-256 hashes (`17c136ef76dd0f82`).
