import docx
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v5_docx_path = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.docx"

assert v5_docx_path.exists(), "PaperV5_Ollama_Primary.docx missing!"

doc = docx.Document(v5_docx_path)

print("=== INSPECTING SECTION 4.3 PARAGRAPHS IN PaperV5 ===")

sec43_start = False
for i, p in enumerate(doc.paragraphs):
    text_str = p.text.strip()
    if text_str.startswith("4.3"):
        sec43_start = True
        print(f"\nP{i:3d} (SEC 4.3 START): '{text_str}'")
        continue
    if sec43_start:
        if text_str.startswith("5. ") or text_str.startswith("5.1"):
            print(f"\nP{i:3d} (SEC 5 START): '{text_str}'")
            break
        print(f"P{i:3d}: '{text_str[:120]}...'")
