import os
import re
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def create_journal_manuscript():
    doc = docx.Document()
    
    # 1. Page Setup: Standard 1-inch margins
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        section.page_width = Inches(8.5)
        section.page_height = Inches(11.0)

    # Styling helper colors
    NAVY_HEX = "1B365D"
    DARK_TEXT_HEX = "2C3E50"
    LIGHT_BG_HEX = "F4F6F9"
    BORDER_HEX = "D0D7DE"

    NAVY_COLOR = RGBColor(0x1B, 0x36, 0x5D)
    DARK_COLOR = RGBColor(0x2C, 0x3E, 0x50)
    BODY_COLOR = RGBColor(0x22, 0x22, 0x22)
    MUTED_COLOR = RGBColor(0x55, 0x55, 0x55)

    def set_cell_background(cell, hex_color):
        shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
        cell._tc.get_or_add_tcPr().append(shading_elm)

    def set_cell_margins(cell, top=120, bottom=120, left=180, right=180):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
        tcPr.append(tcMar)

    def set_table_borders(table, color=BORDER_HEX, sz="4", val="single"):
        tblPr = table._tbl.tblPr
        borders = parse_xml(f'<w:tblBorders {nsdecls("w")}><w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/><w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/><w:left w:val="none"/><w:right w:val="none"/><w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/><w:insideV w:val="none"/></w:tblBorders>')
        tblPr.append(borders)

    # Base Normal Style
    normal_style = doc.styles['Normal']
    normal_font = normal_style.font
    normal_font.name = 'Calibri'
    normal_font.size = Pt(11)
    normal_font.color.rgb = BODY_COLOR
    normal_style.paragraph_format.line_spacing = 1.15
    normal_style.paragraph_format.space_after = Pt(6)

    # Read research_paper.md
    base_dir = os.path.join(os.getcwd(), 'paper-draft-v1')
    paper_md_path = os.path.join(base_dir, 'research_paper.md')

    with open(paper_md_path, 'r', encoding='utf-8') as f:
        md_text = f.read()

    # Read Table Markdown files
    tables_dir = os.path.join(base_dir, 'tables')
    table_files = {}
    if os.path.exists(tables_dir):
        for t_file in os.listdir(tables_dir):
            if t_file.endswith('.md'):
                t_path = os.path.join(tables_dir, t_file)
                with open(t_path, 'r', encoding='utf-8') as tf:
                    table_files[t_file] = tf.read()

    # Figures directory
    figures_dir = os.path.join(base_dir, 'figures')

    # Mapping of sections to figures and tables
    fig_map = {
        '9.1 System Overview': ('fig1_overall_architecture.png', 'Figure 1: AU DIC Four-Tier Microservice Architecture showing Presentation, API, Service, and Data layers with Multi-Tenant Organization Isolation.'),
        '9.3 Document Processing Pipeline': ('fig2_dic_pipeline.png', 'Figure 2: End-to-End Document Intelligence Pipeline from Upload Validation through AI Orchestration to HITL Staging.'),
        '9.4 Transaction-Safe Soft Deletion': ('fig4_transaction_sequence.png', 'Figure 4: Transaction-Safe Soft Deletion Sequence with MongoDB Session ACID Commit and Fallback Rollback.'),
        '12.2 Benchmark Configuration': ('fig8_benchmark_workflow.png', 'Figure 8: Benchmark Execution and Certification Workflow for Reproducible Experiment Evaluation.'),
        '14.2 Precision Comparison': ('fig5_accuracy_comparison.png', 'Figure 5: Field Extraction Precision Comparison Across Evaluation Systems per Synthetic Document.'),
        '14.3 Latency Breakdown': ('fig6_latency_breakdown.png', 'Figure 6: Mean Latency Decomposition (Upload, AI Inference, DB Staging) per System.'),
        '15.2 HITL Staging Value': ('fig3_hitl_review.png', 'Figure 3: HITL Staging Reviewer Interface with Per-Field Confidence Scores and Inline Correction.'),
        '8. Research Objectives': ('fig7_research_workflow.png', 'Figure 7: Complete Research Paper & Benchmark Infrastructure Artifact Generation Workflow.')
    }

    table_map = {
        '6.1 Enterprise Document Management Systems': ('table1_system_feature_matrix.md', 'Table 1: System Feature Matrix — AU DIC vs. Enterprise Alternatives'),
        '10.1 Layered Architecture': ('table2_tech_stack.md', 'Table 2: Technology Stack and Architecture Specifications'),
        '11.2 Document Categories and Quality Profiles': ('table3_dataset_summary.md', 'Table 3: Synthetic Dataset Summary and Document Quality Profiles'),
        '13.4 System-Level Aggregate Metrics': ('table4_evaluation_metrics.md', 'Table 4: Evaluation Metrics Formal Definitions'),
        '14.1 Overall Performance': ('table6_aggregate_metrics.md', 'Table 6: System-Level Aggregate Performance (EXP-VAL-20260729)'),
        '14. Document-Level Evaluation Results': ('table5_benchmark_results.md', 'Table 5: Document-Level Evaluation Results (EXP-VAL-20260729)'),
        '14.6 Category Breakdown': ('table7_category_breakdown.md', 'Table 7: Category Breakdown and Quality Profile Impact (SYS-PROP Only)'),
        '16. Threats to Validity': ('table8_threats_to_validity.md', 'Table 8: Comprehensive Threats to Validity Matrix'),
        '17. Limitations': ('table9_limitations.md', 'Table 9: System, Data, and Methodological Limitations'),
        '18. Future Work': ('table10_future_work.md', 'Table 10: Multi-Horizon Research Agenda for AU DIC v2.0')
    }

    rendered_figures = set()
    rendered_tables = set()

    def render_markdown_table(doc, table_md_content, title_caption):
        lines = [line.strip() for line in table_md_content.strip().split('\n') if line.strip()]
        
        # Caption
        p_cap = doc.add_paragraph()
        p_cap.paragraph_format.space_before = Pt(14)
        p_cap.paragraph_format.space_after = Pt(4)
        p_cap.paragraph_format.keep_with_next = True
        run_cap = p_cap.add_run(title_caption)
        run_cap.font.name = 'Calibri'
        run_cap.font.size = Pt(10.5)
        run_cap.font.bold = True
        run_cap.font.color.rgb = DARK_COLOR

        # Parse MD table
        table_rows = []
        note_text = ""
        for line in lines:
            if line.startswith('|') and '|' in line[1:]:
                # Check separator line
                if re.match(r'^\|[\s\:\-\|]+\|$', line):
                    continue
                cells = [c.strip() for c in line.split('|')[1:-1]]
                table_rows.append(cells)
            elif line.startswith('>') or 'Note:' in line:
                note_text += " " + line.lstrip('>').strip()

        if not table_rows:
            return

        num_rows = len(table_rows)
        num_cols = max(len(r) for r in table_rows)

        tbl = doc.add_table(rows=num_rows, cols=num_cols)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        set_table_borders(tbl)

        for r_idx, row in enumerate(table_rows):
            tr = tbl.rows[r_idx]
            trPr = tr._tr.get_or_add_trPr()
            trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))

            is_header = (r_idx == 0)
            if is_header:
                trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))

            for c_idx in range(num_cols):
                if c_idx < len(row):
                    cell_text = row[c_idx]
                else:
                    cell_text = ""

                cell = tr.cells[c_idx]
                cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
                set_cell_margins(cell, top=100, bottom=100, left=150, right=150)

                p = cell.paragraphs[0]
                p.paragraph_format.space_before = Pt(2)
                p.paragraph_format.space_after = Pt(2)
                p.paragraph_format.line_spacing = 1.05

                clean_cell_text = re.sub(r'\*\*(.*?)\*\*', r'\1', cell_text)
                clean_cell_text = re.sub(r'\*(.*?)\*', r'\1', clean_cell_text)

                run = p.add_run(clean_cell_text)
                run.font.name = 'Calibri'
                run.font.size = Pt(9.5)

                if is_header:
                    set_cell_background(cell, NAVY_HEX)
                    run.font.bold = True
                    run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
                else:
                    if r_idx % 2 == 1:
                        set_cell_background(cell, "FFFFFF")
                    else:
                        set_cell_background(cell, LIGHT_BG_HEX)
                    if '**' in cell_text or cell_text.startswith('**'):
                        run.font.bold = True
                    run.font.color.rgb = BODY_COLOR

        if note_text:
            p_note = doc.add_paragraph()
            p_note.paragraph_format.space_before = Pt(3)
            p_note.paragraph_format.space_after = Pt(12)
            run_n = p_note.add_run(note_text.strip())
            run_n.font.name = 'Calibri'
            run_n.font.size = Pt(9.0)
            run_n.font.italic = True
            run_n.font.color.rgb = MUTED_COLOR

    def add_figure_image(doc, png_filename, caption_text):
        png_path = os.path.join(figures_dir, png_filename)
        if os.path.exists(png_path):
            p_img = doc.add_paragraph()
            p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_img.paragraph_format.space_before = Pt(14)
            p_img.paragraph_format.space_after = Pt(4)
            p_img.paragraph_format.keep_with_next = True
            
            run_img = p_img.add_run()
            run_img.add_picture(png_path, width=Inches(6.2))

            p_cap = doc.add_paragraph()
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.paragraph_format.space_before = Pt(2)
            p_cap.paragraph_format.space_after = Pt(12)
            run_c = p_cap.add_run(caption_text)
            run_c.font.name = 'Calibri'
            run_c.font.size = Pt(9.5)
            run_c.font.italic = True
            run_c.font.color.rgb = DARK_COLOR

    # Header / Banner
    p_banner = doc.add_paragraph()
    p_banner.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_banner.paragraph_format.space_after = Pt(4)
    run_b = p_banner.add_run("ACADEMIC UNIVERSE DOCUMENT INTELLIGENCE CORE (AU DIC)")
    run_b.font.name = 'Calibri'
    run_b.font.size = Pt(10)
    run_b.font.bold = True
    run_b.font.color.rgb = NAVY_COLOR

    p_subbanner = doc.add_paragraph()
    p_subbanner.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_subbanner.paragraph_format.space_after = Pt(16)
    run_sb = p_subbanner.add_run("Official Research Manuscript • Version 1.0.0 Certified Baseline • EXP-VAL-20260729")
    run_sb.font.name = 'Calibri'
    run_sb.font.size = Pt(9)
    run_sb.font.italic = True
    run_sb.font.color.rgb = MUTED_COLOR

    # Title
    title = "Human-in-the-Loop Multimodal Document Intelligence for Verifiable Academic Credential Parsing in Multi-Tenant SaaS Environments"
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(10)
    p_title.paragraph_format.space_after = Pt(16)
    run_t = p_title.add_run(title)
    run_t.font.name = 'Calibri Light'
    run_t.font.size = Pt(22)
    run_t.font.bold = True
    run_t.font.color.rgb = NAVY_COLOR

    # Author Metadata Block
    p_auth = doc.add_paragraph()
    p_auth.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_auth.paragraph_format.space_after = Pt(20)
    run_a = p_auth.add_run("Academic Universe Research & Infrastructure Team\nDepartment of Computer Science & Engineering • Academic Universe Inc.\nContact: research@academicuniverse.com")
    run_a.font.name = 'Calibri'
    run_a.font.size = Pt(10)
    run_a.font.color.rgb = DARK_COLOR

    # Parse sections
    sections = re.split(r'\n(?=##\s+)', md_text)

    for sec in sections:
        sec_str = sec.strip()
        if not sec_str:
            continue

        lines = sec_str.split('\n')
        header_line = lines[0].strip()

        if header_line.startswith('# '):
            continue
        elif header_line.startswith('## '):
            h_text = header_line.replace('## ', '').strip()
            
            if h_text.lower() in ['1. title', 'title']:
                continue

            # Heading 1
            p_h1 = doc.add_paragraph()
            p_h1.paragraph_format.space_before = Pt(16)
            p_h1.paragraph_format.space_after = Pt(6)
            p_h1.paragraph_format.keep_with_next = True
            run_h1 = p_h1.add_run(h_text)
            run_h1.font.name = 'Calibri Light'
            run_h1.font.size = Pt(14)
            run_h1.font.bold = True
            run_h1.font.color.rgb = NAVY_COLOR

            body_lines = lines[1:]
            
            # Box formatting for Abstract & Keywords
            if 'abstract' in h_text.lower() or 'keywords' in h_text.lower():
                full_body = " ".join([l.strip() for l in body_lines if l.strip() and not l.strip().startswith('---')])
                tbl_box = doc.add_table(rows=1, cols=1)
                tbl_box.alignment = WD_TABLE_ALIGNMENT.CENTER
                cell_box = tbl_box.cell(0, 0)
                set_cell_background(cell_box, LIGHT_BG_HEX)
                set_cell_margins(cell_box, top=140, bottom=140, left=200, right=200)
                
                tcPr = cell_box._tc.get_or_add_tcPr()
                borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="24" w:space="0" w:color="{NAVY_HEX}"/><w:top w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/></w:tcBorders>')
                tcPr.append(borders)

                p_b = cell_box.paragraphs[0]
                p_b.paragraph_format.space_before = Pt(2)
                p_b.paragraph_format.space_after = Pt(2)
                p_b.paragraph_format.line_spacing = 1.15
                
                run_bx = p_b.add_run(full_body)
                run_bx.font.name = 'Calibri'
                run_bx.font.size = Pt(10.5)
                if 'keywords' in h_text.lower():
                    run_bx.font.italic = True
                    run_bx.font.color.rgb = DARK_COLOR
                else:
                    run_bx.font.color.rgb = BODY_COLOR
                continue

            # Process body lines
            for b_line in body_lines:
                b_str = b_line.strip()
                if not b_str or b_str == '---':
                    continue

                # Subheadings (###)
                if b_str.startswith('### '):
                    sub_h = b_str.replace('### ', '').strip()
                    p_sub = doc.add_paragraph()
                    p_sub.paragraph_format.space_before = Pt(12)
                    p_sub.paragraph_format.space_after = Pt(4)
                    p_sub.paragraph_format.keep_with_next = True
                    run_sub = p_sub.add_run(sub_h)
                    run_sub.font.name = 'Calibri'
                    run_sub.font.size = Pt(12)
                    run_sub.font.bold = True
                    run_sub.font.color.rgb = DARK_COLOR

                    # Check figures & tables
                    for key in fig_map:
                        if key not in rendered_figures and key.lower() in sub_h.lower():
                            png_f, cap_f = fig_map[key]
                            add_figure_image(doc, png_f, cap_f)
                            rendered_figures.add(key)
                    for key in table_map:
                        if key not in rendered_tables and key.lower() in sub_h.lower():
                            tbl_f, tbl_cap = table_map[key]
                            if tbl_f in table_files:
                                render_markdown_table(doc, table_files[tbl_f], tbl_cap)
                                rendered_tables.add(key)
                    continue

                # Math equations ($$...$$)
                if b_str.startswith('$$') and b_str.endswith('$$'):
                    eq_text = b_str.strip('$').strip()
                    p_eq = doc.add_paragraph()
                    p_eq.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    p_eq.paragraph_format.space_before = Pt(8)
                    p_eq.paragraph_format.space_after = Pt(8)
                    run_eq = p_eq.add_run(eq_text)
                    run_eq.font.name = 'Cambria Math'
                    run_eq.font.size = Pt(11)
                    run_eq.font.italic = True
                    run_eq.font.color.rgb = NAVY_COLOR
                    continue

                # Bullet points
                if b_str.startswith('- ') or b_str.startswith('* '):
                    p_bullet = doc.add_paragraph(style='List Bullet')
                    p_bullet.paragraph_format.space_before = Pt(1)
                    p_bullet.paragraph_format.space_after = Pt(3)
                    p_bullet.paragraph_format.line_spacing = 1.15
                    
                    bullet_text = b_str[2:].strip()
                    if '**' in bullet_text:
                        parts = bullet_text.split('**')
                        for idx, pt in enumerate(parts):
                            r = p_bullet.add_run(pt)
                            r.font.name = 'Calibri'
                            r.font.size = Pt(11)
                            if idx % 2 == 1:
                                r.font.bold = True
                                r.font.color.rgb = DARK_COLOR
                            else:
                                r.font.color.rgb = BODY_COLOR
                    else:
                        r = p_bullet.add_run(bullet_text)
                        r.font.name = 'Calibri'
                        r.font.size = Pt(11)
                        r.font.color.rgb = BODY_COLOR
                    continue

                # References (Section 20 hanging indent)
                if 'references' in h_text.lower():
                    p_ref = doc.add_paragraph()
                    p_ref.paragraph_format.left_indent = Inches(0.3)
                    p_ref.paragraph_format.first_line_indent = Inches(-0.3)
                    p_ref.paragraph_format.space_before = Pt(2)
                    p_ref.paragraph_format.space_after = Pt(4)
                    r_ref = p_ref.add_run(b_str)
                    r_ref.font.name = 'Calibri'
                    r_ref.font.size = Pt(10)
                    r_ref.font.color.rgb = BODY_COLOR
                    continue

                # Standard Paragraph
                p_p = doc.add_paragraph()
                p_p.paragraph_format.space_before = Pt(2)
                p_p.paragraph_format.space_after = Pt(6)
                p_p.paragraph_format.line_spacing = 1.15

                tokens = re.split(r'(\*\*.*?\*\*|\*.*?\*|`.*?`)', b_str)
                for tok in tokens:
                    if not tok:
                        continue
                    if tok.startswith('**') and tok.endswith('**'):
                        r = p_p.add_run(tok[2:-2])
                        r.font.bold = True
                        r.font.color.rgb = DARK_COLOR
                    elif tok.startswith('*') and tok.endswith('*'):
                        r = p_p.add_run(tok[1:-1])
                        r.font.italic = True
                    elif tok.startswith('`') and tok.endswith('`'):
                        r = p_p.add_run(tok[1:-1])
                        r.font.name = 'Consolas'
                        r.font.size = Pt(10)
                        r.font.color.rgb = NAVY_COLOR
                    else:
                        r = p_p.add_run(tok)

                # Check figure/table maps for main sections
                for key in fig_map:
                    if key not in rendered_figures and key.lower() in h_text.lower():
                        png_f, cap_f = fig_map[key]
                        add_figure_image(doc, png_f, cap_f)
                        rendered_figures.add(key)
                for key in table_map:
                    if key not in rendered_tables and key.lower() in h_text.lower():
                        tbl_f, tbl_cap = table_map[key]
                        if tbl_f in table_files:
                            render_markdown_table(doc, table_files[tbl_f], tbl_cap)
                            rendered_tables.add(key)

    # Ensure any remaining unrendered tables/figures are appended at their relevant locations
    for key, (png_f, cap_f) in fig_map.items():
        if key not in rendered_figures:
            add_figure_image(doc, png_f, cap_f)
            rendered_figures.add(key)

    for key, (tbl_f, tbl_cap) in table_map.items():
        if key not in rendered_tables and tbl_f in table_files:
            render_markdown_table(doc, table_files[tbl_f], tbl_cap)
            rendered_tables.add(key)

    out_docx_path = os.path.join(base_dir, 'AU_DIC_Research_Paper_v1.docx')
    try:
        doc.save(out_docx_path)
        print(f"Successfully generated publication-ready manuscript at: {out_docx_path}")
    except PermissionError:
        alt_path = os.path.join(base_dir, 'AU_DIC_Research_Paper_v1_final.docx')
        doc.save(alt_path)
        print(f"File locked. Successfully generated publication-ready manuscript at: {alt_path}")

if __name__ == '__main__':
    create_journal_manuscript()
