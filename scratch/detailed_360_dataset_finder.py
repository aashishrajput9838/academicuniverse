import os
from pathlib import Path
import pandas as pd

workspace = Path(__file__).resolve().parents[1]

print("=== DETAILED FINDER FOR 360 SPECIMEN DATASET & RUN ARTIFACTS ===")

# 1. Search for paired_field_observations.csv files
print("\n--- Paired Field Observations CSV Files (360 specimens x 68 fields = 24,480 rows) ---")
for root, dirs, files in os.walk(workspace):
    if ".git" in root or "node_modules" in root or ".next" in root or "brain" in root:
        continue
    for file in files:
        if file == "paired_field_observations.csv":
            p = Path(root) / file
            df = pd.read_csv(p)
            n_rows = len(df)
            n_specimens = df['specimen_id'].nunique() if 'specimen_id' in df.columns else 0
            rel_p = p.relative_to(workspace)
            print(f"File: {rel_p}")
            print(f"   Rows: {n_rows:,} | Unique Specimens: {n_specimens}")
            print("-" * 50)

# 2. Search for specimen image/annotation directories
print("\n--- Specimen Image & JSON Directories ---")
for root, dirs, files in os.walk(workspace):
    if ".git" in root or "node_modules" in root or ".next" in root or "brain" in root:
        continue
    png_count = len([f for f in files if f.endswith('.png')])
    jpg_count = len([f for f in files if f.endswith('.jpg')])
    pdf_count = len([f for f in files if f.endswith('.pdf')])
    json_count = len([f for f in files if f.endswith('.json')])
    
    total_imgs = png_count + jpg_count + pdf_count
    if total_imgs >= 10 or json_count >= 10:
        rel_p = Path(root).relative_to(workspace)
        print(f"Directory: {rel_p}")
        print(f"   Images: {total_imgs} (PNG: {png_count}, JPG: {jpg_count}, PDF: {pdf_count}) | JSONs: {json_count}")
        print("-" * 50)
