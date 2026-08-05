#!/usr/bin/env python3
"""
generate_field_dataset.py — Task 4: Real Field Observation Dataset Generator

Reads the live benchmark output (comparisons.json + predictions.json) from a
completed benchmark run and produces a real paired_field_observations.csv.

One row per evaluated field per specimen:
  specimen_id, document_type, quality_profile, field_name,
  ground_truth_value, extracted_value, normalized_gt, normalized_pred,
  exact_match, normalized_match, cer, edit_distance, confidence, latency_ms

Usage:
  python generate_field_dataset.py --run-dir backend/benchmark_reports/run_XXXXXXXXX
  python generate_field_dataset.py  # auto-discovers latest run

Output:
  research/statistics/results/paired_field_observations.csv
"""

import argparse
import csv
import json
import os
import sys
from pathlib import Path
from typing import Any


# ── Levenshtein distance (character error rate) ──────────────────────────────

def levenshtein(s1: str, s2: str) -> int:
    if s1 == s2:
        return 0
    if not s1:
        return len(s2)
    if not s2:
        return len(s1)
    rows = len(s1) + 1
    cols = len(s2) + 1
    dp = list(range(cols))
    for r in range(1, rows):
        new_dp = [r]
        for c in range(1, cols):
            cost = 0 if s1[r - 1] == s2[c - 1] else 1
            new_dp.append(min(new_dp[c - 1] + 1, dp[c] + 1, dp[c - 1] + cost))
        dp = new_dp
    return dp[-1]


def cer(gt: str, pred: str) -> float:
    if not gt:
        return 0.0 if not pred else 1.0
    return levenshtein(str(gt), str(pred)) / len(str(gt))


def normalize(val: Any) -> str:
    """Canonical normalization: lowercase, strip whitespace, collapse spaces."""
    if val is None:
        return ""
    s = str(val).lower().strip()
    # Collapse internal whitespace
    return " ".join(s.split())


# ── Discover latest run dir ───────────────────────────────────────────────────

