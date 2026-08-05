# Statistical Reproducibility Report

**Dataset:** `C:\github\academicuniverse.com\academicuniverse\research\statistics\results\paired_field_observations.csv`  
**N observations:** 24480  
**Generated:** 2026-08-06T02:21:32.339286  

## Tests Performed

| Test | Result |
|:---|:---|
| mcnemar | {"chi2": 21736.0, "p_value": 0.0, "a": 2742, "b": 21738, "c": 0, "d": 0} |
| wilcoxon | {"note": "Only 0 non-zero diffs \u2014 test skipped"} |
| t_test | {"t": 10.116, "p_value": 0.0, "mean_conf_matched": 17.6685, "mean_conf_mismatched": 11.2862} |
| bootstrap_ci | {"exact_match_rate": {"obs": 0.112, "ci_lo": 0.1081, "ci_hi": 0.116}, "mean_cer": {"obs": 0.0, "ci_lo": 0.0, "ci_hi": 0.0}, "norm_match_rate": {"obs": 1.0, "ci_lo": 1.0, "ci_hi": 1.0}} |

## Reproduction Instructions

```bash
# 1. Generate real benchmark data
python run_full_benchmark.py --from-existing

# 2. Run statistical tests
python research/statistics/run_statistical_tests.py
```

> All tests use `scipy.stats` v≥1.11 and `numpy` v≥1.24.
> Bootstrap uses `np.random.default_rng(seed=42)` for reproducibility.
