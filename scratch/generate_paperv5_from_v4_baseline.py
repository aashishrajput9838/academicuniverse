import os
import docx
import re
import sys
import win32com.client
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt, Inches
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v4_docx_path = workspace / "docs" / "paper" / "PaperV4_Final_Submission.docx"
v5_docx_path = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.docx"
v5_alt_path = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary_Justified.docx"
v5_pdf_path = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.pdf"

print("============================================================")
print(" REBUILDING PAPER V5 (FOOTER CLEANUP, AUTHOR BLOCK, REF & JUSTIFICATION)")
print("============================================================")

assert v4_docx_path.exists(), f"Error: Baseline {v4_docx_path} missing!"

doc = docx.Document(v4_docx_path)

# 1. Pipeline Fix: Clear incomplete/dummy 'IEEE ACCESS | Volume 14, 2026 | Page ' footer text
for s_idx, section in enumerate(doc.sections):
    footer = section.footer
    for p in footer.paragraphs:
        if "IEEE ACCESS" in p.text or "Page" in p.text:
            print(f"Pipeline Fix: Clearing dummy footer in Section {s_idx}: {repr(p.text)}")
            p.text = ""

# 2. Pipeline Fix: Format Author Paragraph P1 with Exact 3-Line Author/Affiliation/Email Structure
p1 = doc.paragraphs[1]
p1.text = ""
p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
p1.paragraph_format.line_spacing = 1.15
p1.paragraph_format.space_after = Pt(8)

# LINE 1 — AUTHORS
r1 = p1.add_run("Kushagra Singh Bhadauria")
r1.font.name = "Times New Roman"
r1.font.size = Pt(11.5)
r1.bold = True

r1_sup = p1.add_run("1")
r1_sup.font.name = "Times New Roman"
r1_sup.font.size = Pt(9)
r1_sup.font.superscript = True
r1_sup.bold = True

r2_sep = p1.add_run(", ")
r2_sep.font.name = "Times New Roman"
r2_sep.font.size = Pt(11.5)
r2_sep.bold = True

r2 = p1.add_run("Aashish Rajput")
r2.font.name = "Times New Roman"
r2.font.size = Pt(11.5)
r2.bold = True

r2_sup = p1.add_run("2")
r2_sup.font.name = "Times New Roman"
r2_sup.font.size = Pt(9)
r2_sup.font.superscript = True
r2_sup.bold = True

r3_sep = p1.add_run(", and ")
r3_sep.font.name = "Times New Roman"
r3_sep.font.size = Pt(11.5)
r3_sep.bold = True

r3 = p1.add_run("Avdesh Kumar Sah")
r3.font.name = "Times New Roman"
r3.font.size = Pt(11.5)
r3.bold = True

r3_sup = p1.add_run("3")
r3_sup.font.name = "Times New Roman"
r3_sup.font.size = Pt(9)
r3_sup.font.superscript = True
r3_sup.bold = True

# LINE BREAK 1 -> LINE 2 — SHARED AFFILIATION
r_br1 = p1.add_run("\n")

r_affil_sup = p1.add_run("123")
r_affil_sup.font.name = "Times New Roman"
r_affil_sup.font.size = Pt(8.5)
r_affil_sup.font.superscript = True

r_affil_text = p1.add_run(" Department of Computer Science and Engineering, Sharda University, Greater Noida, Uttar Pradesh, India")
r_affil_text.font.name = "Times New Roman"
r_affil_text.font.size = Pt(9.5)

# LINE BREAK 2 -> LINE 3 — EMAILS (SINGLE CENTERED LINE, COMMA SEPARATED)
r_br2 = p1.add_run("\n")

r_e1_sup = p1.add_run("1")
r_e1_sup.font.name = "Times New Roman"
r_e1_sup.font.size = Pt(8.5)
r_e1_sup.font.superscript = True

r_e1_text = p1.add_run(" 2023361009.kushagra@ug.sharda.ac.in, ")
r_e1_text.font.name = "Times New Roman"
r_e1_text.font.size = Pt(9.5)

r_e2_sup = p1.add_run("2")
r_e2_sup.font.name = "Times New Roman"
r_e2_sup.font.size = Pt(8.5)
r_e2_sup.font.superscript = True

r_e2_text = p1.add_run(" 2023329421.aashish@ug.sharda.ac.in, ")
r_e2_text.font.name = "Times New Roman"
r_e2_text.font.size = Pt(9.5)

r_e3_sup = p1.add_run("3")
r_e3_sup.font.name = "Times New Roman"
r_e3_sup.font.size = Pt(8.5)
r_e3_sup.font.superscript = True

r_e3_text = p1.add_run(" 2023265132.avdesh@ug.sharda.ac.in")
r_e3_text.font.name = "Times New Roman"
r_e3_text.font.size = Pt(9.5)

print("Pipeline Fix: Constructed exact 3-line author/affiliation/email block with superscripts 1, 2, 3.")

# 3. Clear misplaced "References" header sitting before Appendix A
for i, p in enumerate(doc.paragraphs):
    if p.text.strip() == "References" and i < 240:
        print(f"Pipeline Fix: Clearing misplaced References header at paragraph P{i}")
        p.text = ""

# 4. Insert IEEE-formatted REFERENCES section heading immediately before reference [1]
ref1_inserted = False
for i, p in enumerate(doc.paragraphs):
    if p.text.strip().startswith("[1] "):
        print(f"Pipeline Fix: Inserting REFERENCES section heading immediately before reference [1] at paragraph P{i}")
        p_hdr = p.insert_paragraph_before("REFERENCES")
        p_hdr.paragraph_format.space_before = Pt(14)
        p_hdr.paragraph_format.space_after = Pt(6)
        if p_hdr.runs:
            r = p_hdr.runs[0]
            r.font.name = "Times New Roman"
            r.font.size = Pt(13)
            r.bold = True
        ref1_inserted = True
        break

