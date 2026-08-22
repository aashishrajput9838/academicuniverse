import os
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v3_md = workspace / "docs" / "paper" / "Paper_V3.md"
v4_txt = workspace / "docs" / "paper" / "PaperV4_extracted.txt"

print("=== V4 SOURCE MANUSCRIPT TEXT INSPECTION ===")

if v3_md.exists():
    with open(v3_md, "r", encoding="utf-8") as f:
        v3_text = f.read()
    print(f"Paper_V3.md size: {len(v3_text)} chars, {len(v3_text.splitlines())} lines, {len(v3_text.split())} words")

if v4_txt.exists():
    with open(v4_txt, "r", encoding="utf-8") as f:
        v4_text = f.read()
    print(f"PaperV4_extracted.txt size: {len(v4_text)} chars, {len(v4_text.splitlines())} lines, {len(v4_text.split())} words")

# Print top-level headers from Paper_V3.md
print("\n--- Top-Level Section Headers in Paper_V3.md ---")
for line in v3_text.splitlines():
    if line.startswith("#"):
        print(line[:100])
