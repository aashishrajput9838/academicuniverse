import os
import win32com.client
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v5_docx_path = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.docx"
lock_file = workspace / "docs" / "paper" / "~$PaperV5_Ollama_Primary.docx"

print("Closing any active Word COM objects...")
try:
    word = win32com.client.GetActiveObject("Word.Application")
    if word:
        word.Quit()
        print("Closed active Word COM object.")
except Exception as e:
    print(f"No active Word COM object found: {e}")

if lock_file.exists():
    try:
        os.remove(lock_file)
        print(f"Removed lock file: {lock_file}")
    except Exception as e:
        print(f"Could not remove lock file: {e}")
