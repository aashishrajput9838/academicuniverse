# PAPER V7 RELEASE MANIFEST & SCIENTIFIC ARTIFACT AUDIT

**Release Version:** V7 (Primary Publication Manuscript with Old Section 6 Removed & Renumbered)  
**Date of Release:** August 22, 2026  
**Venue Target:** IEEE Access / ICDAR 2026  
**Status:** **OFFICIAL V7 PRODUCTION BUILD** (V5 and V6 Frozen & Intact)

---

## 1. Artifact Verification & Integrity Hashes

| Artifact File | Size (Bytes) | SHA-256 Checksum | Verification Status |
| :--- | :---: | :--- | :---: |
| `docs/paper/PaperV7_Ollama_Primary.docx` | 2,113,936 | `41004d9196b017b8c1ed5036e75b0c0734df18261a58a7c328c61665db3d88cc` | **VERIFIED** |
| `docs/paper/PaperV7_Ollama_Primary.pdf` | 1,595,965 | `9efe7686e946312fae632d06a014c8012b9455561db96b58a06e5959ee4da45a` | **VERIFIED (26 Pages)** |
| `docs/paper/Paper_V7.md` | 51,059 | `3f130b3b79099b46bf324b0e2372a847bcd928649bd16fa2406b58b90fc960bf` | **VERIFIED** |

---

## 2. Section Restructuring & Removal Summary

### Major Structural Modification:
- **Removed Section:** `"6. Discussion & Threats to Validity"` (including subsections `6.1`, `6.2`, `6.3`) was completely removed from the manuscript as requested, streamlining the presentation since Section 5 already provides unified results, discussion, ablation, and failure diagnostics.
- **Section Renumbering:**
  - `5. Results & Discussion` (Unchanged, 7 individual 50-word narrative paragraphs + 8 tables + 7 figures)
  - `6. Limitations Analysis` (Formerly Section 7, with `6.1 Methodological Limitations`)
  - `7. Future Work` (Formerly Section 8)
  - `8. Conclusion` (Formerly Section 9)
  - `Ethics & Privacy Statement`, `ACKNOWLEDGMENT`, `APPENDIX A`, `APPENDIX B`, `APPENDIX C`, `REFERENCES`

---

## 3. Scientific Invariance & Baseline Verification

- **Paper V5 & V6 Frozen Status:** All prior version artifacts (`PaperV5_*`, `PaperV6_*`) are frozen and untouched.
- **Empirical Metrics Invariance:** Field F1 (75.23%), Raw Exact Match (74.60%), Normalized Exact Match (82.18%), CER (11.35%), WER (8.21%), Total Observations (24,480), Evaluated Specimens (360), Category Accuracy (100.00%).

**Audit Sign-off:** Automated Release Audit completed successfully with zero defects.
