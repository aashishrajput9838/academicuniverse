import docx
from docx.enum.text import WD_ALIGN_PARAGRAPH
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v5_docx_path = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.docx"

assert v5_docx_path.exists(), "PaperV5_Ollama_Primary.docx missing!"

doc = docx.Document(v5_docx_path)
p1 = doc.paragraphs[1]

print("============================================================")
print(" AUTHOR AFFILIATION SUPERSCRIPTS VERIFICATION REPORT")
print("============================================================")
print(f"Author Paragraph Alignment:   {p1.alignment} (Expected: WD_ALIGN_PARAGRAPH.CENTER / 1)")

superscript_runs = []
for i, r in enumerate(p1.runs):
    if r.font.superscript:
        superscript_runs.append((i, r.text))

print(f"Superscript Runs Found:       {len(superscript_runs)} runs")
for idx, text in superscript_runs:
    print(f"  - Run {idx}: '{text}' (superscript=True)")

assert len(superscript_runs) == 4, f"Expected 4 superscript runs (3 authors + 1 affiliation tag), found {len(superscript_runs)}!"
assert p1.alignment == WD_ALIGN_PARAGRAPH.CENTER, "Author paragraph is not CENTER aligned!"

print("============================================================")
print("VERIFICATION SUCCESS: All author superscripts are natively formatted and centered.")
print("============================================================")
