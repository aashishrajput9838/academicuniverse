import re
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

NS_M = 'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"'
NS_W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
NS_DECLS = f'{NS_M} {NS_W}'

def r(text):
    """Build an OMML run with text."""
    # Escape XML entities
    text_clean = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    return f'<m:r><m:t>{text_clean}</m:t></m:r>'

def frac(num_xml, den_xml):
    """Build an OMML fraction."""
    return f'<m:f><m:num>{num_xml}</m:num><m:den>{den_xml}</m:den></m:f>'

def sub(base_xml, sub_xml):
    """Build an OMML subscript."""
    return f'<m:sSub><m:e>{base_xml}</m:e><m:sub>{sub_xml}</m:sub></m:sSub>'

def sup(base_xml, sup_xml):
    """Build an OMML superscript."""
    return f'<m:sSup><m:e>{base_xml}</m:e><m:sup>{sup_xml}</m:sup></m:sSup>'

def sub_sup(base_xml, sub_xml, sup_xml):
    """Build an OMML sub-superscript."""
    return f'<m:sSubSup><m:e>{base_xml}</m:e><m:sub>{sub_xml}</m:sub><m:sup>{sup_xml}</m:sup></m:sSubSup>'

def summation(sub_xml, sup_xml, body_xml):
    """Build an OMML summation (n-ary operator)."""
    return f'<m:nary><m:naryPr><m:chr m:val="∑"/><m:limLoc m:val="undOvr"/></m:naryPr><m:sub>{sub_xml}</m:sub><m:sup>{sup_xml}</m:sup><m:e>{body_xml}</m:e></m:nary>'

def bar(body_xml):
    """Build an OMML accent bar (e.g. \bar{T})."""
    return f'<m:acc><m:accPr><m:chr m:val="̄"/></m:accPr><m:e>{body_xml}</m:e></m:acc>'

def delim_braces(body_xml):
    """Build OMML braces { ... }."""
    return f'<m:d><m:dPr><m:begChr m:val="{"{"}"/><m:endChr m:val="{"}"}"/></m:dPr><m:e>{body_xml}</m:e></m:d>'

def cases_omml(row1_xml, row2_xml):
    """Build OMML cases / piecewise delimiter with left brace."""
    return (
        f'<m:d>'
        f'<m:dPr><m:begChr m:val="{"{"}"/><m:endChr m:val=""/></m:dPr>'
        f'<m:e>'
        f'<m:eqArr>'
        f'<m:r><m:t>{row1_xml}</m:t></m:r>'
        f'<m:r><m:t>{row2_xml}</m:t></m:r>'
        f'</m:eqArr>'
        f'</m:e>'
        f'</m:d>'
    )

# Common symbol replacements
SYMBOL_MAP = {
    r'\in': ' ∈ ',
    r'\mathcal{E}_{avail}': 'E_avail',
    r'\mathcal{E}': 'E',
    r'\mathcal{D}': 'D',
    r'\mathcal{T}': 'T',
    r'\rightarrow': ' → ',
    r'\mid': ' | ',
    r'\land': ' ∧ ',
    r'\neq': ' ≠ ',
    r'\forall': ' ∀ ',
    r'\cdot': ' · ',
    r'\mu': 'μ',
    r'\sigma': 'σ',
    r'\quad': '    ',
    r'\text': '',
}

def latex_to_omml_xml(latex_str, is_display=False):
    """Convert LaTeX string to OMML XML string."""
    raw = latex_str.strip()
    if raw.startswith('$$') and raw.endswith('$$'):
        raw = raw[2:-2].strip()
    elif raw.startswith('$') and raw.endswith('$'):
        raw = raw[1:-1].strip()

    # Pre-clean known LaTeX wrappers
    raw_clean = raw

    # Check for cases / piecewise expression first
    if 'begin{cases}' in raw_clean or 'cases' in raw_clean:
        # Match match_array = cases...
        if 'match' in raw_clean:
            expr_left = r("match_array = ")
            c_omml = cases_omml("1  if |actual| = |expected| ∧ ∀ i: actual_i = expected_i", "0  otherwise")
            body = f"{expr_left}{c_omml}"
        else:
            body = cases_omml("1  if condition", "0  otherwise")
    # Fraction: \frac{num}{den}
    elif r'\frac' in raw_clean:
        # Check if there are surrounding elements or multiple fractions
        # e.g., P = \frac{TP}{TP + FP}
        # e.g., P = \frac{TP}{TP + FP}, \quad R = \frac{TP}{TP + FN}, \quad F1 = \frac{2 \cdot P \cdot R}{P + R}
        body = parse_latex_fractions_and_elements(raw_clean)
    # Summation: \sum_{i=1}^{N} ...
    elif r'\sum' in raw_clean:
        body = parse_latex_summation_and_elements(raw_clean)
    # Accent bar: \bar{T}
    elif r'\bar' in raw_clean:
        body = parse_latex_bar_and_elements(raw_clean)
    # Simple subscript or equation
    else:
        body = parse_latex_generic(raw_clean)

    if is_display:
        return f'<m:oMathPara {NS_DECLS}><m:oMath>{body}</m:oMath></m:oMathPara>'
    else:
        return f'<m:oMath {NS_DECLS}>{body}</m:oMath>'

