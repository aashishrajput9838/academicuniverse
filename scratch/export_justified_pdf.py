import os
import win32com.client
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
justified_docx = os.path.abspath(str(workspace / "docs" / "paper" / "PaperV5_Ollama_Primary_Justified.docx"))
target_pdf = os.path.abspath(str(workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.pdf"))

print(f"Exporting PDF from:\n  {justified_docx}\n-> {target_pdf}...")

word = None
try:
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    doc = word.Documents.Open(justified_docx)
    doc.SaveAs(target_pdf, FileFormat=17) # 17 = wdFormatPDF
    pages = doc.ComputeStatistics(2) # 2 = wdStatisticPages
    doc.Close()
    print(f"[SUCCESS] Exported high-quality PDF: {target_pdf} ({pages} Pages!)")
except Exception as e:
    print(f"Word COM PDF Export Error: {e}")
finally:
    if word:
        try: word.Quit()
        except: pass
