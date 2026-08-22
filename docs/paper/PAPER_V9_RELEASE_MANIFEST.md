# PAPER V9 RELEASE MANIFEST & SCIENTIFIC ARTIFACT AUDIT

**Release Version:** V9 (Primary Publication Manuscript with Ethics & Appendix A Removed & Renumbered)  
**Date of Release:** August 22, 2026  
**Venue Target:** IEEE Access / ICDAR 2026  
**Status:** **OFFICIAL V9 PRODUCTION BUILD** (V5, V6, V7, and V8 Frozen & Intact)

---

## 1. Artifact Verification & Integrity Hashes

| Artifact File | Size (Bytes) | SHA-256 Checksum | Verification Status |
| :--- | :---: | :--- | :---: |
| `docs/paper/PaperV9_Ollama_Primary.docx` | 2,111,916 | `600486467b3c67126dedff64a93c90cd4c17584de15b9131627d35366a0648fb` | **VERIFIED** |
| `docs/paper/PaperV9_Ollama_Primary.pdf` | 1,580,596 | `db5548f8f9ffcf78aa323a5db1336d027a3f26361f3528b34e86384d9ddae98e` | **VERIFIED (25 Pages)** |
| `docs/paper/Paper_V9.md` | 48,135 | `b2c29890f24e90eedb7868aee26afad1261424b3a73511788963a2a0e734e20b` | **VERIFIED** |

---

## 2. Section Restructuring & Removal Summary

### Major Structural Modification:
- **Removed Heading & Content:** `"Ethics & Privacy Statement"` was completely removed.
- **Removed Heading & Content:** `"APPENDIX A: REPRODUCIBILITY & SYSTEM SPECIFICATIONS"` (including subsections `A.1` and `A.2`) was completely removed.
- **Appendices Renumbering:**
  - `APPENDIX A: FIELD SPECIFICATION & OBSERVATION COUNT DERIVATION` (Formerly Appendix B, with `A.1` and `A.2`)
  - `APPENDIX B: EMPIRICAL STATISTICAL METHODOLOGY & BENCHMARKS` (Formerly Appendix C, with `B.1`, `B.2`, and `B.3`)
- **Full Manuscript Sequence:**
  - `1. Introduction`
  - `2. Related Work`
  - `3. Methodology`
  - `4. Experimental Setup` (`4.1` to `4.6`)
  - `5. Results & Discussion` (7 individual 50-word narrative paragraphs + 8 tables + 7 figures)
  - `6. Future Work`
  - `7. Conclusion`
  - `ACKNOWLEDGMENT`
  - `APPENDIX A: FIELD SPECIFICATION & OBSERVATION COUNT DERIVATION`
  - `APPENDIX B: EMPIRICAL STATISTICAL METHODOLOGY & BENCHMARKS`
  - `REFERENCES`

---

## 3. Scientific Invariance & Baseline Verification

- **Paper V5, V6, V7, & V8 Frozen Status:** All prior version artifacts (`PaperV5_*`, `PaperV6_*`, `PaperV7_*`, `PaperV8_*`) are frozen and untouched.
- **Empirical Metrics Invariance:** Field F1 (75.23%), Raw Exact Match (74.60%), Normalized Exact Match (82.18%), CER (11.35%), WER (8.21%), Total Observations (24,480), Evaluated Specimens (360), Category Accuracy (100.00%).

**Audit Sign-off:** Automated Release Audit completed successfully with zero defects.
