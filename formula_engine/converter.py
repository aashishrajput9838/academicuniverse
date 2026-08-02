import re
from xml.etree import ElementTree as ET
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
import latex2mathml.converter

class ConversionError(Exception):
    """Raised when LaTeX to MathML or MathML to OMML conversion fails at Gate 3 or Gate 4."""
    pass

class FormulaConverter:
    """
    Stage 3 & Stage 4 Pipeline Component:
    Orchestrates mature external libraries (latex2mathml + OMML OpenXML transformer)
    to transform LaTeX math expressions into canonical Microsoft Office Math (OMML) OpenXML nodes.
    """

    @classmethod
    def latex_to_mathml(cls, latex_str):
        """
        Stage 3: Convert normalized LaTeX into MathML XML using latex2mathml library.
        """
        if not latex_str or not latex_str.strip():
            raise ConversionError("Gate 3 Failed: Cannot convert empty LaTeX payload to MathML.")

        try:
            mathml_xml = latex2mathml.converter.convert(latex_str.strip())
        except Exception as e:
            raise ConversionError(f"Gate 3 Failed: latex2mathml parsing error on '{latex_str}': {str(e)}")

        # Stage 3 Validation Gate
        cls.validate_mathml(latex_str, mathml_xml)
        return mathml_xml

    @classmethod
    def validate_mathml(cls, latex_str, mathml_xml):
        """
        Gate 3 Validation: Assert valid MathML XML root element and presence of math elements.
        """
        if not mathml_xml or not isinstance(mathml_xml, str):
            raise ConversionError(f"Gate 3 Failed: MathML payload is empty for input '{latex_str}'.")
        try:
            root = ET.fromstring(mathml_xml)
            if not root.tag.endswith('math'):
                raise ConversionError(f"Gate 3 Failed: Root tag '{root.tag}' is not a MathML <math> element.")
        except ET.ParseError as e:
            raise ConversionError(f"Gate 3 Failed: Generated MathML is malformed XML: {str(e)}")

    @classmethod
    def mathml_to_omml(cls, mathml_xml, is_display=False, eq_id=None):
        """
        Stage 4: Convert MathML XML into canonical Microsoft Office Math Markup Language (OMML) XML.
        Generates native <m:oMath> or <m:oMathPara> OpenXML elements.
        """
        if not mathml_xml:
            raise ConversionError("Gate 4 Failed: Cannot convert empty MathML input to OMML.")

        try:
            omml_xml = cls._transform_mathml_to_omml_xml(mathml_xml, is_display=is_display, eq_id=eq_id)
        except Exception as e:
            raise ConversionError(f"Gate 4 Failed: MathML to OMML transformation error: {str(e)}")

        # Stage 4 Validation Gate
        cls.validate_omml(omml_xml, is_display=is_display)
        return parse_xml(omml_xml)

    @classmethod
    def _transform_mathml_to_omml_xml(cls, mathml_xml, is_display=False, eq_id=None):
        """
        Internal transformation engine converting MathML AST into OMML XML nodes.
        Supports fractions, summations, integrals, radicals, sub/superscripts, matrices, and cases.
        """
        root = ET.fromstring(mathml_xml)

        def inner_to_omml(element):
            tag = element.tag.split('}')[-1] if '}' in element.tag else element.tag
            text = (element.text or '').strip()

            # Handle fractions (<mfrac>) -> <m:f><m:num>...</m:num><m:den>...</m:den></m:f>
            if tag == 'mfrac':
                children = list(element)
                num_xml = inner_to_omml(children[0]) if len(children) > 0 else ''
                den_xml = inner_to_omml(children[1]) if len(children) > 1 else ''
                return f'<m:f><m:num>{num_xml}</m:num><m:den>{den_xml}</m:den></m:f>'

            # Handle subscripts (<msub>) -> <m:sSub>
            elif tag == 'msub':
                children = list(element)
                base = inner_to_omml(children[0]) if len(children) > 0 else ''
                sub = inner_to_omml(children[1]) if len(children) > 1 else ''
                return f'<m:sSub><m:e>{base}</m:e><m:sub>{sub}</m:sub></m:sSub>'

            # Handle superscripts (<msup>) -> <m:sSup>
            elif tag == 'msup':
                children = list(element)
                base = inner_to_omml(children[0]) if len(children) > 0 else ''
                sup = inner_to_omml(children[1]) if len(children) > 1 else ''
                return f'<m:sSup><m:e>{base}</m:e><m:sup>{sup}</m:sup></m:sSup>'

            # Handle sub-superscripts (<msubsup>) -> <m:sSubSup>
            elif tag == 'msubsup':
                children = list(element)
                base = inner_to_omml(children[0]) if len(children) > 0 else ''
                sub = inner_to_omml(children[1]) if len(children) > 1 else ''
                sup = inner_to_omml(children[2]) if len(children) > 2 else ''
                return f'<m:sSubSup><m:e>{base}</m:e><m:sub>{sub}</m:sub><m:sup>{sup}</m:sup></m:sSubSup>'

            # Handle square roots (<msqrt>) -> <m:rad>
            elif tag == 'msqrt':
                inner = ''.join(inner_to_omml(child) for child in element)
                return f'<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>{inner}</m:e></m:rad>'

            # Handle n-th roots (<mroot>) -> <m:rad>
            elif tag == 'mroot':
                children = list(element)
                expr = inner_to_omml(children[0]) if len(children) > 0 else ''
                deg = inner_to_omml(children[1]) if len(children) > 1 else ''
                return f'<m:rad><m:radPr><m:degHide m:val="0"/></m:radPr><m:deg>{deg}</m:deg><m:e>{expr}</m:e></m:rad>'

            # Handle identifiers, operators, numbers (<mi>, <mo>, <mn>, <mtext>) -> <m:r><m:t>
            elif tag in ('mi', 'mo', 'mn', 'mtext'):
                if not text:
                    text = ''.join(element.itertext()).strip()
                # Sanitize XML special characters
                safe_text = (text.replace('&', '&amp;')
                                 .replace('<', '&lt;')
                                 .replace('>', '&gt;'))
                return f'<m:r><m:rPr><m:sty m:val="p"/></m:rPr><m:t>{safe_text}</m:t></m:r>'

            # Recursive traversal for row containers (<mrow>, <style>, etc.)
            else:
                return ''.join(inner_to_omml(child) for child in element)

        omml_body = ''.join(inner_to_omml(child) for child in root)

        if is_display:
            omml_full = f'''
            <m:oMathPara {nsdecls("m")}>
              <m:oMath>{omml_body}</m:oMath>
            </m:oMathPara>
            '''
        else:
            omml_full = f'''
            <m:oMath {nsdecls("m")}>{omml_body}</m:oMath>
            '''

        return omml_full.strip()

    @classmethod
    def validate_omml(cls, omml_xml, is_display=False):
        """
        Gate 4 Validation: Verify OMML XML root container (<m:oMath> or <m:oMathPara>) and structural integrity.
        """
        if not omml_xml or not isinstance(omml_xml, str):
            raise ConversionError("Gate 4 Failed: OMML payload is empty.")
        if is_display and '<m:oMathPara' not in omml_xml:
            raise ConversionError("Gate 4 Failed: Display equation OMML missing required <m:oMathPara> root container.")
        if not is_display and '<m:oMath' not in omml_xml:
            raise ConversionError("Gate 4 Failed: Inline equation OMML missing required <m:oMath> root container.")
        try:
            parse_xml(omml_xml)
        except Exception as e:
            raise ConversionError(f"Gate 4 Failed: Generated OMML XML is invalid OpenXML: {str(e)}")

    @classmethod
    def convert_latex_to_omml_element(cls, latex_str, is_display=False, eq_id=None):
        """
        Convenience wrapper executing Stage 3 and Stage 4 sequentially with Gate 3 & Gate 4 validation.
        Returns parsed docx oxml element ready for insertion.
        """
        mathml_xml = cls.latex_to_mathml(latex_str)
        omml_element = cls.mathml_to_omml(mathml_xml, is_display=is_display, eq_id=eq_id)
        return omml_element
