# Academic Universe — Dataset & Ground Truth Guide (Phase 4B)

**Purpose:** Comprehensive architectural specification, annotation guidelines, quality assurance procedures, and CLI documentation for the Dataset & Ground Truth Preparation Pipeline.

---

## Directory Architecture

```
benchmarks/
├── dataset-pipeline/
│   ├── types/
│   │   └── dataset.types.ts       ← TypeScript interfaces for metadata, GT, manifests
│   ├── schemas/
│   │   └── groundTruth.schema.ts  ← JSON Schema (Draft-07) & blank GT generator
│   ├── importer/
│   │   └── datasetImporter.ts     ← Canonical ID assignment, checksum, duplication check
│   ├── validation/
│   │   └── datasetValidator.ts    ← Schema validation, file integrity, checksum audits
│   ├── annotations/
│   │   └── annotationManager.ts   ← Life-cycle manager, double annotation, IAA (Cohen's Kappa)
│   ├── privacy/
│   │   └── piiManager.ts          ← Pattern matching, masking, consent validation
│   ├── versioning/
│   │   └── datasetSnapshotManager.ts ← Snapshot history, rollbacks, version tags
│   ├── reporting/
│   │   └── datasetReporter.ts     ← Publication Markdown exporter & QA summary reports
│   ├── cli/
│   │   └── datasetCli.ts          ← Dedicated CLI binary for dataset operations
│   ├── tests/
│   │   └── datasetPipeline.test.ts← Jest test suite
│   ├── manifests/
│   │   └── dataset_manifest.json  ← Central dataset catalog
│   ├── metadata/                  ← Per-document JSON metadata
│   ├── reports/                   ← Exported markdown & JSON reports
│   └── versions/                  ← Snapshot archives
```

---

## Workflow Guide

### Step 1: Initialize Pipeline
```bash
npx ts-node benchmarks/dataset-pipeline/cli/datasetCli.ts init
```

### Step 2: Import Source Documents
```bash
# Single document import
npx ts-node benchmarks/dataset-pipeline/cli/datasetCli.ts import \
  --source path/to/transcript.pdf \
  --category MARKSHEET \
  --quality HIGH \
  --origin "University A" \
  --consent SYNTHETIC \
  --annotator A1

# Directory batch import
npx ts-node benchmarks/dataset-pipeline/cli/datasetCli.ts import \
  --source path/to/certificates_folder/ \
  --category CERTIFICATE \
  --quality SCANNED \
  --origin "University B" \
  --consent ANONYMIZED \
  --annotator A2
```

### Step 3: Annotation & Verification
1. Annotators open the generated JSON file in `benchmarks/ground-truth/<documentId>.json`.
2. Fill in extracted candidate fields matching the original document image.
3. Submit or verify annotations via CLI:
```bash
# Check pending or conflicting annotations
npx ts-node benchmarks/dataset-pipeline/cli/datasetCli.ts annotate

# Verify document annotation (second-pass approval)
npx ts-node benchmarks/dataset-pipeline/cli/datasetCli.ts annotate --id MS_TESTUN_001 --verify --verifier V1
```

### Step 4: Quality Assurance & Validation
```bash
# Validate manifest integrity, file checksums, and schema correctness
npx ts-node benchmarks/dataset-pipeline/cli/datasetCli.ts validate

# Run QA progress analysis
npx ts-node benchmarks/dataset-pipeline/cli/datasetCli.ts qa
```

### Step 5: Version Snapshot & Export
```bash
# Create immutable dataset snapshot tag
npx ts-node benchmarks/dataset-pipeline/cli/datasetCli.ts snapshot --version-tag 1.0.0 --notes "Initial 500-doc dataset complete"

# Export publication Markdown table (Table III in paper)
npx ts-node benchmarks/dataset-pipeline/cli/datasetCli.ts report
```

---

## Inter-Annotator Agreement (IAA) Protocol

For critical academic marksheets:
1. Annotator A completes primary annotation in `ground-truth/<documentId>.json`.
2. Annotator B completes independent second-pass in `dataset-pipeline/annotations/second-pass/<documentId>.json`.
3. `AnnotationManager.computeIAA(documentId)` evaluates **Cohen's Kappa ($\kappa$)**.
4. If $\kappa < 0.90$, the document is automatically flagged with `annotationStatus: "CONFLICT"` and assigned to a Lead Verifier for tie-breaking.

---

## PII & Research Ethics Policy

- **Synthetic Samples**: All initial pilot marksheets are generated synthetically using randomized names, roll numbers, and grades.
- **Anonymization**: If real institutional documents are used under research consent, all student names are scrubbed or masked (`[STUDENT_NAME_REDACTED]`), and Aadhaar/mobile numbers are redacted via `PIIManager.maskText()`.
- **Git Safety**: Ground-truth JSON files containing annotation details and raw document files are strictly gitignored via `.gitignore`.
