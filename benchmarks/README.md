# Academic Universe — Benchmark & Evaluation Framework

**Purpose:** Production-quality benchmark infrastructure for empirical evaluation of the Document Intelligence Center (DIC) subsystem, supporting the primary IEEE/Scopus journal paper:  
*Human-in-the-Loop Multimodal Document Intelligence for Verifiable Academic Credential Parsing in Multi-Tenant SaaS Environments*

---

## Directory Structure

```
benchmarks/
├── cli/
│   └── benchmark.ts          ← Single CLI entry point for all operations
├── config/
│   └── benchmark.config.ts   ← Centralized configuration with sensible defaults
├── types/
│   └── benchmark.types.ts    ← All TypeScript domain types (shared across modules)
├── dataset/
│   ├── datasetLoader.ts      ← Manifest loading, SHA-256 validation, sampling, batch load
│   └── manifest.sample.json  ← Sample manifest template (copy → manifest.json)
├── ground-truth/
│   ├── groundTruthEngine.ts  ← Parse, validate, IAA, Cohen's Kappa
│   └── SAMPLE_MS_ORG01_001.json  ← Example annotation
├── baselines/
│   ├── baselineRunner.interface.ts   ← IBaselineRunner interface
│   ├── tesseractRunner.ts            ← SYS-BASE-1: Tesseract OCR v5.0
│   ├── geminiSingleRunner.ts         ← SYS-BASE-2: Gemini 1.5 Pro (no fallback)
│   ├── openRouterSingleRunner.ts     ← SYS-BASE-3: OpenRouter gpt-4o-mini
│   └── academicUniverseDICRunner.ts  ← SYS-PROP: AU DIC Hybrid Pipeline
├── evaluators/
│   └── fieldComparisonEngine.ts  ← Exact/fuzzy/numeric/date/array field matching
├── metrics/
│   └── metricsEngine.ts      ← Precision, Recall, F1, latency percentiles, fallback rate
├── statistics/
│   └── statisticsEngine.ts   ← Shapiro-Wilk, t-test, Wilcoxon, Cohen's d, CI
├── logging/
│   └── benchmarkLogger.ts    ← JSONL + CSV logging, execution summary
├── exporters/
│   └── resultExporter.ts     ← CSV, Markdown, LaTeX, manuscript report generation
├── runners/
│   ├── pipelineExecutor.ts   ← Per-system execution with retry + checkpoint resume
│   └── benchmarkOrchestrator.ts ← Top-level coordinator for all systems
├── tests/
│   └── benchmark.test.ts     ← Jest unit tests for all core engines
├── results/                  ← Generated at runtime (gitignored)
│   ├── logs/
│   └── reports/
├── Dockerfile                ← Node 20-slim + Tesseract + poppler
├── docker-compose.yml        ← Reproducible containerized execution
├── package.json
├── tsconfig.json
└── jest.config.js
```

---

## Quick Start

### 1. Prerequisites
- Node.js v20+
- Tesseract OCR v5.0 (`apt install tesseract-ocr` / `brew install tesseract`)
- API Keys in `.env`:
  ```env
  GEMINI_API_KEY=your_gemini_key_here
  OPENROUTER_API_KEY=your_openrouter_key_here
  ```

### 2. Install Dependencies
```bash
cd benchmarks
npm install
```

### 3. Health Check
```bash
npm run doctor
# Checks: API keys, Tesseract binary, dataset directory, results directory
```

### 4. Prepare Dataset
```
benchmarks/
  dataset/
    Category_1_Marksheets/   ← Place PDF/PNG/JPEG marksheets here
    Category_2_Certificates/ ← Place certificate documents here
    Category_3_Timetables/   ← Place timetable documents here
    Category_4_EdgeCases/    ← Place edge-case documents here
  ground-truth/
    MS_ORG01_001.json        ← One JSON per document (see SAMPLE for schema)
```

The `DatasetLoader` auto-scans folder names to infer categories and builds `manifest.json` automatically on first run.

### 5. Validate Dataset
```bash
npm run validate
# Reports: valid files, invalid files, ground truth errors, duplicates
```

### 6. Run Pilot Benchmark (25 documents)
```bash
npm run pilot
# Runs all 4 systems on 25 randomly sampled documents
# Outputs: results/logs/ and results/reports/
```

