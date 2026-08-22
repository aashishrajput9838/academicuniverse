import os
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]

print("=== SEARCHING FOR ALL PYTHON FILES IN WORKSPACE ===")

py_files = []
for root, dirs, files in os.walk(workspace):
    if ".git" in root or "node_modules" in root or ".next" in root or "brain" in root:
        continue
    for file in files:
        if file.endswith(".py"):
            path = Path(root) / file
            py_files.append(path.relative_to(workspace))

for f in sorted(py_files):
    print(f" - {f}")
