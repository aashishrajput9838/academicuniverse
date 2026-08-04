"""
Production LaTeX-to-OMML Engine (ECMA-376 OOXML Specification)
===============================================================
Parses LaTeX math strings -> MathML AST (via latex2mathml) -> ECMA-376 OMML XML (via lxml AST)
Generates native Microsoft Word OMML equation objects (<m:oMath> and <m:oMathPara>).
"""
import xml.etree.ElementTree as ET
import re
import latex2mathml.converter
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

MML_NS = "{http://www.w3.org/1998/Math/MathML}"

def mml_to_omml_element(node):
    tag = node.tag.replace(MML_NS, "")
    text = (node.text or "").strip()

    # Leaf nodes: mi, mn, mo, mtext
    if tag in ["mi", "mn", "mo", "mtext"]:
        val = text
        if not val and len(node):
            val = "".join([c.text or "" for c in node])
        
        # Clean entities if unparsed
        val = val.replace("&#x0003D;", "=").replace("&#x0002B;", "+").replace("&#x0002D;", "-")
        val = val.replace("&#x02211;", "∑").replace("&#x1D540;", "𝟙").replace("&#x003C3;", "σ")

        if tag == "mtext":
            r_pr = '<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:i w:val="0"/></w:rPr>'
        else:
            r_pr = '<w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/></w:rPr>'

        import html
        val_safe = html.escape(val)
        return f'<m:r>{r_pr}<m:t>{val_safe}</m:t></m:r>'

    # Fraction: <mfrac> -> <m:f>
    elif tag == "mfrac":
        children = list(node)
        num_xml = "".join([mml_to_omml_element(c) for c in list(children[0])]) if children[0].tag.replace(MML_NS,"")=="mrow" else mml_to_omml_element(children[0])
        den_xml = "".join([mml_to_omml_element(c) for c in list(children[1])]) if children[1].tag.replace(MML_NS,"")=="mrow" else mml_to_omml_element(children[1])
        return f'<m:f><m:num>{num_xml}</m:num><m:den>{den_xml}</m:den></m:f>'

    # Subscript: <msub> -> <m:sSub>
    elif tag == "msub":
        children = list(node)
        e_xml = "".join([mml_to_omml_element(c) for c in list(children[0])]) if children[0].tag.replace(MML_NS,"")=="mrow" else mml_to_omml_element(children[0])
        sub_xml = "".join([mml_to_omml_element(c) for c in list(children[1])]) if children[1].tag.replace(MML_NS,"")=="mrow" else mml_to_omml_element(children[1])
        return f'<m:sSub><m:e>{e_xml}</m:e><m:sub>{sub_xml}</m:sub></m:sSub>'

    # Superscript: <msup> -> <m:sSup>
    elif tag == "msup":
        children = list(node)
        e_xml = "".join([mml_to_omml_element(c) for c in list(children[0])]) if children[0].tag.replace(MML_NS,"")=="mrow" else mml_to_omml_element(children[0])
        sup_xml = "".join([mml_to_omml_element(c) for c in list(children[1])]) if children[1].tag.replace(MML_NS,"")=="mrow" else mml_to_omml_element(children[1])
        return f'<m:sSup><m:e>{e_xml}</m:e><m:sup>{sup_xml}</m:sup></m:sSup>'

    # SubSup / Summation: <msubsup> or <munderover> -> <m:sSubSup> or <m:nary>
    elif tag in ["msubsup", "munderover"]:
        children = list(node)
        first_text = (children[0].text or "").strip()
        e_xml = "".join([mml_to_omml_element(c) for c in list(children[0])]) if children[0].tag.replace(MML_NS,"")=="mrow" else mml_to_omml_element(children[0])
        sub_xml = "".join([mml_to_omml_element(c) for c in list(children[1])]) if children[1].tag.replace(MML_NS,"")=="mrow" else mml_to_omml_element(children[1])
        sup_xml = "".join([mml_to_omml_element(c) for c in list(children[2])]) if children[2].tag.replace(MML_NS,"")=="mrow" else mml_to_omml_element(children[2])
        
        if first_text in ["∑", "&#x02211;", "\\sum"] or "∑" in e_xml:
            return f'<m:nary><m:naryPr><m:chr m:val="∑"/><m:limLoc m:val="undOvr"/></m:naryPr><m:sub>{sub_xml}</m:sub><m:sup>{sup_xml}</m:sup><m:e></m:e></m:nary>'
        return f'<m:sSubSup><m:e>{e_xml}</m:e><m:sub>{sub_xml}</m:sub><m:sup>{sup_xml}</m:sup></m:sSubSup>'

    # Accent (hat, bar): <mover> -> <m:acc>
    elif tag == "mover":
        children = list(node)
        e_xml = "".join([mml_to_omml_element(c) for c in list(children[0])]) if children[0].tag.replace(MML_NS,"")=="mrow" else mml_to_omml_element(children[0])
        return f'<m:acc><m:accPr><m:chr m:val="̂"/></m:accPr><m:e>{e_xml}</m:e></m:acc>'

    # Radical: <msqrt> -> <m:rad>
    elif tag == "msqrt":
        e_xml = "".join([mml_to_omml_element(c) for c in list(node)])
        return f'<m:rad><m:e>{e_xml}</m:e></m:rad>'

    # mrow / math / generic containers
    else:
        return "".join([mml_to_omml_element(c) for c in list(node)])

