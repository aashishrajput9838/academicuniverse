import os
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]

print("=== LOCATING THE 360 SPECIMEN DATASET IN WORKSPACE ===")

dataset_locations = []

for root, dirs, files in os.walk(workspace):
    if ".git" in root or "node_modules" in root or ".next" in root or "brain" in root:
        continue
    
    # Check if folder contains specimen images or JSON annotations
    path = Path(root)
    if "synthetic" in path.name.lower() or "dataset" in path.name.lower() or "benchmark_reports" in path.name.lower():
        num_files = len(files)
        num_jsons = len([f for f in files if f.endswith(".json")])
        num_imgs = len([f for f in files if f.endswith((".png", ".jpg", ".pdf"))])
        num_csvs = len([f for f in files if f.endswith(".csv")])
        
        if num_files > 0:
            dataset_locations.append((path.relative_to(workspace), num_files, num_jsons, num_imgs, num_csvs))

dataset_locations.sort(key=lambda x: x[1], reverse=True)

for rel_path, n_total, n_json, n_img, n_csv in dataset_locations[:25]:
    print(f"Path: {rel_path}")
    print(f"   Total Files: {n_total} | JSONs: {n_json} | Images: {n_img} | CSVs: {n_csv}")
    print("-" * 60)
