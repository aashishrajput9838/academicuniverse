import sys
import win32com.client
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v5_pdf = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.pdf"
v4_pdf = workspace / "docs" / "paper" / "PaperV4_Final_Submission.pdf"
v5_docx = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.docx"

print("=== CHECKING PDF & DOCX PAGE COUNTS ===")

word = None
try:
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False

    if v5_docx.exists():
        doc5 = word.Documents.Open(str(v5_docx))
        pages_v5_docx = doc5.ComputeStatistics(2) # 2 = wdStatisticPages
        doc5.Close()
        print(f"PaperV5_Ollama_Primary.docx Page Count: {pages_v5_docx}")

    v4_docx = workspace / "docs" / "paper" / "PaperV4_Final_Submission.docx"
    if v4_docx.exists():
        doc4 = word.Documents.Open(str(v4_docx))
        pages_v4_docx = doc4.ComputeStatistics(2)
        doc4.Close()
        print(f"PaperV4_Final_Submission.docx Page Count: {pages_v4_docx}")
except Exception as e:
    print(f"Error checking Word statistics: {e}")
finally:
    if word:
        try: word.Quit()
        except: pass
