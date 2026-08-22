import pandas as pd
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
csv_path = workspace / "results" / "train_test_comparison.csv"

df = pd.read_csv(csv_path, index_col=0)

print("=== FINAL ML EXPERIMENT COMPARISON TABLE ===")
print(df.to_string())
