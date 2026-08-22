import pandas as pd
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]

paths_to_check = [
    workspace / "backend" / "benchmark_reports" / "run_canonical_v4_verify" / "paired_field_observations.csv",
    workspace / "research" / "statistics" / "results" / "paired_field_observations.csv",
]

csv_path = None
for p in paths_to_check:
    if p.exists():
        csv_path = p
        break

assert csv_path is not None, "Error: paired_field_observations.csv not found!"

print(f"=== ANALYZING DATASET FOR ML: {csv_path.relative_to(workspace)} ===")

df = pd.read_csv(csv_path)

print(f"Dataset Shape: {df.shape[0]} rows, {df.shape[1]} columns")
print("\nColumn Summary:")
for col in df.columns:
    null_count = df[col].isnull().sum()
    unique_vals = df[col].nunique()
    print(f" - {col:<20}: dtype={str(df[col].dtype):<10} | nulls={null_count:<5} | unique={unique_vals}")

print("\n--- Target Candidate 1: `exact_match` (Binary Classification) ---")
print(df["exact_match"].value_counts(dropna=False, normalize=True))

print("\n--- Target Candidate 2: `normalized_match` (Binary Classification) ---")
print(df["normalized_match"].value_counts(dropna=False, normalize=True))

print("\n--- Target Candidate 3: `document_type` (Multiclass Classification) ---")
print(df["document_type"].value_counts(dropna=False, normalize=True))

print("\n--- Categorical Feature Value Counts ---")
print("quality_profile:")
print(df["quality_profile"].value_counts())

print("\nfield_name count:")
print(df["field_name"].value_counts().head(10))
