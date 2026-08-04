# Repository Structure Specification — AU DIC & ADBG v1.0

```text
academicuniverse/
├── ADBG/                                    # Academic Document Benchmark Generator Subsystem
│   ├── AU_DIC_Benchmark_v1.0/               # Generated Frozen Benchmark Dataset
│   │   ├── pdf/                             # Vector PDF Documents
│   │   │   └── clean/                       # Clean PDF specimens
│   │   │       ├── certificates/
│   │   │       ├── marksheets/
│   │   │       └── student_ids/
│   │   ├── images/                          # Rendered Image Specimens
│   │   │   ├── clean/                       # Clean baseline PNGs
│   │   │   ├── scanner_copy/                # Scanner degradation PNGs
│   │   │   ├── mobile_camera/               # Camera photo PNGs
│   │   │   └── rotated_90/                  # 90-degree rotated PNGs
│   │   ├── groundtruth/                     # Normalized Ground Truth JSONs
│   │   └── metadata/                        # Generation Parameter Metadata JSONs
│   ├── adbg/                                # Core ADBG Python Package
│   │   ├── core/                            # Seed manager, plugin registry, pipeline
│   │   ├── degradations/                    # 14 optical & physical degradation operators
│   │   ├── fabricators/                     # Synthetic data fabricator & catalogs
│   │   └── generators/                      # PDF template renderers & Typst engines
│   └── tests/                               # 86 Pytest Unit & Integration Tests
│
├── backend/                                 # AU DIC Backend Subsystem
│   ├── benchmark_reports/                   # Benchmark Run Output Reports
│   │   └── run_<timestamp>/                 # Self-contained run report directory
│   │       ├── certification.md             # Official RC1 Certification Report
│   │       ├── reproducibility.json         # SHA-256 hash & Git commit metadata
│   │       ├── tables.tex                   # IEEE LaTeX table code
│   │       ├── results.csv                  # Raw per-sample metric evaluations
│   │       ├── predictions.json             # Structured model predictions
│   │       ├── comparisons.json             # Discrepancy analysis & error taxonomy
│   │       ├── metrics.json                 # Full benchmark metrics JSON object
│   │       ├── summary.md                   # Markdown summary report
│   │       └── execution.log                # Execution run log
│   └── src/
│       ├── benchmark/                       # Isolated Read-Only Benchmark Subsystem
│       │   ├── adapters/                    # Ground truth & prediction adapters
│       │   ├── comparators/                 # String CER/WER, exact match, subject array
│       │   ├── evaluators/                  # Certificate, Marksheet, Student ID evaluators
│       │   ├── metrics/                     # Metric calculation & aggregation engine
│       │   ├── normalizers/                 # 6 semantic canonical normalizers
│       │   ├── reports/                     # Markdown, LaTeX, and CSV exporters
│       │   ├── runner/                      # Batch runner with checkpoint & resume
│       │   ├── types/                       # Domain type definitions
│       │   ├── utils/                       # File loader & reproducibility utils
│       │   └── __tests__/                   # 7 Jest test suites (26 unit tests)
│       └── core/                            # AU DIC Document Intelligence Core
```
