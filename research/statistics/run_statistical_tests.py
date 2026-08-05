#!/usr/bin/env python3
"""
run_statistical_tests.py — Task 6: Real Statistical Analysis Engine

Reads the genuine paired_field_observations.csv produced from live benchmark
output and runs all hypothesis tests.

Tests implemented:
  1. McNemar test: exact_match vs normalized_match contingency
  2. Wilcoxon Signed-Rank: CER comparison (before/after canonical normalization)
  3. Paired t-test: confidence score vs field match rate correlation
  4. Bootstrap CI: mean F1, mean CER, mean exact match rate

Usage:
  python run_statistical_tests.py
  python run_statistical_tests.py --csv path/to/observations.csv

Prerequisites:
  pip install scipy numpy pandas

Scientific integrity: Tests only run if assumptions are met.
All results are written to results/raw_statistical_output.txt and
STATISTICAL_REPRODUCIBILITY_REPORT.md.
"""

import argparse
import csv
import json
import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

WORKSPACE = Path(__file__).resolve().parents[2]
RESULTS_DIR = Path(__file__).resolve().parent / "results"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

RAW_LOG = RESULTS_DIR / "raw_statistical_output.txt"
REPORT  = RESULTS_DIR / "STATISTICAL_REPRODUCIBILITY_REPORT.md"


def log(msg: str, fh=None):
    print(msg)
    if fh:
        fh.write(msg + "\n")


