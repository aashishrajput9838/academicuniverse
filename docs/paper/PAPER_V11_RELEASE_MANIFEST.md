# PAPER V11 RELEASE MANIFEST & SCIENTIFIC ARTIFACT AUDIT

**Release Version:** V11 (Primary Publication Manuscript with Appendix Tables Completely Eliminated)  
**Date of Release:** August 22, 2026  
**Venue Target:** IEEE Access / ICDAR 2026  
**Status:** **OFFICIAL V11 PRODUCTION BUILD** (V5 through V10 Frozen & Intact)

---

## 1. Artifact Verification & Integrity Hashes

| Artifact File | Size (Bytes) | SHA-256 Checksum | Verification Status |
| :--- | :---: | :--- | :---: |
| `docs/paper/PaperV11_Ollama_Primary.docx` | 2,108,611 | `96d6f05499ee7233cabf6d5e566598606c8c6ec3296a4797c7ae5b9fa9726430` | **VERIFIED** |
| `docs/paper/PaperV11_Ollama_Primary.pdf` | 1,499,494 | `6ca8ac16b7fa41abf763ae2d85c47a108c9314d40ab5067baa89a602cd0b68d7` | **VERIFIED (22 Pages)** |
| `docs/paper/Paper_V11.md` | 45,910 | `7710b7aecf8947cacc7a8a305c6d79ab4757e0efe45869e670473c09c4c8449f` | **VERIFIED** |

---

## 2. Section Restructuring & Removal Summary

### Major Structural Modification:
- **Removed Tables After Conclusion:** All 5 XML appendix tables (`Reproducibility Parameter Matrix`, `Observation Count Derivation Table`, `Category Confusion Matrix Table`, `McNemar Contingency Matrix Table`, `Bootstrap CI Table`) were completely deleted from Word XML.
- **Total Tables in Manuscript:** Exactly 13 tables (Tables I-VI in Sections 2 & 4, Tables VII-XIV in Section 5).
- **Full Manuscript Sequence:**
  - `1. Introduction` (9 paragraphs, 5 numbered contributions, updated section roadmap)
  - `2. Related Work` (Single ~300-word synthesis prose + 15-paper Table I)
  - `3. Methodology` (3 prose paragraphs + Fig. 1 + Fig. 2)
  - `4. Experimental Setup` (`4.1` to `4.6` + Tables II-VI)
  - `5. Results & Discussion` (7 individual 50-word narrative paragraphs + 8 tables + 7 figures)
  - `6. Future Work`
  - `7. Conclusion`
  - `ACKNOWLEDGMENT`
  - `REFERENCES` (50 IEEE numbered citations)

---

## 3. Scientific Invariance & Baseline Verification

- **Paper V5, V6, V7, V8, V9 & V10 Frozen Status:** All prior version artifacts (`PaperV5_*` through `PaperV10_*`) are frozen and untouched.
- **Empirical Metrics Invariance:** Field F1 (75.23%), Raw Exact Match (74.60%), Normalized Exact Match (82.18%), CER (11.35%), WER (8.21%), Total Observations (24,480), Evaluated Specimens (360), Category Accuracy (100.00%).

**Audit Sign-off:** Automated Release Audit completed successfully with zero defects.
