import os
from pathlib import Path
import pandas as pd

workspace = Path(__file__).resolve().parents[1]
au_dic_root = workspace / "AU_DIC_Benchmark_v1.0"
csv_path = workspace / "backend" / "benchmark_reports" / "run_canonical_v4_verify" / "paired_field_observations.csv"

print("=== CONFIRMING 360 SPECIMEN DATASET PATHS ===")

# Count PNGs in AU_DIC_Benchmark_v1.0
png_files = list((au_dic_root / "images").glob("**/*.png"))
json_files = list((au_dic_root / "groundtruth").glob("**/*.json"))
pdf_files = list((au_dic_root / "pdf").glob("**/*.pdf"))

print(f"AU_DIC_Benchmark_v1.0 PNG Images:       {len(png_files)} files")
print(f"AU_DIC_Benchmark_v1.0 GroundTruth JSONs: {len(json_files)} files")
print(f"AU_DIC_Benchmark_v1.0 Clean Vector PDFs: {len(pdf_files)} files")

if csv_path.exists():
    df = pd.read_csv(csv_path)
    print(f"\nPaired Observations CSV: {csv_path.relative_to(workspace)}")
    print(f"   Total Field Observation Rows: {len(df):,}")
    print(f"   Unique Specimen IDs:          {df['specimen_id'].nunique()}")
