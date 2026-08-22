import os
import json
import csv
from pathlib import Path

reports_dir = Path("backend/benchmark_reports")

print("=== BENCHMARK REPORTS COMPREHENSIVE AUDIT ===")

for run_dir in sorted(reports_dir.iterdir()):
    if not run_dir.is_dir():
        continue
    
    pred_file = run_dir / "predictions.json"
    csv_file = run_dir / "paired_field_observations.csv"
    metrics_file = run_dir / "metrics.json"
    stats_file = run_dir / "statistical_results.json"
    
    pred_count = 0
    mock_count = 0
    live_count = 0
    providers = set()
    models = set()
    
    if pred_file.exists():
        try:
            with open(pred_file, "r", encoding="utf-8") as f:
                preds = json.load(f)
                pred_count = len(preds)
                for p in preds:
                    if p.get("isMock") or p.get("provider") == "mock" or p.get("executionMode") == "mock":
                        mock_count += 1
                    else:
                        live_count += 1
                    if "provider" in p: providers.add(str(p["provider"]))
                    if "modelName" in p: models.add(str(p["modelName"]))
        except Exception as e:
            pred_count = f"Error: {e}"
            
    csv_rows = 0
    if csv_file.exists():
        try:
            with open(csv_file, "r", encoding="utf-8") as f:
                reader = csv.reader(f)
                header = next(reader, None)
                csv_rows = sum(1 for _ in reader)
        except Exception as e:
            csv_rows = f"Error: {e}"

    print(f"\nDirectory: {run_dir.name}")
    print(f"  predictions.json:        total={pred_count}, live={live_count}, mock={mock_count}, providers={list(providers)}, models={list(models)}")
    print(f"  paired_observations.csv: rows={csv_rows}")
    print(f"  metrics.json exists:     {metrics_file.exists()}")
    print(f"  statistical_results:     {stats_file.exists()}")
