import shutil
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
justified_docx = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary_Justified.docx"
target_docx = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.docx"

if justified_docx.exists():
    shutil.copy(str(justified_docx), str(target_docx))
    print(f"[SUCCESS] Synchronized {justified_docx.name} -> {target_docx.name}")
