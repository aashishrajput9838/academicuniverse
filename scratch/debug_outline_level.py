import docx
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v5_docx_path = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.docx"

doc = docx.Document(v5_docx_path)

print("=== CHECKING OUTLINE LEVELS IN DOCX PARAGRAPHS ===")

outline_count = 0
for i, p in enumerate(doc.paragraphs):
    if "outlineLvl" in p._p.xml:
        outline_count += 1
        print(f"P{i} [{p.style.name}]: '{p.text[:60]}' -> XML has outlineLvl!")

print(f"Total Paragraphs with outlineLvl XML: {outline_count}")
