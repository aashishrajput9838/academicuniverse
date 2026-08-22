import os
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]

print("=== SEARCHING ALL WORKSPACE FILES FOR PAPER TITLE OCCURRENCES ===")

target_terms = [
    "Smart Academic Document Intelligence System",
    "Academic Document Benchmark Generator for Automated Academic Document Extraction",
    "Automated Academic Document Extraction and Normalization"
]

matches = []

for root, dirs, files in os.walk(workspace):
    if ".git" in root or "node_modules" in root or ".next" in root or "brain" in root or "pdf_pages" in root:
        continue
    for file in files:
        if file.endswith((".py", ".md", ".cff", ".txt", ".json", ".ts", ".js", ".docx")):
            p = Path(root) / file
            rel_p = p.relative_to(workspace)
            if file.endswith(".docx"):
                continue # DOCX binary checked separately
            try:
                with open(p, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    for term in target_terms:
                        if term in content:
                            matches.append((rel_p, term))
                            print(f"Found in [{rel_p}]: contains '{term[:50]}...'")
            except Exception as e:
                pass

print(f"\nTotal text file matches found: {len(matches)}")
