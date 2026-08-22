import pandas as pd
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
csv_path = workspace / "backend" / "benchmark_reports" / "run_canonical_v4_verify" / "paired_field_observations.csv"

if not csv_path.exists():
    csv_path = workspace / "research" / "statistics" / "results" / "paired_field_observations.csv"

print(f"=== INSPECTING DATASET SCHEMA: {csv_path.relative_to(workspace)} ===")

df = pd.read_csv(csv_path)

print(f"Shape: {df.shape[0]} rows x {df.shape[1]} columns")
print("\nColumns:")
for col in df.columns:
    print(f" - {col}: {df[col].dtype} ({df[col].nunique()} unique values)")

print("\nFirst 3 rows:")
print(df.head(3).T)
