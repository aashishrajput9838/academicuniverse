import docx
import re
import win32com.client
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v5_docx_path = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.docx"

assert v5_docx_path.exists(), "PaperV5_Ollama_Primary.docx missing!"

doc = docx.Document(v5_docx_path)

headings = []
for i, p in enumerate(doc.paragraphs):
    text_str = p.text.strip()
    if not text_str:
        continue
    
    # Check for major section headings
    is_h1 = (
        text_str.startswith("1. ") or
        text_str.startswith("2. ") or
        text_str.startswith("3. ") or
        text_str.startswith("4. ") or
        text_str.startswith("5. ") or
        text_str.startswith("6. ") or
        text_str.startswith("7. ") or
        text_str.startswith("8. ") or
        text_str.startswith("9. ") or
        text_str == "REFERENCES" or
        text_str.startswith("APPENDIX A") or
        text_str.startswith("APPENDIX B") or
        text_str.startswith("APPENDIX C") or
        text_str.startswith("Ethics & Privacy Statement") or
        text_str.startswith("ACKNOWLEDGMENT")
    )
    
    is_h2 = (
        re.match(r"^\d\.\d\s+", text_str) or
        text_str.startswith("A.1 ") or text_str.startswith("A.2 ") or
        text_str.startswith("B.1 ") or text_str.startswith("B.2 ") or
        text_str.startswith("C.1 ") or text_str.startswith("C.2 ") or text_str.startswith("C.3 ")
    )
    
    if is_h1 or is_h2:
        headings.append((i, p.style.name, text_str, 1 if is_h1 else 2))

print("=== MANUSCRIPT SECTION HEADINGS MAP ===")
for idx, style, text, level in headings:
    indent = "  " if level == 2 else ""
    print(f"{indent}P{idx} [{style}]: '{text}'")
