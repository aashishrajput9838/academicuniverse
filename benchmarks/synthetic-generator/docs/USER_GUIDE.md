# Synthetic Academic Document Generator — User Guide

## Overview

The **Synthetic Generator** enables researchers to generate deterministic, multi-category academic datasets with perfect ground-truth metadata for benchmark evaluation.

---

## Web UI Usage

1. Open Academic Universe in your browser.
2. Navigate to **Research Dataset** → **Synthetic Dataset Generator** (`/dashboard/student/synthetic-generator`).
3. Select your target parameters:
   - **Document Count** (e.g. 25, 50, 100, 250, 500)
   - **Random Seed** (default: `42`)
   - **Document Categories** (Marksheets, Certificates, Transcripts, Timetables, Admit Cards, Fee Receipts, Student IDs)
   - **University Templates** (VTU, SRIT, NIES, IGCE)
4. Click **Generate Dataset**.
5. Once completed, review the generated manifest summary and click **Import into Dataset Manager** to register the generated files for benchmarking.

---

## Command Line Usage (CLI)

From the `benchmarks/` directory:

```bash
# Generate 50 synthetic documents using Seed 42
npm run synthetic:generate -- --count 50 --seed 42

# Generate documents for a specific category
npm run synthetic:generate -- --count 20 --category MARKSHEET

# Validate dataset integrity & ground truth JSON matching
npm run synthetic:validate

# Import synthetic dataset into the Dataset Manager RAW directory
npm run synthetic:import
```

---

## Research Transparency & Fictional Data

All generated documents are clearly marked with a diagonal watermark: `SYNTHETIC RESEARCH DATASET` and a footer disclaimer. All university names, student names, and logos are strictly fictional.
