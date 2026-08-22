import os
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]

dirs_to_check = [
    workspace / "scratch",
    workspace / "docs",
    workspace / "research",
    workspace / "docs" / "paper",
    workspace / "docs" / "paper" / "easy_read",
]
files_to_check = [
    workspace / "CITATION.cff",
    workspace / "README.md",
]

target_title_part = "Smart Academic Document Intelligence System"

print("=== FAST SEARCH FOR PAPER TITLE OCCURRENCES ===")

matched_files = []

for d in dirs_to_check:
    if d.exists():
        for root, dirs, files in os.walk(d):
            for file in files:
                if file.endswith((".py", ".md", ".cff", ".txt", ".json", ".ts", ".js")):
                    p = Path(root) / file
                    try:
                        with open(p, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                            if target_title_part in content:
                                rel_p = p.relative_to(workspace)
                                matched_files.append(rel_p)
                                print(f"MATCH: {rel_p}")
                    except Exception:
                        pass

for p in files_to_check:
    if p.exists():
        try:
            with open(p, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                if target_title_part in content:
                    rel_p = p.relative_to(workspace)
                    matched_files.append(rel_p)
                    print(f"MATCH: {rel_p}")
        except Exception:
            pass

print(f"\nTotal matched files: {len(matched_files)}")
