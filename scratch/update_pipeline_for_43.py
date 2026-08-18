import re
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
script_path = workspace / "scratch" / "generate_paperv5_from_v4_baseline.py"

with open(script_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update Section 4.3 restructuring logic in pipeline script
old_sec59_block = """# 5. Pipeline Fix: Insert Section 5.9 (Classical Machine Learning Classification Benchmark)"""

new_sec43_and_59_block = """# 4.1 Restructure Section 4.3 into Subsections 4.3.1 to 4.3.6
sec43_idx = None
for i, p in enumerate(doc.paragraphs):
    if p.text.strip().startswith("4.3 Evaluation Metrics") or p.text.strip().startswith("4.3 Mathematical Formulation"):
        sec43_idx = i
        break

if sec43_idx is not None:
    doc.paragraphs[sec43_idx].text = "4.3 Mathematical Formulation of Evaluation Metrics"
    set_paragraph_outline_level(doc.paragraphs[sec43_idx], 0)
    
    # Locate Section 4.3 item paragraphs (1. to 6.)
    sec5_idx = None
    for j in range(sec43_idx + 1, len(doc.paragraphs)):
        if doc.paragraphs[j].text.strip().startswith("5. Results & Empirical Validation"):
            sec5_idx = j
            break
            
    if sec5_idx is not None:
        p_sec5 = doc.paragraphs[sec5_idx]
        
        # Remove old monolithic metric paragraphs between sec43_idx+1 and sec5_idx
        for k in range(sec5_idx - 1, sec43_idx + 1, -1):
            p_rem = doc.paragraphs[k]
            p_rem.text = ""

        # Insert 4.3.1 - 4.3.6 structured subsections before Section 5
        subsections_43 = [
            ("The quantitative evaluation metrics formulated for evaluating neural document intelligence models, synthetic specimen benchmark suites, and canonical normalization layers are defined below.", None, None),
            
            ("4.3.1 Category Classification Accuracy",
             "The proportion of document specimens where the predicted document category (\u0177_i) matches the ground truth category (y_i) across N total evaluated specimens:",
             "Acc_cat = (1 / N) * sum_{i=1}^N I(\u0177_i = y_i)   (1)\nwhere N represents the total count of evaluated document specimens."),
             
            ("4.3.2 Field Extraction Precision, Recall, and F1-Score",
             "Macro-averaged key-value field extraction metrics across all extracted target entities:",
             "Precision = TP / (TP + FP), Recall = TP / (TP + FN), F1 = (2 * Precision * Recall) / (Precision + Recall)   (2)"),
             
            ("4.3.3 Character Error Rate (CER)",
             "Levenshtein character edit distance [21] between canonically normalized predicted field strings (\u015d) and expected ground truth field strings (s), normalized by total ground truth character length (|s|):",
             "CER = D_char(\u015d, s) / |s|   (3)"),
             
            ("4.3.4 Word Error Rate (WER)",
             "Tokenized word-level edit distance [20] between predicted field strings (\u0175) and ground truth field strings (w), normalized by total ground truth word count (|w|):",
             "WER = D_word(\u0175, w) / |w|   (4)"),
             
            ("4.3.5 Joint Record Exact Match Rate (EM)",
             "The percentage of specimens that achieve both 100% key-value field extraction (F1 = 1.0) AND correct top-level category classification simultaneously:",
             "EM = (1 / N) * sum_{i=1}^N I(\u0177_i = y_i AND F1_i = 1.0)   (5)"),
             
            ("4.3.6 Execution Latency & Throughput",
             "Execution latency per specimen (L_proc) measured in milliseconds per sample (ms/sample) and framework processing throughput (TH) measured in specimens per second (samples/sec):",
             "L_proc = T_total / N, TH = N / T_total   (6)")
        ]
        
        for item in subsections_43:
            heading, desc, eq = item
            if heading and heading.startswith("4.3."):
                p_h = p_sec5.insert_paragraph_before(heading)
                p_h.paragraph_format.space_before = Pt(8)
                p_h.paragraph_format.space_after = Pt(2)
                if p_h.runs:
                    r = p_h.runs[0]
                    r.font.name = "Times New Roman"
                    r.font.size = Pt(10.5)
                    r.bold = True
                set_paragraph_outline_level(p_h, 1)
            elif heading and not heading.startswith("4.3."):
                p_intro = p_sec5.insert_paragraph_before(heading)
                p_intro.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                p_intro.paragraph_format.space_after = Pt(4)
                
            if desc:
                p_d = p_sec5.insert_paragraph_before(desc)
                p_d.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                p_d.paragraph_format.space_after = Pt(2)
                
            if eq:
                p_eq = p_sec5.insert_paragraph_before(eq)
                p_eq.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_eq.paragraph_format.space_after = Pt(6)
                if p_eq.runs:
                    r = p_eq.runs[0]
                    r.font.name = "Times New Roman"
                    r.font.size = Pt(9.5)
                    r.font.italic = True

# 5. Pipeline Fix: Insert Section 5.9 (Classical Machine Learning Classification Benchmark)"""

code = code.replace(old_sec59_block, new_sec43_and_59_block)

# 2. Update TOC entries array to include 4.3.1 - 4.3.6
old_toc_sec43 = '    ("4.3 Mathematical Formulation of Evaluation Metrics", "14", 1),'

new_toc_sec43 = """    ("4.3 Mathematical Formulation of Evaluation Metrics", "14", 1),
    ("4.3.1 Category Classification Accuracy", "14", 2),
    ("4.3.2 Field Extraction Precision, Recall, and F1-Score", "14", 2),
    ("4.3.3 Character Error Rate (CER)", "14", 2),
    ("4.3.4 Word Error Rate (WER)", "15", 2),
    ("4.3.5 Joint Record Exact Match Rate (EM)", "15", 2),
    ("4.3.6 Execution Latency & Throughput", "15", 2),"""

code = code.replace(old_toc_sec43, new_toc_sec43)

with open(script_path, "w", encoding="utf-8") as f:
    f.write(code)

print("[SUCCESS] Updated generate_paperv5_from_v4_baseline.py with Section 4.3 restructuring!")
