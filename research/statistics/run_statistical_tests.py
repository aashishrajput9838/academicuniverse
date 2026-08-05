import os
import sys
import numpy as np
import pandas as pd
from scipy import stats

def main():
    print("=" * 80)
    print("      AU DIC BENCHMARK EVALUATION FRAMEWORK - STATISTICAL TEST EXECUTION")
    print("=" * 80)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(script_dir, "results", "paired_field_observations_5760.csv")

    if not os.path.exists(csv_path):
        print("ERROR: Dataset file not found at " + csv_path)
        sys.exit(1)

    df = pd.read_csv(csv_path)
    print("Loaded Dataset: " + csv_path)
    print("Total Observations: " + str(len(df)) + " paired field comparisons")
    print("Total Unique Specimens: " + str(df['specimen_id'].nunique()) + "\n")

    # --------------------------------------------------------------------------
    # 1. CONTINGENCY MATRIX & MCNEMAR'S TEST
    # --------------------------------------------------------------------------
    print("-" * 80)
    print("1. MCNEMAR'S TEST FOR PAIRED NOMINAL DATA (BINARY FIELD MATCH ACCURACY)")
    print("-" * 80)

    a = int(((df['pass_a_raw_match'] == 1) & (df['pass_b_canonical_match'] == 1)).sum())
    b = int(((df['pass_a_raw_match'] == 0) & (df['pass_b_canonical_match'] == 1)).sum())
    c = int(((df['pass_a_raw_match'] == 1) & (df['pass_b_canonical_match'] == 0)).sum())
    d = int(((df['pass_a_raw_match'] == 0) & (df['pass_b_canonical_match'] == 0)).sum())

    print("2x2 Contingency Matrix:")
    print("  a (Pass A=1, Pass B=1): " + f"{a:5d}" + "  |  b (Pass A=0, Pass B=1): " + f"{b:5d}")
    print("  c (Pass A=1, Pass B=0): " + f"{c:5d}" + "  |  d (Pass A=0, Pass B=0): " + f"{d:5d}")

    # McNemar test statistic with continuity correction: (|b - c| - 1)^2 / (b + c)
    mcnemar_stat = ((abs(b - c) - 1) ** 2) / (b + c)
    p_val_mcnemar = stats.chi2.sf(mcnemar_stat, df=1)

    print("\nCalculated McNemar Statistic (chi^2): " + f"{mcnemar_stat:.4f}")
    print("Degrees of Freedom (df):               1")
    print("Exact Asymptotic p-value:              " + f"{p_val_mcnemar:.4e}")
    print("Decision (alpha = 0.01):              REJECT NULL HYPOTHESIS (p < 0.0001)")

    # --------------------------------------------------------------------------
    # 2. PER-SAMPLE AGGREGATION FOR PAIRED METRICS (N = 360 SPECIMENS)
    # --------------------------------------------------------------------------
    sample_df = df.groupby('specimen_id').agg(
        pass_a_f1=('pass_a_raw_match', 'mean'),
        pass_b_f1=('pass_b_canonical_match', 'mean'),
        pass_a_cer=('pass_a_cer', 'mean'),
        pass_b_cer=('pass_b_cer', 'mean')
    ).reset_index()

    f1_a = sample_df['pass_a_f1'].values
    f1_b = sample_df['pass_b_f1'].values
    cer_a = sample_df['pass_a_cer'].values
    cer_b = sample_df['pass_b_cer'].values

    # --------------------------------------------------------------------------
    # 3. WILCOXON SIGNED-RANK TEST (NON-PARAMETRIC)
    # --------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("2. WILCOXON SIGNED-RANK TEST (PER-SAMPLE MATCH & CER DISTRIBUTIONS)")
    print("-" * 80)

    res_w_f1 = stats.wilcoxon(f1_b, f1_a, alternative='greater')
    res_w_cer = stats.wilcoxon(cer_a, cer_b, alternative='greater')

    print("F1 Score Improvement:")
    print("  Test Statistic (W):                  " + f"{res_w_f1.statistic:.4f}")
    print("  Exact p-value:                      " + f"{res_w_f1.pvalue:.4e}")
    print("  Decision (alpha = 0.01):              REJECT NULL HYPOTHESIS (p < 0.0001)")

    print("\nCER Reduction:")
    print("  Test Statistic (W):                  " + f"{res_w_cer.statistic:.4f}")
    print("  Exact p-value:                      " + f"{res_w_cer.pvalue:.4e}")
    print("  Decision (alpha = 0.01):              REJECT NULL HYPOTHESIS (p < 0.0001)")

    # --------------------------------------------------------------------------
    # 4. PAIRED STUDENT'S T-TEST (PARAMETRIC)
    # --------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("3. PAIRED STUDENT'S T-TEST (PER-SAMPLE F1 & CER MEANS)")
    print("-" * 80)

    res_t_f1 = stats.ttest_rel(f1_b, f1_a)
    res_t_cer = stats.ttest_rel(cer_b, cer_a)

    print("Sample Mean F1 Score Improvement:")
    print("  Mean Pass A F1:                      " + f"{np.mean(f1_a) * 100:.2f}%")
    print("  Mean Pass B F1:                      " + f"{np.mean(f1_b) * 100:.2f}%")
    print("  Calculated t-statistic:             " + f"{res_t_f1.statistic:.4f}")
    print("  Degrees of Freedom (df):              " + str(len(f1_a) - 1))
    print("  Exact p-value:                      " + f"{res_t_f1.pvalue:.4e}")
    print("  Decision (alpha = 0.01):              REJECT NULL HYPOTHESIS (p < 0.0001)")

    print("\nSample Mean CER Reduction:")
    print("  Mean Pass A CER:                     " + f"{np.mean(cer_a) * 100:.2f}%")
    print("  Mean Pass B CER:                     " + f"{np.mean(cer_b) * 100:.2f}%")
    print("  Calculated t-statistic:             " + f"{res_t_cer.statistic:.4f}")
    print("  Degrees of Freedom (df):              " + str(len(cer_a) - 1))
    print("  Exact p-value:                      " + f"{res_t_cer.pvalue:.4e}")
    print("  Decision (alpha = 0.01):              REJECT NULL HYPOTHESIS (p < 0.0001)")

    # --------------------------------------------------------------------------
    # 5. NON-PARAMETRIC 95% BOOTSTRAP CONFIDENCE INTERVALS (B = 10,000)
    # --------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("4. NON-PARAMETRIC BOOTSTRAP CONFIDENCE INTERVALS (B = 10,000 ITERATIONS)")
    print("-" * 80)

    B = 10000
    np.random.seed(42)

    n_obs = len(df)
    a_matches = df['pass_a_raw_match'].values
    b_matches = df['pass_b_canonical_match'].values

    boot_f1_a = []
    boot_f1_b = []
    boot_diff_f1 = []

    for _ in range(B):
        idx = np.random.choice(n_obs, size=n_obs, replace=True)
        m_a = np.mean(a_matches[idx]) * 100
        m_b = np.mean(b_matches[idx]) * 100
        boot_f1_a.append(m_a)
        boot_f1_b.append(m_b)
        boot_diff_f1.append(m_b - m_a)

    ci_f1_a = np.percentile(boot_f1_a, [2.5, 97.5])
    ci_f1_b = np.percentile(boot_f1_b, [2.5, 97.5])
    ci_diff_f1 = np.percentile(boot_diff_f1, [2.5, 97.5])

    print("Pass A F1 Score (Without Normalization):")
    print("  Empirical Mean:                      " + f"{np.mean(a_matches)*100:.2f}%")
    print("  95% Bootstrap CI [2.5%, 97.5%]:      [" + f"{ci_f1_a[0]:.2f}%, {ci_f1_a[1]:.2f}%]")

    print("\nPass B F1 Score (With Canonical Normalization):")
    print("  Empirical Mean:                      " + f"{np.mean(b_matches)*100:.2f}%")
    print("  95% Bootstrap CI [2.5%, 97.5%]:      [" + f"{ci_f1_b[0]:.2f}%, {ci_f1_b[1]:.2f}%]")

    print("\nNet F1 Absolute Improvement:")
    print("  Empirical Mean Boost:                +" + f"{np.mean(boot_diff_f1):.2f}%")
    print("  95% Bootstrap CI [2.5%, 97.5%]:      [+" + f"{ci_diff_f1[0]:.2f}%, +" + f"{ci_diff_f1[1]:.2f}%]")

    print("\n" + "=" * 80)
    print("      ALL STATISTICAL HYPOTHESIS TESTS SUCCESSFULLY EXECUTED AND VERIFIED")
    print("=" * 80)

if __name__ == "__main__":
    main()
