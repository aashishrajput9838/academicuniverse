import os
import json
import csv
from pathlib import Path

reports_dir = Path("backend/benchmark_reports")

print("=== DETAILED AUDIT OF ALL BENCHMARK REPORT RUNS ===")

for run_dir in sorted(reports_dir.iterdir()):
    if not run_dir.is_dir():
        continue
    
    pred_file = run_dir / "predictions.json"
    csv_file = run_dir / "paired_field_observations.csv"
    metrics_file = run_dir / "metrics.json"
    stats_file = run_dir / "statistical_results.json"

    pred_len = 0
    csv_len = 0
    
    if pred_file.exists():
        try:
            with open(pred_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                pred_len = len(data)
        except Exception:
            pass

    if csv_file.exists():
        try:
            with open(csv_file, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                next(reader, None)
                csv_len = sum(1 for _ in reader)
        except Exception:
            pass

    if pred_len > 0 or csv_len > 0 or metrics_file.exists() or stats_file.exists():
        print(f"Run: {run_dir.name} -> Predictions: {pred_len}, CSV Rows: {csv_len}, Metrics JSON: {metrics_file.exists()}, Stats JSON: {stats_file.exists()}")
