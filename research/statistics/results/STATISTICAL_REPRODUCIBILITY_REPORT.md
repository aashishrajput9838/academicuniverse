# Statistical Reproducibility Report

**Dataset:** `C:\github\academicuniverse.com\academicuniverse\research\statistics\results\paired_field_observations.csv`  
**N observations:** 24480  
**Generated:** 2026-08-06T03:20:49.758496  

## Tests Performed

| Test | Result |
|:---|:---|
| mcnemar | {"chi2": 165.006, "p_value": 0.0, "a": 2487, "b": 167, "c": 0, "d": 21826} |
| wilcoxon | {"W": 14028.0, "p_value": 0.0, "n_nonzero_diffs": 167} |
| t_test | {"t": 11.2039, "p_value": 0.0, "mean_conf_matched": 18.6274, "mean_conf_mismatched": 11.2517} |
| bootstrap_ci | {"exact_match_rate": {"obs": 0.1016, "ci_lo": 0.0978, "ci_hi": 0.1054}, "mean_cer": {"obs": 0.8927, "ci_lo": 0.8883, "ci_hi": 0.8969}, "norm_match_rate": {"obs": 0.1084, "ci_lo": 0.1045, "ci_hi": 0.1124}} |

## Reproduction Instructions

```bash
# 1. Generate real benchmark data
python run_full_benchmark.py --from-existing

# 2. Run statistical tests
python research/statistics/run_statistical_tests.py
```

> All tests use `scipy.stats` v≥1.11 and `numpy` v≥1.24.
> Bootstrap uses `np.random.default_rng(seed=42)` for reproducibility.
