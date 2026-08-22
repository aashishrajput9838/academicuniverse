import re
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
script_path = workspace / "scratch" / "generate_paperv5_from_v4_baseline.py"

with open(script_path, "r", encoding="utf-8") as f:
    code = f.read()

abstract_code_block = """# 0. Pipeline Fix: Set Exact New Paper Title
p_title_orig = doc.paragraphs[0]
p_title_orig.text = "Smart Academic Document Intelligence System: Automated Extraction, Normalization, and Benchmark Generation"
p_title_orig.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_title_orig.paragraph_format.space_before = Pt(0)
p_title_orig.paragraph_format.space_after = Pt(12)
if p_title_orig.runs:
    for r in p_title_orig.runs:
        r.font.name = "Times New Roman"
        r.font.size = Pt(20)
        r.bold = True

# 0.1 Pipeline Fix: Set Exact Final Abstract and Index Terms
exact_abstract_text = (
    "Academic document intelligence systems are increasingly used to extract information from "
    "certificates, marksheets, transcripts, and student identification documents, but evaluating "
    "such systems is challenging because real academic records contain sensitive student information "
    "and cannot be freely distributed for benchmarking. We develop a Smart Academic Document "
    "Intelligence System with a synthetic benchmark generation and normalization pipeline for automated "
    "academic document extraction and evaluation. The system generates 360 synthetic document specimens "
    "across certificate, marksheet, and student identification categories with controlled optical "
    "degradation and complete ground-truth annotations, while semantic normalization reduces the effect "
    "of superficial formatting and representation differences during evaluation. In the canonical live "
    "evaluation using MiniCPM-V (7.6B, Q4_0) through the local Ollama runtime, the system achieved "
    "75.23% field-level F1, 74.60% raw exact match, 82.18% normalized exact match, and 11.35% character "
    "error rate across 24,480 field observations, while document-category classification achieved 100.00% "
    "accuracy. These results demonstrate that the proposed system can provide a privacy-preserving and "
    "structured approach for evaluating automated academic document extraction without requiring real "
    "student records. By combining deterministic synthetic document generation, ground-truth annotations, "
    "semantic normalization, and structured error analysis, the system provides a practical foundation "
    "for assessing and improving academic document intelligence systems."
)

exact_index_terms = (
    "Academic Document Intelligence, Document Extraction, Synthetic Benchmark Generation, "
    "Information Extraction, Semantic Normalization, OCR Error Analysis, Optical Degradation, Document Evaluation"
)

# Locate Abstract and Index Terms paragraphs
abstract_hdr_idx = None
for i, p in enumerate(doc.paragraphs):
    text_str = p.text.strip()
    if text_str == "Abstract" or text_str.startswith("Abstract"):
        abstract_hdr_idx = i
        break

if abstract_hdr_idx is not None:
    # Clear old Abstract title P61 and extra paragraph P63
    doc.paragraphs[abstract_hdr_idx].text = ""
    
    p_abs = doc.paragraphs[abstract_hdr_idx + 1]
    p_abs.text = ""
    p_abs.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_abs.paragraph_format.space_before = Pt(8)
    p_abs.paragraph_format.space_after = Pt(6)
    
    r_abs_label = p_abs.add_run("Abstract—")
    r_abs_label.font.name = "Times New Roman"
    r_abs_label.font.size = Pt(10)
    r_abs_label.bold = True
    r_abs_label.font.italic = True
    
    r_abs_body = p_abs.add_run(exact_abstract_text)
    r_abs_body.font.name = "Times New Roman"
    r_abs_body.font.size = Pt(10)
    
    # Clear second old abstract paragraph P63 if present
    p_next = doc.paragraphs[abstract_hdr_idx + 2]
    if not p_next.text.strip().startswith("Index Terms"):
        p_next.text = ""
        
    # Set Index Terms
    for j in range(abstract_hdr_idx + 2, abstract_hdr_idx + 6):
        p_idx = doc.paragraphs[j]
        if "Index Terms" in p_idx.text:
            p_idx.text = ""
            p_idx.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p_idx.paragraph_format.space_after = Pt(12)
            
            r_it_label = p_idx.add_run("Index Terms—")
            r_it_label.font.name = "Times New Roman"
            r_it_label.font.size = Pt(10)
            r_it_label.bold = True
            r_it_label.font.italic = True
            
            r_it_body = p_idx.add_run(exact_index_terms)
            r_it_body.font.name = "Times New Roman"
            r_it_body.font.size = Pt(10)
            r_it_body.bold = True
            break"""

target_old_block = """# 0. Pipeline Fix: Set Exact New Paper Title
p_title_orig = doc.paragraphs[0]
p_title_orig.text = "Smart Academic Document Intelligence System: Automated Extraction, Normalization, and Benchmark Generation"
p_title_orig.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_title_orig.paragraph_format.space_before = Pt(0)
p_title_orig.paragraph_format.space_after = Pt(12)
if p_title_orig.runs:
    for r in p_title_orig.runs:
        r.font.name = "Times New Roman"
        r.font.size = Pt(20)
        r.bold = True"""

assert target_old_block in code, "Target title block not found in pipeline script!"

code = code.replace(target_old_block, abstract_code_block)

with open(script_path, "w", encoding="utf-8") as f:
    f.write(code)

print("[SUCCESS] Updated generate_paperv5_from_v4_baseline.py with exact final Abstract and Index Terms!")
