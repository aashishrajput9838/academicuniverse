# OPEN-SOURCE RELEASE DIRECTORY STRUCTURE

**Project**: AU DIC & ADBG v1.0 Research Suite  
**Role**: Open-Source Release Manager & Data Steward  
**Date**: `2026-08-04`  

---

## 1. Recommended Public Release Hierarchy

The public release repository is structured following standard IEEE and Zenodo reproducible data repository conventions:

```text
academicuniverse-audic-v1.0/
├── README.md                           # Main Project & Benchmark Overview
├── LICENSE                             # MIT Open Source License
├── CITATION.cff                        # Machine-readable Citation File
├── CONTRIBUTING.md                     # Contribution Guidelines
├── CODE_OF_CONDUCT.md                  # Contributor Code of Conduct
├── SECURITY.md                         # Security & Vulnerability Policy
├── CHANGELOG.md                        # Version Release History
│
├── source/                             # Framework Implementation Source Code
│   ├── backend/
│   │   ├── src/
│   │   │   ├── benchmark/              # AU DIC Evaluation Subsystem Engine
│   │   │   │   ├── adapters/           # Prediction Adapters (AuDicPredictionAdapter)
│   │   │   │   ├── evaluators/         # Category & Field Level Evaluators
│   │   │   │   ├── metrics/            # Metric Calculation Engines
│   │   │   │   ├── normalizers/        # Six-Stage Canonical Normalizers
│   │   │   │   ├── reports/            # CSV, JSON, and LaTeX Report Exporters
│   │   │   │   ├── runner/             # Benchmark Execution & Checkpoint Runner
│   │   │   │   └── types/              # TypeScript Interface Definitions
│   │   │   └── core/ai/                # AI Provider Backends (Groq, Gemini, Failover)
│   │   └── package.json                # Node.js Package Manifest & Dependencies
│
├── dataset/                            # AU_DIC_Benchmark_v1.0 Dataset Store
│   ├── metadata/                       # Specimen Metadata JSON Files (360 files)
│   ├── groundtruth/                    # Specimen Ground Truth JSON Files (360 files)
│   ├── pdf/                            # Typst Vector PDF Specimens (360 files)
│   └── png/                            # Rasterized Image Specimens (360 files)
│
├── paper/                              # Camera-Ready Publication Artifacts
│   ├── Paper_V3.md                     # Final IEEE Submission Manuscript
│   └── figures/                        # High-Resolution Mermaid & System Diagrams
│
├── benchmark_reports/                  # Empirical Experimental Evidence Archive
│   └── run_1785796639905/              # 360-Specimen Live Groq Llama 3.1 8B Run
│       ├── metrics.json                # Complete Aggregate Performance Metrics
│       ├── predictions.json            # 360 Live LLM Predictions (isMock: false)
│       ├── comparisons.json            # Ground Truth vs Prediction Comparison Objects
│       ├── summary.md                  # Executive Markdown Summary
│       ├── certification.md            # Execution Certification Signature Block
│       ├── results.csv                 # Tabular Results Dataset Export
│       └── tables.tex                  # LaTeX Manuscript Tables Export
│
└── docs/                               # Comprehensive Technical Documentation
    ├── Architecture/                   # System Architecture Review Reports
    ├── Implementation_Plan/            # Sprint Implementation Plans (001-005)
    └── reports/                        # Audit Reports & Journal Review Board Audits
```
