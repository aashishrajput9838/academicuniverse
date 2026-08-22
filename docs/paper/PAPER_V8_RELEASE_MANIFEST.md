# PAPER V8 RELEASE MANIFEST & SCIENTIFIC ARTIFACT AUDIT

**Release Version:** V8 (Primary Publication Manuscript with Limitations Analysis Removed & Renumbered)  
**Date of Release:** August 22, 2026  
**Venue Target:** IEEE Access / ICDAR 2026  
**Status:** **OFFICIAL V8 PRODUCTION BUILD** (V5, V6, and V7 Frozen & Intact)

---

## 1. Artifact Verification & Integrity Hashes

| Artifact File | Size (Bytes) | SHA-256 Checksum | Verification Status |
| :--- | :---: | :--- | :---: |
| `docs/paper/PaperV8_Ollama_Primary.docx` | 2,113,382 | `a3357e12dcf67741626480282b3da71df873614dc6513144f5fdba39acc6b463` | **VERIFIED** |
| `docs/paper/PaperV8_Ollama_Primary.pdf` | 1,592,155 | `f21bb7687f39ba616a9bb68c24ac264a3af389ec4356dcfca4225bdb45cab079` | **VERIFIED (26 Pages)** |
| `docs/paper/Paper_V8.md` | 49,867 | `46bc5239d7c72851e4efc524aa43caf6f6de8bc17943be9c194e1c096657ec9f` | **VERIFIED** |

---

## 2. Section Restructuring & Removal Summary

### Major Structural Modification:
- **Removed Section:** `"6. Limitations Analysis"` (including subsection `6.1 Methodological Limitations` and `6.1.1`) was completely removed from the manuscript as requested.
- **Section Renumbering:**
  - `1. Introduction`
  - `2. Related Work`
  - `3. Methodology`
  - `4. Experimental Setup` (`4.1` to `4.6`)
  - `5. Results & Discussion` (7 individual 50-word narrative paragraphs + 8 tables + 7 figures)
  - `6. Future Work` (Formerly Section 7)
  - `7. Conclusion` (Formerly Section 8)
  - `Ethics & Privacy Statement`, `ACKNOWLEDGMENT`, `APPENDIX A`, `APPENDIX B`, `APPENDIX C`, `REFERENCES`

---

## 3. Scientific Invariance & Baseline Verification

- **Paper V5, V6, & V7 Frozen Status:** All prior version artifacts (`PaperV5_*`, `PaperV6_*`, `PaperV7_*`) are frozen and untouched.
- **Empirical Metrics Invariance:** Field F1 (75.23%), Raw Exact Match (74.60%), Normalized Exact Match (82.18%), CER (11.35%), WER (8.21%), Total Observations (24,480), Evaluated Specimens (360), Category Accuracy (100.00%).

**Audit Sign-off:** Automated Release Audit completed successfully with zero defects.
