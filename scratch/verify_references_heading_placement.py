import docx
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v5_docx_path = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.docx"

assert v5_docx_path.exists(), "PaperV5_Ollama_Primary.docx missing!"

doc = docx.Document(v5_docx_path)

ref_hdr_idx = None
ref1_idx = None
ref50_idx = None
ref_count = 0

for i, p in enumerate(doc.paragraphs):
    text_str = p.text.strip()
    if text_str == "REFERENCES":
        ref_hdr_idx = i
        print(f"Verified: Found REFERENCES heading at paragraph P{i} [{p.style.name}] (bold={p.runs[0].bold if p.runs else False}, font_size={p.runs[0].font.size if p.runs else None})")
    elif text_str.startswith("[1] "):
        ref1_idx = i
    elif text_str.startswith("[50] "):
        ref50_idx = i
    
    if text_str.startswith("[") and "]" in text_str and text_str[1:text_str.find("]")].isdigit():
        ref_count += 1

print("============================================================")
print(" REFERENCES HEADING PLACEMENT VERIFICATION REPORT")
print("============================================================")
print(f"REFERENCES Heading Index:         Paragraph P{ref_hdr_idx}")
print(f"Reference [1] Entry Index:         Paragraph P{ref1_idx}")
print(f"Immediate Precedence Verified:     {ref_hdr_idx == ref1_idx - 1}")
print(f"Reference [50] Entry Index:        Paragraph P{ref50_idx}")
print(f"Total Bibliography Entries Count: {ref_count} (Expected: 50)")
print("============================================================")

assert ref_hdr_idx == ref1_idx - 1, "Error: REFERENCES heading is not immediately before [1]!"
assert ref_count == 50, f"Error: Expected 50 references, found {ref_count}!"
