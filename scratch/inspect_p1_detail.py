import docx
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v4_docx_path = workspace / "docs" / "paper" / "PaperV4_Final_Submission.docx"

doc = docx.Document(v4_docx_path)
p1 = doc.paragraphs[1]

print("=== P1 TEXT & RUN BREAKDOWN ===")
print("P1 Full Repr Text:", repr(p1.text))
for i, r in enumerate(p1.runs):
    print(f"  Run {i} (bold={r.bold}, italic={r.italic}): {repr(r.text)}")
