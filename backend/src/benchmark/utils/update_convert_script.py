"""
Update convert_production_ieee.py script to handle all 7 sequential figures cleanly.
"""

import re

script_path = r"c:\github\academicuniverse.com\academicuniverse\backend\src\benchmark\utils\convert_production_ieee.py"

with open(script_path, "r", encoding="utf-8") as f:
    code = f.read()

# Replace function signature & figure routing logic
old_mermaid_block = """                    if "ADBG Subsystem" in mermaid_str or "Seed Generator" in mermaid_str:
                        if os.path.exists(fig1_path):
                            p_img.add_run().add_picture(fig1_path, width=Inches(6.5))
                            p_cap = doc.add_paragraph()
                            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
                            p_cap.paragraph_format.space_after = Pt(8)
                            r_cap = p_cap.add_run("Fig. 1. Decoupled System Architecture of the ADBG Synthetic Generation and AU DIC Evaluation Subsystems.")
                            r_cap.font.name = "Times New Roman"
                            r_cap.font.size = Pt(9.5)
                            r_cap.bold = True
                            r_cap.font.color.rgb = RGBColor(0, 51, 102)
                    elif "Option B" in mermaid_str or "Zero-Shot" in mermaid_str or "Groq Cloud" in mermaid_str:
                        if os.path.exists(fig2_path):
                            p_img.add_run().add_picture(fig2_path, width=Inches(6.5))
                            p_cap = doc.add_paragraph()
                            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
                            p_cap.paragraph_format.space_after = Pt(8)
                            r_cap = p_cap.add_run("Fig. 2. Option B Zero-Shot Text-Prompted Neural LLM Evaluation Pipeline Architecture.")
                            r_cap.font.name = "Times New Roman"
                            r_cap.font.size = Pt(9.5)
                            r_cap.bold = True
                            r_cap.font.color.rgb = RGBColor(0, 51, 102)"""

new_mermaid_block = """                    if "ADBG Subsystem" in mermaid_str or "Seed Generator" in mermaid_str:
                        if os.path.exists(fig1_path):
                            p_img.add_run().add_picture(fig1_path, width=Inches(6.5))
                            p_cap = doc.add_paragraph()
                            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
                            p_cap.paragraph_format.space_after = Pt(8)
                            r_cap = p_cap.add_run("Fig. 1. Decoupled System Architecture of the ADBG Synthetic Generation and AU DIC Evaluation Subsystems.")
                            r_cap.font.name = "Times New Roman"
                            r_cap.font.size = Pt(9.5)
                            r_cap.bold = True
                            r_cap.font.color.rgb = RGBColor(0, 51, 102)
                    elif "Phase I: Synthetic Benchmark Generation" in mermaid_str or "End-to-End Methodological Workflow" in mermaid_str:
                        wf_img = r"c:\\github\\academicuniverse.com\\academicuniverse\\methodology_workflow_300dpi.png"
                        if os.path.exists(wf_img):
                            p_img.add_run().add_picture(wf_img, width=Inches(6.5))
                            p_cap = doc.add_paragraph()
                            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
                            p_cap.paragraph_format.space_after = Pt(8)
                            r_cap = p_cap.add_run("Fig. 2. End-to-End Methodological Workflow of the Proposed AU DIC Benchmark Evaluation Framework.")
                            r_cap.font.name = "Times New Roman"
                            r_cap.font.size = Pt(9.5)
                            r_cap.bold = True
                            r_cap.font.color.rgb = RGBColor(0, 51, 102)
                    elif "Option B" in mermaid_str or "Zero-Shot" in mermaid_str or "Groq Cloud" in mermaid_str:
                        if os.path.exists(fig2_path):
                            p_img.add_run().add_picture(fig2_path, width=Inches(6.5))
                            p_cap = doc.add_paragraph()
                            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
                            p_cap.paragraph_format.space_after = Pt(8)
                            r_cap = p_cap.add_run("Fig. 3. Option B Zero-Shot Text-Prompted Neural LLM Evaluation Pipeline Architecture.")
                            r_cap.font.name = "Times New Roman"
                            r_cap.font.size = Pt(9.5)
                            r_cap.bold = True
                            r_cap.font.color.rgb = RGBColor(0, 51, 102)"""

code = code.replace(old_mermaid_block, new_mermaid_block)

# Update figure 4, 5, 6, 7 insertion in Table/Fig handler
old_fig_handler = """        elif line.startswith('**Table ') or line.startswith('**Fig. ') or line.startswith('**Figure '):
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(4)
            p.paragraph_format.keep_with_next = True
            format_inline_markdown(p, line.strip())
            for run in p.runs:
                run.font.name = 'Times New Roman'
                run.font.size = Pt(9.5)
                run.bold = True
                run.font.color.rgb = RGBColor(0, 51, 102)"""

new_fig_handler = """        elif line.startswith('**Table ') or line.startswith('**Fig. ') or line.startswith('**Figure '):
            # Check for figure image insertions
            brain_dir = r"C:\\Users\\elitebook840g89319\\.gemini\\antigravity-ide\\brain\\bb9b3069-0e60-4209-b2b8-d0321ac491db"
            fig_map = {
                "Fig. 4": os.path.join(brain_dir, "figure_normalization_ablation.png"),
                "Fig. 5": os.path.join(brain_dir, "figure_metric_improvement.png"),
                "Fig. 6": os.path.join(brain_dir, "figure_rule_contribution.png"),
                "Fig. 7": os.path.join(brain_dir, "figure_field_improvement.png")
            }
            for fig_key, img_path in fig_map.items():
                if fig_key in line:
                    if os.path.exists(img_path):
                        p_fig = doc.add_paragraph()
                        p_fig.alignment = WD_ALIGN_PARAGRAPH.CENTER
                        p_fig.paragraph_format.space_before = Pt(8)
                        p_fig.paragraph_format.space_after = Pt(4)
                        p_fig.add_run().add_picture(img_path, width=Inches(6.0))
                    break

            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(8)
            p.paragraph_format.keep_with_next = True
            format_inline_markdown(p, line.strip())
            for run in p.runs:
                run.font.name = 'Times New Roman'
                run.font.size = Pt(9.5)
                run.bold = True
                run.font.color.rgb = RGBColor(0, 51, 102)"""

code = code.replace(old_fig_handler, new_fig_handler)

with open(script_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Updated convert_production_ieee.py successfully!")
