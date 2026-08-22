import docx
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v5_docx_path = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.docx"

assert v5_docx_path.exists(), "PaperV5_Ollama_Primary.docx missing!"

doc = docx.Document(v5_docx_path)

print("============================================================")
print(" FOOTER CLEANUP VERIFICATION REPORT")
print("============================================================")

dummy_found = False
for s_idx, section in enumerate(doc.sections):
    footer = section.footer
    for p in footer.paragraphs:
        if "IEEE ACCESS" in p.text or "Page" in p.text:
            dummy_found = True
            print(f"Section {s_idx} Footer P: '{p.text}'")

print(f"Dummy 'IEEE ACCESS | Volume 14, 2026 | Page' Found: {dummy_found}")
print(f"Footer Status: {'CLEAN' if not dummy_found else 'UNCLEAN'}")
print("============================================================")

assert not dummy_found, "Error: Dummy footer string still present!"
