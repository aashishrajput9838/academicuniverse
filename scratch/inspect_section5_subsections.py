import docx
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v5_docx_path = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.docx"

assert v5_docx_path.exists(), "PaperV5_Ollama_Primary.docx missing!"

doc = docx.Document(v5_docx_path)

print("=== INSPECTING SECTION 5 SUBSECTIONS IN PaperV5 ===")
for i, p in enumerate(doc.paragraphs):
    text_str = p.text.strip()
    if text_str.startswith("5.") or text_str.startswith("6."):
        print(f"P{i:3d}: '{text_str}'")
