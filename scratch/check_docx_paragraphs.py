import docx
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v5_docx = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.docx"

doc = docx.Document(v5_docx)

exact_title = "Smart Academic Document Intelligence System: Automated Extraction, Normalization, and Benchmark Generation"

found_idx = None
for i, p in enumerate(doc.paragraphs):
    text_str = p.text.strip()
    if text_str == exact_title:
        found_idx = i
        print(f"Found EXACT TITLE at Paragraph P{i}: '{text_str}'")
        break

assert found_idx is not None, "Exact title not found in docx!"