def find_latest_run(base: Path) -> Path | None:
    runs = sorted(
        [d for d in base.iterdir() if d.is_dir() and d.name.startswith("run_")],
        key=lambda d: d.name,
        reverse=True,
    )
    for r in runs:
        if (r / "comparisons.json").exists() and (r / "predictions.json").exists():
            return r
    return None


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Generate real field observation dataset from benchmark run")
    parser.add_argument("--run-dir", type=str, default=None,
                        help="Path to benchmark run directory (auto-discovers latest if omitted)")
    parser.add_argument("--output", type=str,
                        default="research/statistics/results/paired_field_observations.csv",
                        help="Output CSV path (relative to workspace root)")
    args = parser.parse_args()

    workspace = Path(__file__).resolve().parents[2]
    reports_base = workspace / "backend" / "benchmark_reports"

    if args.run_dir:
        run_dir = Path(args.run_dir)
    else:
        run_dir = find_latest_run(reports_base)
        if run_dir is None:
            print("ERROR: No completed benchmark run found. Run run_live_benchmark.ts first.")
            sys.exit(1)

    print(f"Using run dir: {run_dir}")

    comp_path = run_dir / "comparisons.json"
    pred_path = run_dir / "predictions.json"

    if not comp_path.exists() or not pred_path.exists():
        print(f"ERROR: comparisons.json or predictions.json not found in {run_dir}")
        sys.exit(1)

    with open(comp_path, encoding="utf-8") as f:
        comparisons = json.load(f)
    with open(pred_path, encoding="utf-8") as f:
        predictions = json.load(f)

    # Index predictions by sampleId
    pred_index = {p["sampleId"]: p for p in predictions}

    output_path = workspace / args.output
    output_path.parent.mkdir(parents=True, exist_ok=True)

    FIELDNAMES = [
        "specimen_id", "document_type", "quality_profile",
        "field_name", "ground_truth_value", "extracted_value",
        "normalized_gt", "normalized_pred",
        "exact_match", "normalized_match",
        "cer", "edit_distance",
        "confidence", "latency_ms",
    ]

    rows_written = 0
    specimens_with_fields = 0
    specimens_without_fields = 0

    with open(output_path, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=FIELDNAMES)
        writer.writeheader()

        for comp in comparisons:
            sample_id    = comp["sampleId"]
            doc_type     = comp["documentType"]
            quality_prof = comp["qualityProfile"]
            pred         = pred_index.get(sample_id, {})
            confidence   = pred.get("confidenceScore", 0.0)
            latency_ms   = pred.get("executionTimeMs", 0)

            # Field-level discrepancies
            discrepancies = comp.get("discrepancies", [])

            if not discrepancies:
                # Check if extractedEntities has fields (from fixed run)
                extracted = pred.get("extractedEntities", {})
                candidate = pred.get("candidateFields", {})
                all_extracted = {**extracted, **candidate}

                if not all_extracted:
                    specimens_without_fields += 1
                    continue

                # Create rows from extractedEntities vs nothing (GT not in comparisons)
                for field_name, pred_val in all_extracted.items():
                    norm_gt   = ""
                    norm_pred = normalize(pred_val)
                    exact     = False
                    norm_match = False
                    c = 1.0  # No GT → CER = 1.0
                    ed = len(str(pred_val))

                    writer.writerow({
                        "specimen_id":      sample_id,
                        "document_type":    doc_type,
                        "quality_profile":  quality_prof,
                        "field_name":       field_name,
                        "ground_truth_value": "",
                        "extracted_value":  str(pred_val),
                        "normalized_gt":    norm_gt,
                        "normalized_pred":  norm_pred,
                        "exact_match":      exact,
                        "normalized_match": norm_match,
                        "cer":              round(c, 4),
                        "edit_distance":    ed,
                        "confidence":       confidence,
                        "latency_ms":       latency_ms,
                    })
                    rows_written += 1
                specimens_with_fields += 1
            else:
                # Use the actual field-level discrepancies
                specimens_with_fields += 1
                for d in discrepancies:
                    field_name = d.get("field", d.get("fieldKey", "unknown"))
                    gt_val     = d.get("expected", d.get("expectedValue", ""))
                    pred_raw   = d.get("actual", d.get("actualValue", ""))
                    if isinstance(pred_raw, dict):
                        pred_val = str(pred_raw.get("value", ""))
                    elif pred_raw is None:
                        pred_val = ""
                    else:
                        pred_val = str(pred_raw)

                    norm_gt    = normalize(gt_val)
                    norm_pred  = normalize(pred_val)
                    exact      = (str(gt_val) == pred_val) if gt_val and pred_val else False
                    norm_match = (norm_gt == norm_pred) if norm_gt and norm_pred else False
                    ed         = levenshtein(norm_gt, norm_pred)
                    c          = cer(gt_val, pred_val)

                    writer.writerow({
                        "specimen_id":      sample_id,
                        "document_type":    doc_type,
                        "quality_profile":  quality_prof,
                        "field_name":       field_name,
                        "ground_truth_value": str(gt_val),
                        "extracted_value":  str(pred_val),
                        "normalized_gt":    norm_gt,
                        "normalized_pred":  norm_pred,
                        "exact_match":      exact,
                        "normalized_match": norm_match,
                        "cer":              round(c, 4),
                        "edit_distance":    ed,
                        "confidence":       confidence,
                        "latency_ms":       latency_ms,
                    })
                    rows_written += 1

    print(f"\nDataset generated: {output_path}")
    print(f"  Total rows written:          {rows_written}")
    print(f"  Specimens with field data:   {specimens_with_fields}")
    print(f"  Specimens without field data:{specimens_without_fields}")

    if specimens_without_fields > 0:
        print(f"\n  WARNING: {specimens_without_fields} specimens produced no extracted entities.")
        print("  These specimens are excluded from field-level analysis.")
        print("  Statistical tests will only use specimens with actual field data.")

    return output_path


if __name__ == "__main__":
    main()