def parse_latex_generic(raw):
    """Parse general equations with subscripts, variables, braces, symbols."""
    # Replace LaTeX symbols
    s = raw
    s = re.sub(r'\\text\{([^}]+)\}', r'\1', s)
    s = re.sub(r'\\mathcal\{([^}]+)\}', r'\1', s)

    for k, v in SYMBOL_MAP.items():
        s = s.replace(k, v)

    # Handle \{ ... \} braces
    if s.startswith('{') and s.endswith('}'):
        inner_content = s[1:-1]
        return delim_braces(parse_subscripts_in_text(inner_content))
    elif r'\{' in s and r'\}' in s:
        parts = re.split(r'\\\{|\\\}', s)
        res = ""
        for i, pt in enumerate(parts):
            if i % 2 == 1:
                res += delim_braces(parse_subscripts_in_text(pt))
            else:
                res += parse_subscripts_in_text(pt)
        return res
    else:
        return parse_subscripts_in_text(s)

def parse_subscripts_in_text(text):
    """Find var_{sub} or var_sub and convert to OMML subscript structures."""
    # Pattern for X_{sub} or X_sub
    pattern = r'([A-Za-z0-9]+)_(\{([^}]+)\}|([A-Za-z0-9]+))'
    matches = list(re.finditer(pattern, text))
    if not matches:
        return r(text)

    xml_parts = []
    last_idx = 0
    for match in matches:
        start, end = match.span()
        if start > last_idx:
            xml_parts.append(r(text[last_idx:start]))
        base_str = match.group(1)
        sub_str = match.group(3) if match.group(3) else match.group(4)
        xml_parts.append(sub(r(base_str), r(sub_str)))
        last_idx = end
    if last_idx < len(text):
        xml_parts.append(r(text[last_idx:]))
    return "".join(xml_parts)

def parse_latex_fractions_and_elements(text):
    """Parse equations containing one or more \frac{num}{den}."""
    # Find all \frac{num}{den}
    pattern = r'\\frac\{([^}]+)\}\{([^}]+)\}'
    matches = list(re.finditer(pattern, text))
    if not matches:
        return parse_latex_generic(text)

    xml_parts = []
    last_idx = 0
    for match in matches:
        start, end = match.span()
        if start > last_idx:
            xml_parts.append(parse_latex_generic(text[last_idx:start]))
        num_str = match.group(1)
        den_str = match.group(2)
        num_xml = parse_latex_generic(num_str)
        den_xml = parse_latex_generic(den_str)
        xml_parts.append(frac(num_xml, den_xml))
        last_idx = end
    if last_idx < len(text):
        xml_parts.append(parse_latex_generic(text[last_idx:]))
    return "".join(xml_parts)

def parse_latex_summation_and_elements(text):
    """Parse equations containing \sum_{sub}^{sup} body or \sum."""
    pattern = r'\\sum_\{([^}]+)\}\^\{([^}]+)\}\s*([A-Za-z0-9_]+)?'
    match = re.search(pattern, text)
    if match:
        start, end = match.span()
        prefix = text[:start]
        sub_str = match.group(1)
        sup_str = match.group(2)
        body_str = match.group(3) if match.group(3) else ""
        suffix = text[end:]

        pref_xml = parse_latex_generic(prefix)
        sub_xml = parse_latex_generic(sub_str)
        sup_xml = parse_latex_generic(sup_str)
        body_xml = parse_latex_generic(body_str)
        sum_xml = summation(sub_xml, sup_xml, body_xml)
        suff_xml = parse_latex_generic(suffix)
        return f"{pref_xml}{sum_xml}{suff_xml}"
    else:
        return parse_latex_generic(text)

def parse_latex_bar_and_elements(text):
    """Parse \bar{T} equations."""
    pattern = r'\\bar\{([^}]+)\}'
    match = re.search(pattern, text)
    if match:
        start, end = match.span()
        prefix = parse_latex_generic(text[:start])
        target = parse_latex_generic(match.group(1))
        suffix = parse_latex_generic(text[end:])
        return f"{prefix}{bar(target)}{suffix}"
    else:
        return parse_latex_generic(text)

def convert_latex_to_omml_element(latex_str, is_display=False):
    """Returns a parseable docx.oxml element for the math equation."""
    xml_str = latex_to_omml_xml(latex_str, is_display=is_display)
    return parse_xml(xml_str)
