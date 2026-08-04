# Known Limitations — AU DIC & ADBG v1.0

The following technical and methodological limitations are documented for full scientific transparency:

---

## 1. Dataset & Synthetic Generation Limitations

1. **Synthetic Data Bias**: ADBG v1.0 generates synthetic academic documents based on Typst PDF templates and fictional university catalogs. While rendered with realistic fonts and logos, synthetic layouts may not capture every legacy physical paper layout encountered in historical registrar archives.
2. **Language Scope**: ADBG v1.0 currently generates documents in English (`en_IN`). Multi-lingual documents featuring vernacular scripts (e.g. Hindi, Tamil, Bengali) are not currently included in v1.0.
3. **Document Categories**: The dataset covers 3 primary academic document types (*Degree Certificates*, *Marksheets*, *Student ID Cards*). Transcripts from non-degree diploma courses or high school boards are outside the current dataset scope.

---

## 2. Benchmark Subsystem & Hardware Constraints

1. **Hardware-Dependent Latency**: Execution latency (`ms/sample`) and throughput (`samples/sec`) depend on local CPU core counts and GPU hardware acceleration during vision OCR steps.
2. **Mock AI Provider Fallback**: In offline development environments lacking active Gemini API keys, the benchmark pipeline falls back to deterministic rule-based dry-runs.
