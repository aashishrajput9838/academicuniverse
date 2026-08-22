import os
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]

print("=== SEARCHING FOR DATASET FILES IN WORKSPACE ===")

data_files = []
for root, dirs, files in os.walk(workspace):
    if ".git" in root or "node_modules" in root or ".next" in root or "brain" in root:
        continue
    for file in files:
        if file.endswith((".csv", ".xlsx", ".jsonl", ".parquet", ".tsv")):
            path = Path(root) / file
            size_kb = path.stat().st_size / 1024
            data_files.append((path, size_kb))

data_files.sort(key=lambda x: x[1], reverse=True)

for path, size_kb in data_files[:30]:
    rel_path = path.relative_to(workspace)
    print(f"[{size_kb:8.1f} KB] {rel_path}")
