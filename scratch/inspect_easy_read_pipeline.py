import docx
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
easy_read_md = workspace / "docs" / "paper" / "easy_read" / "Easy_Read_Research_Guide.md"
easy_read_docx = workspace / "docs" / "paper" / "easy_read" / "Easy_Read_Research_Guide.docx"
easy_read_pdf = workspace / "docs" / "paper" / "easy_read" / "Easy_Read_Research_Guide.pdf"
paper_v5_docx = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.docx"

print("=== INSPECTING CURRENT EASY-READ PIPELINE STATE ===")
print(f"Easy-Read MD Exists:   {easy_read_md.exists()} ({easy_read_md.stat().st_size} bytes)")
print(f"Easy-Read DOCX Exists: {easy_read_docx.exists()} ({easy_read_docx.stat().st_size} bytes)")
print(f"Easy-Read PDF Exists:  {easy_read_pdf.exists()} ({easy_read_pdf.stat().st_size} bytes)")
print(f"Paper V5 DOCX Exists:  {paper_v5_docx.exists()} ({paper_v5_docx.stat().st_size} bytes)")

doc_v5 = docx.Document(paper_v5_docx)
print(f"Paper V5 Paragraph Count: {len(doc_v5.paragraphs)}")
