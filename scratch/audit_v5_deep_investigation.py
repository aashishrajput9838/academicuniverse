import os
import json
import csv
import urllib.request
import pandas as pd
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
run_dir = workspace / "backend" / "benchmark_reports" / "run_canonical_v4_verify"
gt_dir = workspace / "ADBG" / "AU_DIC_Benchmark_v1.0" / "groundtruth"

print("============================================================")
print(" PAPER V5 OLLAMA PRIMARY — DEEP AUDIT INVESTIGATION")
print("============================================================")

# 1. Check Ollama server version & runtime details
print("\n--- 1. OLLAMA LOCAL SERVER AUDIT ---")
try:
    with urllib.request.urlopen("http://localhost:11434/api/version") as response:
        v_data = json.loads(response.read().decode())
        print(f"Ollama Version: {v_data.get('version')}")
except Exception as e:
    print(f"Ollama Version Check Error: {e}")

try:
    with urllib.request.urlopen("http://localhost:11434/api/tags") as response:
        t_data = json.loads(response.read().decode())
        models = t_data.get("models", [])
        print("Installed Ollama Models:")
        for m in models:
            print(f"  - Name: {m.get('name')}, Size: {m.get('size')} bytes, Modified: {m.get('modified_at')}")
            if "minicpm-v" in m.get("name", ""):
                print(f"    Details: {json.dumps(m.get('details', {}))}")
except Exception as e:
    print(f"Ollama Models Check Error: {e}")

# 2. Ground Truth Directory Audit (Scan all 360 GT JSON files)
print("\n--- 2. GROUND TRUTH DIRECTORY AUDIT ---")
gt_files = list(gt_dir.glob("DOC-*.json"))
print(f"Total Flat GT JSON Files in {gt_dir}: {len(gt_files)}")

gt_categories = {}
gt_profiles = {}
gt_field_counts = []

for gf in gt_files:
    with open(gf, 'r', encoding='utf-8') as f:
        gt_obj = json.load(f)
    
    doc_type = gt_obj.get("document_type") or gt_obj.get("documentType") or gt_obj.get("category") or "unknown"
    profile = gt_obj.get("quality_profile") or gt_obj.get("qualityProfile") or "unknown"
    
    gt_categories[doc_type] = gt_categories.get(doc_type, 0) + 1
    gt_profiles[profile] = gt_profiles.get(profile, 0) + 1

    # Count fields
    fields_count = 0
    if "student" in gt_obj and isinstance(gt_obj["student"], dict): fields_count += len(gt_obj["student"])
    if "university" in gt_obj and isinstance(gt_obj["university"], dict): fields_count += len(gt_obj["university"])
    if "extractedFields" in gt_obj and isinstance(gt_obj["extractedFields"], dict): fields_count += len(gt_obj["extractedFields"])
    gt_field_counts.append(fields_count)

print(f"GT Category Distribution: {gt_categories}")
print(f"GT Profile Distribution:  {gt_profiles}")
print(f"GT Min Fields/Sample: {min(gt_field_counts) if gt_field_counts else 0}, Max Fields: {max(gt_field_counts) if gt_field_counts else 0}")

# 3. Canonical Run Predictions Audit
print("\n--- 3. CANONICAL RUN PREDICTIONS.JSON AUDIT ---")
pred_file = run_dir / "predictions.json"
if pred_file.exists():
    with open(pred_file, 'r', encoding='utf-8') as f:
        preds = json.load(f)
    
    print(f"Total Predictions: {len(preds)}")
    pred_cats = {}
    pred_provs = {}
    pred_models = {}
    mock_count = 0
    
    for p in preds:
        cat = p.get("documentCategory", "unknown")
        prov = p.get("provider", "unknown")
        model = p.get("modelName", "unknown")
        is_mock = p.get("isMock", False)
        
        pred_cats[cat] = pred_cats.get(cat, 0) + 1
        pred_provs[prov] = pred_provs.get(prov, 0) + 1
        pred_models[model] = pred_models.get(model, 0) + 1
        if is_mock: mock_count += 1
        
    print(f"Predictions Category Distribution: {pred_cats}")
    print(f"Predictions Provider Distribution: {pred_provs}")
    print(f"Predictions Model Distribution:    {pred_models}")
    print(f"Predictions Mock Count:            {mock_count}")
else:
    print(f"predictions.json NOT FOUND at {pred_file}")

# 4. Canonical Run CSV Audit
print("\n--- 4. CANONICAL RUN PAIRED_FIELD_OBSERVATIONS.CSV AUDIT ---")
csv_file = run_dir / "paired_field_observations.csv"
if csv_file.exists():
    df_csv = pd.read_csv(csv_file)
    print(f"Total CSV Rows:          {len(df_csv)}")
    print(f"Unique Specimen Count:   {df_csv['specimen_id'].nunique()}")
    print(f"CSV Category Dist:       {df_csv['document_type'].value_counts().to_dict()}")
    print(f"CSV Profile Dist:        {df_csv['quality_profile'].value_counts().to_dict()}")
    print(f"CSV Duplicate Rows:      {df_csv.duplicated(subset=['specimen_id', 'field_name']).sum()}")
else:
    print(f"paired_field_observations.csv NOT FOUND at {csv_file}")
