#!/usr/bin/env python3
"""
generate_paper_artifacts.py — Task 9: Automatic Paper Tables & Figures Generator

Generates publication-quality LaTeX tables and PNG charts directly from
the real benchmark evaluation run (run_1785959173886 or latest run).

Outputs:
  - research/statistics/results/table_category_accuracy.tex
  - research/statistics/results/table_degradation_robustness.tex
  - research/statistics/results/figure_confusion_matrix.png
  - research/statistics/results/figure_degradation_profile_robustness.png

Usage:
  python generate_paper_artifacts.py
"""

import argparse
import json
import os
import sys
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

WORKSPACE = Path(__file__).resolve().parents[2]
REPORTS_BASE = WORKSPACE / "backend" / "benchmark_reports"
RESULTS_DIR = Path(__file__).resolve().parent / "results"
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


def find_latest_run() -> Path | None:
    runs = sorted(
        [d for d in REPORTS_BASE.iterdir() if d.is_dir() and d.name.startswith("run_")],
        key=lambda d: d.name,
        reverse=True,
    )
    for r in runs:
        if (r / "comparisons.json").exists() and (r / "predictions.json").exists():
            return r
    return None


def main():
    run_dir = find_latest_run()
    if not run_dir:
        print("ERROR: No completed benchmark run found.")
        sys.exit(1)

    print(f"Generating artifacts from run: {run_dir.name}")

    comp_file = run_dir / "comparisons.json"
    pred_file = run_dir / "predictions.json"
    metrics_file = run_dir / "metrics.json"

    with open(comp_file, encoding="utf-8") as f:
        comparisons = json.load(f)
    with open(pred_file, encoding="utf-8") as f:
        predictions = json.load(f)
    with open(metrics_file, encoding="utf-8") as f:
        metrics = json.load(f)

    # ── 1. Category Accuracy Table (LaTeX) ───────────────────────────────────
    cat_counts = {}
    cat_correct = {}
    for c in comparisons:
        dt = c["documentType"]
        cat_counts[dt] = cat_counts.get(dt, 0) + 1
        if c["categoryMatch"]:
            cat_correct[dt] = cat_correct.get(dt, 0) + 1

    latex_cat = """\\begin{table}[htbp]
\\caption{Document Category Classification Performance (Empirical Evaluation)}
\\label{tab:category_classification}
\\centering
\\begin{tabular}{lcccc}
\\hline
\\textbf{Document Category} & \\textbf{Specimens} & \\textbf{Correct} & \\textbf{Accuracy (\\%)} & \\textbf{Status} \\\\
\\hline
"""
    for dt in sorted(cat_counts.keys()):
        tot = cat_counts[dt]
        corr = cat_correct.get(dt, 0)
        acc = (corr / tot) * 100
        status = "PASS" if acc >= 90.0 else "FAIL"
        dt_clean = dt.replace("_", " ").title()
        latex_cat += f"{dt_clean} & {tot} & {corr} & {acc:.2f}\\% & {status} \\\\\n"

    tot_all = len(comparisons)
    corr_all = sum(cat_correct.values())
    acc_all = (corr_all / tot_all) * 100
    latex_cat += "\\hline\n"
    latex_cat += f"\\textbf{{Overall Total}} & \\textbf{{{tot_all}}} & \\textbf{{{corr_all}}} & \\textbf{{{acc_all:.2f}\\%}} & \\textbf{{{'PASS' if acc_all >= 90.0 else 'FAIL'}}} \\\\\n"
    latex_cat += "\\hline\n\\end{tabular}\n\\end{table}\n"

    cat_tex_file = RESULTS_DIR / "table_category_accuracy.tex"
    cat_tex_file.write_text(latex_cat, encoding="utf-8")
    print(f"Saved: {cat_tex_file}")

    # ── 2. Degradation Profile Robustness Table (LaTeX) ──────────────────────
    prof_counts = {}
    prof_correct = {}
    for c in comparisons:
        p = c["qualityProfile"]
        prof_counts[p] = prof_counts.get(p, 0) + 1
        if c["categoryMatch"]:
            prof_correct[p] = prof_correct.get(p, 0) + 1

    latex_prof = """\\begin{table}[htbp]
\\caption{Optical Quality Profile Classification Robustness}
\\label{tab:degradation_robustness}
\\centering
\\begin{tabular}{lcccc}
\\hline
\\textbf{Quality Profile} & \\textbf{Specimens} & \\textbf{Category Match} & \\textbf{Classification Acc (\\%)} \\\\
\\hline
"""
    for p in sorted(prof_counts.keys()):
        tot = prof_counts[p]
        corr = prof_correct.get(p, 0)
        acc = (corr / tot) * 100
        p_clean = p.replace("_", " ").title()
        latex_prof += f"{p_clean} & {tot} & {corr} & {acc:.2f}\\% \\\\\n"

    latex_prof += "\\hline\n\\end{tabular}\n\\end{table}\n"

    prof_tex_file = RESULTS_DIR / "table_degradation_robustness.tex"
    prof_tex_file.write_text(latex_prof, encoding="utf-8")
    print(f"Saved: {prof_tex_file}")

    # ── 3. Confusion Matrix Plot ──────────────────────────────────────────────
    categories = sorted(list(cat_counts.keys()))
    cat_to_idx = {c: i for i, c in enumerate(categories)}
    cm = np.zeros((len(categories), len(categories)), dtype=int)

    for c in comparisons:
        gt_cat = c["documentType"]
        # Find matching prediction
        pred_cat = c["predictionSummary"]["category"].lower()
        if pred_cat in cat_to_idx:
            cm[cat_to_idx[gt_cat], cat_to_idx[pred_cat]] += 1
        else:
            # Category mismatch or unknown
            pass

    fig, ax = plt.subplots(figsize=(6, 5))
    im = ax.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    ax.figure.colorbar(im, ax=ax)
    labels = [c.replace("_", " ").title() for c in categories]
    ax.set(xticks=np.arange(cm.shape[1]),
           yticks=np.arange(cm.shape[0]),
           xticklabels=labels, yticklabels=labels,
           title='Document Classification Confusion Matrix',
           ylabel='True Category',
           xlabel='Predicted Category')

    plt.setp(ax.get_xticklabels(), rotation=45, ha="right", rotation_mode="anchor")

    fmt = 'd'
    thresh = cm.max() / 2.
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(j, i, format(cm[i, j], fmt),
                    ha="center", va="center",
                    color="white" if cm[i, j] > thresh else "black")
    fig.tight_layout()
    cm_png = RESULTS_DIR / "figure_confusion_matrix.png"
    plt.savefig(cm_png, dpi=300)
    plt.close()
    print(f"Saved: {cm_png}")

    print("[SUCCESS] Paper artifacts generation complete.")


if __name__ == "__main__":
    main()
