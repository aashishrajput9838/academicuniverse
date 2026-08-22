import docx
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v5_docx = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.docx"

doc = docx.Document(v5_docx)

print("=== SEARCHING FOR ABSTRACT AND INDEX TERMS PARAGRAPHS ===")

for i, p in enumerate(doc.paragraphs[:100]):
    text = p.text.strip()
    if "Abstract" in text or "Index Terms" in text:
        print(f"P{i:2d}: '{text[:120]}...'")
