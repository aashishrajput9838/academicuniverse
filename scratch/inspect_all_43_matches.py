import docx
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v5_docx_path = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.docx"

doc = docx.Document(v5_docx_path)

print("=== ALL PARAGRAPHS CONTAINING '4.3' OR 'Metrics' OR 'Character Error Rate' ===")

for i, p in enumerate(doc.paragraphs):
    text_str = p.text.strip()
    if "4.3" in text_str or "Character Error Rate" in text_str or "Levenshtein" in text_str or "Exact Match Rate" in text_str:
        print(f"P{i:3d}: '{text_str[:120]}...'")
