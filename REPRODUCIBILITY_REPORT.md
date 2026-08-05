# REPRODUCIBILITY REPORT: AU DIC BENCHMARK v1.0

**Repository:** `https://github.com/aashishrajput9838/academicuniverse.git`  
**Branch:** `main`  
**Pipeline Entry Point:** `python run_full_benchmark.py`  
**Environment Requirements:** Node.js v18+, Python 3.10+, Groq API Key  

---

## 1. Single-Command Reproduction Protocol

To reproduce the entire benchmark evaluation from scratch:

```bash
# 1. Clone repository & install dependencies
git clone https://github.com/aashishrajput9838/academicuniverse.git
cd academicuniverse
npm install
pip install -r requirements.txt

# 2. Set environment variable (Groq Cloud API Key)
export GROQ_API_KEY="your_groq_api_key"

# 3. Execute single-command full benchmark pipeline
python run_full_benchmark.py
```

---

## 2. Pipeline Execution Steps

When `python run_full_benchmark.py` is invoked, it sequentially executes:

1. **Ground Truth Verification:** Inspects `ADBG/AU_DIC_Benchmark_v1.0/groundtruth/` to confirm 360 per-profile GT JSON files exist (generated deterministically with seed `42`).
2. **TypeScript Compilation:** Verifies `backend/src` with `npx tsc --noEmit`.
3. **Live Model Inference:** Executes `backend/src/benchmark/runner/run_live_benchmark.ts` using live Groq `llama-3.1-8b-instant` inference with strict `allowMockFallback: false`.
4. **Dataset Export:** Runs `research/statistics/generate_field_dataset.py` to extract `paired_field_observations.csv` from real output logs.
5. **Statistical Hypothesis Testing:** Runs `research/statistics/run_statistical_tests.py` computing McNemar $\chi^2$, Wilcoxon $W$, and $B=10,000$ bootstrap CIs.
6. **Artifact Generation:** Runs `research/statistics/generate_paper_artifacts.py` producing LaTeX tables and PNG confusion matrices.

---

## 3. Hardware & Software Requirements

- **Python Version:** 3.10.x
- **Node.js Version:** v18.x or v20.x
- **Python Libraries:** `scipy>=1.11`, `numpy>=1.24`, `pandas>=2.0`, `matplotlib>=3.7`
- **Network Access:** HTTPS outbound to `api.groq.com`
