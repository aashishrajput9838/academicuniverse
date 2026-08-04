# OFFICIAL REPRODUCIBILITY GUIDE

**Benchmark Version**: `AU_DIC_Benchmark_v1.0`  
**Dataset SHA-256 Hash**: `17c136ef76dd0f82`  
**Target Environment**: Node.js v18.0+ | Python 3.10+ | Typst v0.11+

---

## 1. System Environment Setup

```bash
# 1. Clone repository
git clone https://github.com/aashishrajput9838/academicuniverse.git
cd academicuniverse

# 2. Install backend dependencies
npm install

# 3. Install Python dependencies
pip install -r requirements.txt
```

---

## 2. Reproducing Synthetic Benchmark Generation (ADBG v1.0)

To regenerate the 360 benchmark document specimens with pixel-exact deterministic reproducibility:

```bash
npm run benchmark:generate
```

- **Output Directory**: `ADBG/AU_DIC_Benchmark_v1.0/`
- **Specimens Produced**: 360 PDFs/PNGs across 4 optical profiles (`clean`, `scanner_copy`, `mobile_camera`, `rotated_90`).
- **Dataset Hash Verification**:
  ```bash
  python -c "import hashlib, glob; print(hashlib.sha256(b''.join(open(f,'rb').read() for f in sorted(glob.glob('ADBG/**/*.json', recursive=True)))).hexdigest()[:16])"
  # Output MUST match: 17c136ef76dd0f82
  ```

---

## 3. Reproducing Live Neural Model Evaluation

To execute live model evaluation using Groq Cloud Llama 3.1 8B Instant (`allowMockFallback: false`):

```bash
# Set your API key
$env:GROQ_API_KEY="your_groq_api_key_here"

# Execute live benchmark evaluation
npm run benchmark:run
```

---

## 4. Reproducing Empirical Ablation Study & Statistical Tests

To run the two-pass ablation study, statistical hypothesis tests (McNemar, Wilcoxon, Paired t-test), and 95% bootstrap confidence interval resampling:

```bash
# 1. Run two-pass ablation study and generate publication figures
python backend/src/benchmark/utils/run_normalization_ablation.py

# 2. Run statistical significance tests & bootstrap resampling
python backend/src/benchmark/utils/run_statistical_analysis.py
```

All metric outputs match the tables in Section 7 of `Paper_V3.md`.