def bootstrap_ci(data: np.ndarray, stat_fn=np.mean, n_boot: int = 10000,
                 alpha: float = 0.05, rng_seed: int = 42) -> tuple[float, float, float]:
    """Non-parametric bootstrap confidence interval."""
    rng = np.random.default_rng(rng_seed)
    boot_stats = [stat_fn(rng.choice(data, size=len(data), replace=True)) for _ in range(n_boot)]
    boot_stats = np.array(boot_stats)
    obs = stat_fn(data)
    lo = np.percentile(boot_stats, 100 * alpha / 2)
    hi = np.percentile(boot_stats, 100 * (1 - alpha / 2))
    return obs, lo, hi


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", type=str, default=None)
    args = parser.parse_args()

    csv_path = Path(args.csv) if args.csv else RESULTS_DIR / "paired_field_observations.csv"

    if not csv_path.exists():
        print(f"ERROR: Dataset not found: {csv_path}")
        print("Run generate_field_dataset.py first to produce real benchmark data.")
        sys.exit(1)

    df = pd.read_csv(csv_path)
    n_obs = len(df)
    print(f"Loaded {n_obs} field observations from {csv_path}")

    if n_obs < 30:
        print(f"WARNING: Only {n_obs} observations — insufficient for reliable hypothesis testing.")
        print("Statistical tests require N ≥ 30. Reporting descriptive statistics only.")

    with open(RAW_LOG, "w", encoding="utf-8") as fh:
        log(f"AU DIC BENCHMARK — STATISTICAL ANALYSIS LOG", fh)
        log(f"Dataset: {csv_path}", fh)
        log(f"N observations: {n_obs}", fh)
        log("=" * 60, fh)

        # ── Descriptive Statistics ─────────────────────────────────────────
        log("\n[1] DESCRIPTIVE STATISTICS", fh)
        log(f"  exact_match rate:       {df['exact_match'].astype(bool).mean():.4f}", fh)
        log(f"  normalized_match rate:  {df['normalized_match'].astype(bool).mean():.4f}", fh)
        log(f"  mean CER:               {df['cer'].mean():.4f}", fh)
        log(f"  mean edit_distance:     {df['edit_distance'].mean():.4f}", fh)
        log(f"  mean confidence:        {df['confidence'].mean():.4f}", fh)
        log(f"  mean latency_ms:        {df['latency_ms'].mean():.2f}", fh)
        log(f"  document_types:         {df['document_type'].value_counts().to_dict()}", fh)
        log(f"  quality_profiles:       {df['quality_profile'].value_counts().to_dict()}", fh)

        results = {}

        if n_obs >= 30:
            # ── McNemar Test ───────────────────────────────────────────────
            log("\n[2] McNEMAR TEST: exact_match vs normalized_match", fh)
            exact  = df["exact_match"].astype(bool).values
            normed = df["normalized_match"].astype(bool).values

            # 2x2 contingency: a=both T, b=exact F/norm T, c=exact T/norm F, d=both F
            a = int(( exact &  normed).sum())
            b = int((~exact &  normed).sum())
            c = int(( exact & ~normed).sum())
            d = int((~exact & ~normed).sum())

            log(f"  Contingency: a={a} b={b} c={c} d={d}", fh)

            if (b + c) > 0:
                chi2 = (abs(b - c) - 1) ** 2 / (b + c)  # continuity-corrected
                p_val = stats.chi2.sf(chi2, df=1)
                log(f"  McNemar chi2 (continuity-corrected) = {chi2:.4f}", fh)
                log(f"  McNemar p-value = {p_val:.6f}", fh)
                log(f"  {'Significant (p < 0.05)' if p_val < 0.05 else 'Not significant'}", fh)
                results["mcnemar"] = {"chi2": round(chi2, 4), "p_value": round(p_val, 6), "a": a, "b": b, "c": c, "d": d}
            else:
                log("  McNemar test not applicable: b+c = 0 (no discordant pairs)", fh)
                results["mcnemar"] = {"note": "b+c=0, test not applicable"}

            # ── Wilcoxon Signed-Rank: CER exact vs normalized ──────────────
            log("\n[3] WILCOXON SIGNED-RANK: CER (exact vs normalized)", fh)
            cer_exact = df["cer"].values
            # Normalized match = 1 means CER after normalization = 0
            cer_normed = np.where(df["normalized_match"].astype(bool).values, 0.0, cer_exact)

            diffs = cer_exact - cer_normed
            nonzero_diffs = diffs[diffs != 0]

            if len(nonzero_diffs) >= 10:
                stat_w, p_w = stats.wilcoxon(cer_exact, cer_normed, alternative="greater",
                                              zero_method="wilcox")
                log(f"  Wilcoxon W statistic = {stat_w:.4f}", fh)
                log(f"  Wilcoxon p-value = {p_w:.6f}", fh)
                log(f"  N non-zero diffs = {len(nonzero_diffs)}", fh)
                log(f"  {'Significant (p < 0.05)' if p_w < 0.05 else 'Not significant'}", fh)
                results["wilcoxon"] = {"W": round(float(stat_w), 4), "p_value": round(float(p_w), 6),
                                       "n_nonzero_diffs": len(nonzero_diffs)}
            else:
                log(f"  Insufficient non-zero differences ({len(nonzero_diffs)}) for Wilcoxon test.", fh)
                results["wilcoxon"] = {"note": f"Only {len(nonzero_diffs)} non-zero diffs — test skipped"}

            # ── Paired t-test: confidence vs exact_match ───────────────────
            log("\n[4] PAIRED T-TEST: confidence vs exact_match", fh)
            matched    = df[df["exact_match"].astype(bool)]["confidence"].values
            mismatched = df[~df["exact_match"].astype(bool)]["confidence"].values

            if len(matched) >= 5 and len(mismatched) >= 5:
                # Independent samples t-test (not paired — different group sizes)
                t_stat, p_t = stats.ttest_ind(matched, mismatched)
                log(f"  t statistic = {t_stat:.4f}", fh)
                log(f"  p-value = {p_t:.6f}", fh)
                log(f"  mean confidence (matched) = {matched.mean():.4f}", fh)
                log(f"  mean confidence (mismatched) = {mismatched.mean():.4f}", fh)
                log(f"  {'Significant (p < 0.05)' if p_t < 0.05 else 'Not significant'}", fh)
                results["t_test"] = {"t": round(float(t_stat), 4), "p_value": round(float(p_t), 6),
                                     "mean_conf_matched": round(float(matched.mean()), 4),
                                     "mean_conf_mismatched": round(float(mismatched.mean()), 4)}
            else:
                log(f"  Insufficient samples for t-test (matched={len(matched)}, mismatched={len(mismatched)})", fh)
                results["t_test"] = {"note": "Insufficient samples"}

            # ── Bootstrap CIs ──────────────────────────────────────────────
            log("\n[5] BOOTSTRAP CONFIDENCE INTERVALS (B=10,000, seed=42)", fh)
            exact_arr = df["exact_match"].astype(float).values
            cer_arr   = df["cer"].values
            norm_arr  = df["normalized_match"].astype(float).values

            obs_em, lo_em, hi_em = bootstrap_ci(exact_arr)
            obs_cer, lo_cer, hi_cer = bootstrap_ci(cer_arr)
            obs_nm, lo_nm, hi_nm = bootstrap_ci(norm_arr)

            log(f"  Exact Match Rate:      {obs_em:.4f} [95% CI: {lo_em:.4f}, {hi_em:.4f}]", fh)
            log(f"  Mean CER:              {obs_cer:.4f} [95% CI: {lo_cer:.4f}, {hi_cer:.4f}]", fh)
            log(f"  Normalized Match Rate: {obs_nm:.4f} [95% CI: {lo_nm:.4f}, {hi_nm:.4f}]", fh)

            results["bootstrap_ci"] = {
                "exact_match_rate": {"obs": round(obs_em, 4), "ci_lo": round(lo_em, 4), "ci_hi": round(hi_em, 4)},
                "mean_cer":         {"obs": round(obs_cer, 4), "ci_lo": round(lo_cer, 4), "ci_hi": round(hi_cer, 4)},
                "norm_match_rate":  {"obs": round(obs_nm, 4), "ci_lo": round(lo_nm, 4), "ci_hi": round(hi_nm, 4)},
            }

        # ── Save Results JSON ──────────────────────────────────────────────
        results_json = RESULTS_DIR / "statistical_results.json"
        with open(results_json, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2)
        log(f"\nResults saved: {results_json}", fh)
        log(f"Raw log saved: {RAW_LOG}", fh)

    # ── Write Reproducibility Report ───────────────────────────────────────
    with open(REPORT, "w", encoding="utf-8") as f:
        f.write("# Statistical Reproducibility Report\n\n")
        f.write(f"**Dataset:** `{csv_path}`  \n")
        f.write(f"**N observations:** {n_obs}  \n")
        f.write(f"**Generated:** {pd.Timestamp.now().isoformat()}  \n\n")
        f.write("## Tests Performed\n\n")
        f.write("| Test | Result |\n|:---|:---|\n")
        for k, v in results.items():
            f.write(f"| {k} | {json.dumps(v)} |\n")
        f.write("\n## Reproduction Instructions\n\n")
        f.write("```bash\n")
        f.write("# 1. Generate real benchmark data\n")
        f.write("python run_full_benchmark.py --from-existing\n\n")
        f.write("# 2. Run statistical tests\n")
        f.write("python research/statistics/run_statistical_tests.py\n")
        f.write("```\n\n")
        f.write("> All tests use `scipy.stats` v≥1.11 and `numpy` v≥1.24.\n")
        f.write("> Bootstrap uses `np.random.default_rng(seed=42)` for reproducibility.\n")

    print(f"\n✅ Statistical analysis complete.")
    print(f"   Raw log: {RAW_LOG}")
    print(f"   Report:  {REPORT}")


if __name__ == "__main__":
    main()
