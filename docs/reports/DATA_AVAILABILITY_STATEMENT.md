# DATA & CODE AVAILABILITY STATEMENT

**Journal**: IEEE Access / Scopus Publication Suite  
**Manuscript Title**: *ADBG v1.0 & AU DIC Benchmark Evaluation Framework: A Reproducible Synthetic Benchmark Suite and Normalization Pipeline for Academic Document Intelligence*  
**Date**: `2026-08-04`

---

## 1. Code Availability

The complete source code for the Academic Document Benchmark Generator (ADBG v1.0) and the AU DIC Benchmark Evaluation Framework v1.0 is open-source and publicly hosted on GitHub:

- **Primary Repository**: `https://github.com/aashishrajput9838/academicuniverse`
- **Mirror Repository**: `https://github.com/aashishrajput98381/academicuniverse`
- **License**: MIT License
- **Git Commit Hash**: `2a21111`

---

## 2. Dataset Availability

The benchmark dataset suite (`AU_DIC_Benchmark_v1.0`), comprising 360 synthetic document images/PDFs across four standardized optical quality profiles (*clean*, *scanner_copy*, *mobile_camera*, *rotated_90*) paired with pixel-exact ground-truth JSON annotations, is publicly accessible within the repository under the `ADBG/` directory.

- **Dataset Identifier**: `AU_DIC_Benchmark_v1.0`
- **Dataset SHA-256 Hash**: `17c136ef76dd0f82`
- **Dataset License**: MIT License
- **Ethical Compliance**: 100% Synthetic Data Fabrication (No authentic student records or PII used).

---

## 3. Reproducibility Statement

All experimental evaluation scripts, statistical analysis routines, 1,000-iteration bootstrap resampling routines, and 300 DPI figure generators are fully executable from the command line:

```bash
# Regenerate dataset
npm run benchmark:generate

# Execute live inference evaluation
npm run benchmark:run

# Execute ablation study & statistical significance tests
python backend/src/benchmark/utils/run_normalization_ablation.py
python backend/src/benchmark/utils/run_statistical_analysis.py
```
