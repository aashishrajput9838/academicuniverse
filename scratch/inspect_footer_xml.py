import docx
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v4_docx_path = workspace / "docs" / "paper" / "PaperV4_Final_Submission.docx"

doc = docx.Document(v4_docx_path)
footer = doc.sections[0].footer

print("=== RAW FOOTER XML ===")
print(footer._element.xml)