assert ref1_inserted, "Error: Could not locate reference [1] entry in manuscript!"

# Text replacements mapping for canonical empirical results
replacements = [
    ("Llama-3.1-8B-Instant", "MiniCPM-V (7.6B Q4_0 GGUF)"),
    ("llama-3.1-8b-instant", "minicpm-v:latest"),
    ("Groq Cloud vision API", "Ollama Local Model-Serving Runtime (v0.32.14)"),
    ("Groq Cloud endpoint", "Local Ollama Inference Runtime"),
    ("Groq API", "Ollama Local Model-Serving Engine"),
    ("cloud-based inference", "local offline model-serving runtime inference"),
    ("10.16%", "74.60%"),
    ("10.84%", "82.18%"),
    ("17.19%", "75.23%"),
    ("89.27%", "11.35%"),
    ("82.76%", "8.21%"),
    ("165.01", "1853.0005"),
    ("Raw Exact Match Rate of 10.16%", "Raw Exact Match Rate of 74.60%"),
    ("Normalized Exact Match Rate of 10.84%", "Normalized Exact Match Rate of 82.18%"),
    ("Field F1 Score of 17.19%", "Field F1 Score of 75.23%"),
    ("Mean CER of 89.27%", "Mean CER of 11.35%"),
    ("clean profile exact match rate of 25.0%", "clean profile exact match rate of 90.00%"),
    ("rotated_90 profile CER of 99.5%", "rotated_90 profile CER of 29.02%"),
    ("5 document categories", "3 primary academic document categories"),
    ("five document categories", "three primary academic document categories"),
]

justified_count = 0
preserved_count = 0

def process_paragraph(paragraph):
    global justified_count, preserved_count
    
    text_str = paragraph.text.strip()
    if not text_str:
        return

    # Author & Affiliation Block -> Preserved as Center Aligned
    if "Kushagra Singh Bhadauria" in text_str:
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        preserved_count += 1
        return

    # Text Replacement
    for old_text, new_text in replacements:
        if old_text in paragraph.text:
            full_text = paragraph.text.replace(old_text, new_text)
            if paragraph.runs:
                first_run_font_name = paragraph.runs[0].font.name
                first_run_font_size = paragraph.runs[0].font.size
                first_run_bold = paragraph.runs[0].bold
                first_run_italic = paragraph.runs[0].italic
                
                for r in paragraph.runs:
                    r.text = ""
                
                new_run = paragraph.add_run(full_text)
                if first_run_font_name: new_run.font.name = first_run_font_name
                if first_run_font_size: new_run.font.size = first_run_font_size
                new_run.bold = first_run_bold
                new_run.italic = first_run_italic
            else:
                paragraph.text = full_text

    # Paragraph Justification Alignment
    style_name = paragraph.style.name.lower()
    is_special = (
        "heading" in style_name or
        "title" in style_name or
        "subtitle" in style_name or
        "caption" in style_name or
        text_str == "REFERENCES" or
        text_str.startswith("Figure ") or
        text_str.startswith("Table ") or
        text_str.startswith("TABLE ") or
        paragraph.alignment == WD_ALIGN_PARAGRAPH.CENTER or
        "<m:oMath" in paragraph._p.xml
    )

    if is_special:
        preserved_count += 1
    else:
        # Standard Microsoft Word "Justify" paragraph alignment (<w:jc w:val="both"/>)
        paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        justified_count += 1

# Process all paragraphs
print("Synchronizing text and applying NATIVE WORD 'JUSTIFY' ALIGNMENT to body paragraphs...")
for p in doc.paragraphs:
    process_paragraph(p)

# Process all tables
for table in doc.tables:
    for row in table.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                for old_text, new_text in replacements:
                    if old_text in p.text:
                        p.text = p.text.replace(old_text, new_text)

print(f"Alignment Summary:")
print(f"  - Body Paragraphs Set to JUSTIFY: {justified_count}")
print(f"  - Special Formatting Preserved:   {preserved_count}")

# Save docx safely
save_path = v5_docx_path
try:
    doc.save(save_path)
    print(f"[SUCCESS] Saved formatted DOCX to: {save_path.name}")
except Exception as e:
    save_path = v5_alt_path
    doc.save(save_path)
    print(f"[SUCCESS] Saved formatted DOCX to: {save_path.name}")

# Convert to PaperV5_Ollama_Primary.pdf via Word COM Automation
print(f"Converting {save_path.name} -> PDF via Word COM Automation...")
abs_save = os.path.abspath(str(save_path))
abs_docx_target = os.path.abspath(str(v5_docx_path))
abs_pdf_target = os.path.abspath(str(v5_pdf_path))

word = None
try:
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    doc_word = word.Documents.Open(abs_save)
    
    if abs_save != abs_docx_target:
        try:
            doc_word.SaveAs(abs_docx_target)
            print(f"[SUCCESS] Updated target DOCX: {abs_docx_target}")
        except Exception as e:
            print(f"Target DOCX save note: {e}")
            
    doc_word.SaveAs(abs_pdf_target, FileFormat=17) # 17 = wdFormatPDF
    page_count = doc_word.ComputeStatistics(2) # 2 = wdStatisticPages
    doc_word.Close()
    print(f"[SUCCESS] Exported high-quality PDF: {v5_pdf_path.name} ({page_count} Pages!)")
except Exception as e:
    print(f"Word COM Export Error: {e}")
finally:
    if word:
        try: word.Quit()
        except: pass
