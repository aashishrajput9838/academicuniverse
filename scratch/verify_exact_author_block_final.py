import docx
from docx.enum.text import WD_ALIGN_PARAGRAPH
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v5_docx_path = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.docx"

assert v5_docx_path.exists(), "PaperV5_Ollama_Primary.docx missing!"

doc = docx.Document(v5_docx_path)
p1 = doc.paragraphs[1]

print("============================================================")
print(" FINAL AUTHOR / AFFILIATION / EMAIL BLOCK VERIFICATION")
print("============================================================")
print(f"P1 Alignment:                {p1.alignment} (WD_ALIGN_PARAGRAPH.CENTER)")

lines = p1.text.split("\n")
print(f"Total Lines in Block:        {len(lines)} (Expected: 3)")
print(f"Line 1 (Authors):            '{lines[0]}'")
print(f"Line 2 (Shared Affiliation): '{lines[1]}'")
print(f"Line 3 (Comma Emails):       '{lines[2]}'")

superscript_runs = []
for i, r in enumerate(p1.runs):
    if r.font.superscript:
        superscript_runs.append((i, repr(r.text)))

print(f"\nTotal Superscript Runs:      {len(superscript_runs)} runs")
for idx, text_val in superscript_runs:
    print(f"  - Run {idx}: {text_val}")

assert len(lines) == 3, f"Expected 3 lines, found {len(lines)}"
assert "Kushagra Singh Bhadauria" in lines[0] and "Aashish Rajput" in lines[0] and "Avdesh Kumar Sah" in lines[0]
assert "123 Department of Computer Science and Engineering" in lines[1]
assert "1 2023361009.kushagra@ug.sharda.ac.in, 2 2023329421.aashish@ug.sharda.ac.in, 3 2023265132.avdesh@ug.sharda.ac.in" in lines[2]
assert p1.alignment == WD_ALIGN_PARAGRAPH.CENTER

print("============================================================")
print("VERIFICATION SUCCESS: All 3 lines match exact specification 100%.")
print("============================================================")
