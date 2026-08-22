import docx
from docx.enum.text import WD_ALIGN_PARAGRAPH
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v5_docx_path = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.docx"

assert v5_docx_path.exists(), "PaperV5_Ollama_Primary.docx missing!"

doc = docx.Document(v5_docx_path)

author_p = None
for p in doc.paragraphs:
    if "Kushagra Singh Bhadauria" in p.text:
        author_p = p
        break

assert author_p is not None, "Error: Could not find author paragraph!"

print("============================================================")
print(" AUTHOR PARAGRAPH CENTER ALIGNMENT VERIFICATION REPORT")
print("============================================================")
print(f"Author Paragraph Alignment:   {author_p.alignment} (Expected: WD_ALIGN_PARAGRAPH.CENTER / 1)")
print(f"Alignment Match Verified:     {author_p.alignment == WD_ALIGN_PARAGRAPH.CENTER}")
print(f"Author Paragraph Style:       '{author_p.style.name}'")
print(f"Author Paragraph First 120 chars:\n  '{author_p.text[:120]}'")
print("============================================================")

assert author_p.alignment == WD_ALIGN_PARAGRAPH.CENTER, "Error: Author paragraph is not center-aligned!"
