# Reproducibility Guide — AU DIC Benchmark v1.0

This guide provides step-by-step instructions to independently replicate dataset generation and reproduce benchmark evaluation runs.

---

## 1. System Requirements & Environment Setup

- **Operating System**: Linux (Ubuntu 22.04 LTS), macOS, or Windows 11.
- **Node.js**: v18.x or v20.x (npm v9.x+).
- **Python**: v3.10 or v3.11 (pip v23.x+).
- **Typst Compiler**: v0.11+ (for PDF generation).

---

## 2. Replicating ADBG v1.0 Dataset Generation

1. Navigate to the ADBG root directory:
   ```bash
   cd ADBG
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the Pytest test suite to verify generator determinism:
   ```bash
   python -m pytest tests/
   ```
4. Regenerate the benchmark dataset with seed `42`:
   ```bash
   python -m adbg.cli generate --seed 42 --count 30 --output AU_DIC_Benchmark_v1.0
   ```

---

## 3. Replicating AU DIC Benchmark Evaluation Run

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install Node.js dependencies:
   ```bash
   npm install
   ```
3. Execute the Jest unit test suite:
   ```bash
   npx jest --runInBand src/benchmark/__tests__
   ```
4. Execute the full read-only 360-sample benchmark run:
   ```bash
   npx tsx src/benchmark/runner/runFullBenchmark.ts
   ```

---

## 4. Verification of Output Artifacts

Upon completion, verify the generated report directory under `backend/benchmark_reports/run_<timestamp>/`:
- Compare `reproducibility.json` SHA-256 hash against target `17c136ef76dd0f82`.
- Check `certification.md` to confirm `PASSED (CERTIFIED RC1)` status.