def convert_latex_to_omml_xml(latex_str, is_display=False):
    """Converts a LaTeX TeX string directly into standard ECMA-376 OMML XML."""
    latex_clean = latex_str.strip()
    
    # Pre-clean known custom symbols
    latex_clean = latex_clean.replace(r"\mathbb{I}", r"\text{𝟙}")
    latex_clean = latex_clean.replace(r"\mathcal{G}", "G")
    latex_clean = latex_clean.replace(r"\mathbf{I}", "I")
    latex_clean = latex_clean.replace(r"\mathcal{D}", "D")
    latex_clean = latex_clean.replace(r"\text{DocumentSpecimen}", "DocumentSpecimen")
    latex_clean = latex_clean.replace(r"\text{ErrorCategory}", "ErrorCategory")
    latex_clean = latex_clean.replace(r"\text{Category Accuracy}", "Category Accuracy")

    try:
        mml_str = latex2mathml.converter.convert(latex_clean)
        root = ET.fromstring(mml_str)
        inner_omml = mml_to_omml_element(root)
    except Exception as e:
        # Fallback for plain symbols (HTML escape <, >, & to ensure valid XML)
        import html
        safe_text = html.escape(latex_clean)
        inner_omml = f'<m:r><w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/></w:rPr><m:t>{safe_text}</m:t></m:r>'

    if is_display:
        return f'<m:oMathPara {nsdecls("m")} {nsdecls("w")}><m:oMath>{inner_omml}</m:oMath></m:oMathPara>'
    else:
        return f'<m:oMath {nsdecls("m")} {nsdecls("w")}>{inner_omml}</m:oMath>'

def append_inline_omml(paragraph, latex_str):
    """Appends an inline native OMML equation object to a python-docx paragraph."""
    omml_xml = convert_latex_to_omml_xml(latex_str, is_display=False)
    elem = parse_xml(omml_xml)
    paragraph._p.append(elem)

def append_display_omml(doc, latex_str):
    """Appends a centered display native OMML equation paragraph to python-docx Document."""
    p = doc.add_paragraph()
    p.alignment = 1  # WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = 8
    p.paragraph_format.space_after = 8
    
    omml_xml = convert_latex_to_omml_xml(latex_str, is_display=True)
    elem = parse_xml(omml_xml)
    p._p.append(elem)
    return p
