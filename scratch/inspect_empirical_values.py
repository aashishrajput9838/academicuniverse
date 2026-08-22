import docx
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v5_docx_path = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.docx"

doc = docx.Document(v5_docx_path)

print("=== CHECKING EMPIRICAL METRICS IN GENERATED DOCX ===")
full_text = " ".join([p.text for p in doc.paragraphs])

metrics = ["74.60%", "82.18%", "75.23%", "11.35%", "8.21%", "1853.0005", "MiniCPM-V", "Ollama"]
for m in metrics:
    print(f"'{m}': {m in full_text}")
