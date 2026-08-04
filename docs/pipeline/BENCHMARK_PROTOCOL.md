# AU DIC Benchmark Execution Protocol — Version 1.0

**Document Version**: 1.0.0  
**Status**: **FROZEN & VERIFIED**  

---

## 1. Execution Specification

- **Dataset Target**: `AU_DIC_Benchmark_v1.0`
- **Dataset SHA-256 Hash**: `17c136ef76dd0f82`
- **Git Commit Hash**: `823334b`
- **Benchmark Engine**: `BenchmarkRunner.ts` (Subsystem: `backend/src/benchmark/`)
- **Evaluation Isolation**: Strictly Read-Only (0 MongoDB writes).

---

## 2. Checkpoint & Failure Archiving Protocols

- **Checkpoint Protocol**: Writes `checkpoint.json` after every 10 samples processed. If execution fails, `BenchmarkRunner` reads `completedSampleIds` and resumes from sample $N+1$.
- **Archiving Protocol**: Any sample encountering an unhandled exception is automatically archived to `failed_samples/<sample_id>_error.log` with complete stack trace and specimen path metadata.

---

## 3. Reproducibility Protocol

1. Seed deterministic PRNG initialization (`seed = 42`).
2. Environment verification (capture OS version, Node.js version, CPU topology, RAM).
3. Compute SHA-256 dataset hash before and after execution to confirm 100% read-only integrity.
