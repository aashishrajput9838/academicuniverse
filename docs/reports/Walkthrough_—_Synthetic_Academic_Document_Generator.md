# Walkthrough — Synthetic Academic Document Generator

Built a production-grade, independent **Synthetic Academic Document Generator** integrated with the Academic Universe Research Platform.

---

## 📦 Delivered Modules

### 1. Core Generator Infrastructure (`benchmarks/synthetic-generator/`)

| Module | File | Description |
|:---|:---|:---|
| Domain Types | [syntheticGenerator.types.ts](file:///c:/github/academicuniverse.com/academicuniverse/benchmarks/synthetic-generator/types/syntheticGenerator.types.ts) | Strict TypeScript domain interfaces for configurations, profiles, and manifests |
| Seeded PRNG | [seededRandom.ts](file:///c:/github/academicuniverse.com/academicuniverse/benchmarks/synthetic-generator/core/seededRandom.ts) | Mulberry32 PRNG algorithm for 100% deterministic, seed-reproducible generation |
| Data Fabricator | [dataFabricator.ts](file:///c:/github/academicuniverse.com/academicuniverse/benchmarks/synthetic-generator/core/dataFabricator.ts) | Generates coherent student profiles, roll numbers, course marks, grades, and dates |
| Template Engine | [templateEngine.ts](file:///c:/github/academicuniverse.com/academicuniverse/benchmarks/synthetic-generator/core/templateEngine.ts) | Pluggable architecture supporting 4 fictional university templates (VTU, SRIT, NIES, IGCE) |
| Quality Profiles | [qualityProfiles.ts](file:///c:/github/academicuniverse.com/academicuniverse/benchmarks/synthetic-generator/core/qualityProfiles.ts) | 9 reusable quality profiles + mandatory `SYNTHETIC RESEARCH DATASET` watermark & footer |

### 2. Document Generators (`benchmarks/synthetic-generator/generators/`)

| Document Type | ExtendedCategory | Generator |
|:---|:---|:---|
| Semester Marksheet | MARKSHEET | [marksheetGenerator.ts](file:///c:/github/academicuniverse.com/academicuniverse/benchmarks/synthetic-generator/generators/marksheetGenerator.ts) |
| Skill & Degree Certificates | CERTIFICATE / WORKSHOP / INTERNSHIP / HACKATHON | [certificateGenerator.ts](file:///c:/github/academicuniverse.com/academicuniverse/benchmarks/synthetic-generator/generators/certificateGenerator.ts) |
| Consolidated Transcript | TRANSCRIPT | [transcriptGenerator.ts](file:///c:/github/academicuniverse.com/academicuniverse/benchmarks/synthetic-generator/generators/transcriptGenerator.ts) |
| Class & Exam Timetable | TIMETABLE / EXAM_TIMETABLE | [timetableGenerator.ts](file:///c:/github/academicuniverse.com/academicuniverse/benchmarks/synthetic-generator/generators/timetableGenerator.ts) |
| Exam Hall Ticket | ADMIT_CARD | [admitCardGenerator.ts](file:///c:/github/academicuniverse.com/academicuniverse/benchmarks/synthetic-generator/generators/admitCardGenerator.ts) |
| Fee Payment Receipt | FEE_RECEIPT | [feeReceiptGenerator.ts](file:///c:/github/academicuniverse.com/academicuniverse/benchmarks/synthetic-generator/generators/feeReceiptGenerator.ts) |
| Student Identity Card | STUDENT_ID | [studentIdGenerator.ts](file:///c:/github/academicuniverse.com/academicuniverse/benchmarks/synthetic-generator/generators/studentIdGenerator.ts) |

### 3. Pipeline & Validation (`benchmarks/synthetic-generator/pipeline/`)

| Module | File | Purpose |
|:---|:---|:---|
| Ground Truth Builder | [groundTruthBuilder.ts](file:///c:/github/academicuniverse.com/academicuniverse/benchmarks/synthetic-generator/pipeline/groundTruthBuilder.ts) | Generates 100% matching Ground Truth JSON schemas for every PDF |
| Manifest & Report Builder | [manifestBuilder.ts](file:///c:/github/academicuniverse.com/academicuniverse/benchmarks/synthetic-generator/pipeline/manifestBuilder.ts) | Creates `manifest.json`, `metadata.json`, and `generation-report.md` |
| Quality Checker | [qualityChecker.ts](file:///c:/github/academicuniverse.com/academicuniverse/benchmarks/synthetic-generator/pipeline/qualityChecker.ts) | Verifies PDF checksums, GT schema match, document IDs, and file existence |
| Pipeline Orchestrator | [syntheticPipeline.ts](file:///c:/github/academicuniverse.com/academicuniverse/benchmarks/synthetic-generator/pipeline/syntheticPipeline.ts) | Runs end-to-end generation & provides `importToDatasetManager()` |

### 4. CLI, API, UI & Tests

| Component | File | Description |
|:---|:---|:---|
| CLI Tool | [syntheticCli.ts](file:///c:/github/academicuniverse.com/academicuniverse/benchmarks/synthetic-generator/cli/syntheticCli.ts) | Commands: `generate`, `validate`, `import`, `init` |
| Generation API | [route.ts (generate)](file:///c:/github/academicuniverse.com/academicuniverse/app/api/synthetic/generate/route.ts) | POST `/api/synthetic/generate` |
| Import API | [route.ts (import)](file:///c:/github/academicuniverse.com/academicuniverse/app/api/synthetic/import/route.ts) | POST `/api/synthetic/import` |
| Web Dashboard UI | [page.tsx](file:///c:/github/academicuniverse.com/academicuniverse/app/dashboard/student/synthetic-generator/page.tsx) | Parameter controls, category picker, template toggles, generate & import actions |
| Test Suite | [syntheticGenerator.test.ts](file:///c:/github/academicuniverse.com/academicuniverse/benchmarks/synthetic-generator/tests/syntheticGenerator.test.ts) | Seed reproducibility, GT consistency, quality profile, and manifest hash tests |

---

## 🧪 Test Results

```
PASS synthetic-generator/tests/syntheticGenerator.test.ts
PASS dataset-pipeline/tests/datasetPipeline.test.ts
PASS dataset-manager/tests/datasetManager.test.ts
PASS dataset-manager/tests/annotationPlatform.test.ts
PASS tests/benchmark.test.ts

Test Suites: 5 passed, 5 total
Tests:       61 passed, 61 total
Snapshots:   0 total
Time:        4.39 s
```

---

## 🛠️ CLI Quick Reference

```bash
# Generate 50 synthetic documents (Seed: 42)
npm run synthetic:generate -- --count 50 --seed 42

# Validate dataset integrity & GT matching
npm run synthetic:validate

# Import generated dataset into Dataset Manager RAW folder
npm run synthetic:import
```

---

## 🌐 Web UI Path

Navigate to: `http://localhost:3000/dashboard/student/synthetic-generator`