### 7. Run Full Benchmark (500 documents)
```bash
npm run run:full
```

### 8. View Results Report
```bash
npm run report -- --experiment-id EXP-20260728120000
```

---

## CLI Reference

| Command | Description |
| :--- | :--- |
| `npm run doctor` | Health check: API keys, Tesseract, directories |
| `npm run validate` | Validate all dataset files + ground truth |
| `npm run pilot` | Run 25-document pilot benchmark (all 4 systems) |
| `npm run run:full` | Run full 500-document benchmark |
| `npm run resume -- --experiment-id <id>` | Resume interrupted benchmark from checkpoint |
| `npm run compare -- --experiment-id <id>` | Re-run statistical comparison from existing logs |
| `npm run stats -- --experiment-id <id>` | Print descriptive statistics |
| `npm run export -- --experiment-id <id>` | Re-export manuscript tables |
| `npm run clean -- --experiment-id <id>` | Delete all files for an experiment |
| `npm run report -- --experiment-id <id>` | Print manuscript tables to stdout |
| `npm test` | Run Jest unit tests |

---

## Ground Truth Annotation Schema

Every document requires a corresponding `.json` file in `ground-truth/` with this schema:

```json
{
  "documentId": "MS_ORG01_001",
  "category": "MARKSHEET",
  "studentName": "Full Name As Written",
  "rollNumber": "ENROLLMENT_ID",
  "semester": "5",
  "sgpa": 8.45,
  "cgpa": 8.32,
  "issueDate": "2024-12-15",
  "courseMarks": [
    {
      "courseCode": "CS501",
      "courseName": "Machine Learning",
      "marksObtained": 88,
      "maxMarks": 100
    }
  ]
}
```

**Rules:**
- `documentId` must exactly match the file basename (without extension)
- `category` must be: `MARKSHEET` | `CERTIFICATE` | `TIMETABLE` | `EDGE_CASE`
- Use `null` for fields not present in the document (not empty string `""`)
- `sgpa` / `cgpa` must be numbers (not strings)
- `issueDate` must be ISO 8601 format: `YYYY-MM-DD`
- All annotations must be double-verified by two independent annotators

---

## Docker (Fully Reproducible)

```bash
# Build
docker compose build

# Doctor check
docker compose run benchmark

# Pilot run
docker compose run benchmark npm run pilot

# Full run
docker compose run benchmark npm run run:full

# Tests
docker compose run test
```

All results are written to `./benchmarks/results/` on the host via Docker volume mount.

---

## Output Files

After a benchmark run, the following files are generated in `benchmarks/results/`:

| File | Format | Purpose |
| :--- | :--- | :--- |
| `<EXP_ID>_<SYS_ID>_results.jsonl` | JSONL | Per-document raw evaluation records |
| `<EXP_ID>_<SYS_ID>_results.csv` | CSV | Tabular per-document results |
| `<EXP_ID>_<SYS_ID>_summary.json` | JSON | Execution summary (success/failure counts) |
| `table_accuracy_comparison.csv` | CSV | System comparison table |
| `table_accuracy_comparison.md` | Markdown | Manuscript Table II (Markdown) |
| `table_accuracy_comparison.tex` | LaTeX | Manuscript Table II (IEEE LaTeX) |
| `table_category_breakdown.md` | Markdown | Per-category breakdown |
| `table_statistical_analysis.md` | Markdown | Statistical test results |
| `<EXP_ID>_manuscript_tables.md` | Markdown | Complete manuscript results section |

---

## Environment Variables

| Variable | Required | Description |
| :--- | :---: | :--- |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `OPENROUTER_API_KEY` | ✅ | OpenRouter API key |
| `NODE_ENV` | — | Set to `benchmark` to suppress dev logs |

---

## Reproducibility Snapshot

For exact reproduction of experiment results, record the following in your paper's supplementary material:

```
Framework Version: 1.0.0
Node.js: v20.15.0
Tesseract: v5.3.x
Gemini Model: gemini-1.5-pro-latest
OpenRouter Model: openai/gpt-4o-mini
Random Seed: 42 (used for pilot sampling)
Docker Image: academicuniverse-benchmark:1.0.0
Significance Alpha: 0.05
Numeric Tolerance: 1%
```
