import os
import lxml.etree as ET
from docx.oxml import parse_xml
import latex2mathml.converter

class ConversionError(Exception):
    """Raised when LaTeX to MathML or MathML to OMML conversion fails at Gate 3 or Gate 4."""
    pass

class FormulaConverter:
    """
    Stage 3 & Stage 4 Pure Transformation Component:
    Converts LaTeX math expressions into canonical Microsoft Office Math (OMML) OpenXML nodes
    via latex2mathml + Microsoft official MML2OMML.XSL transformation pipeline.
    Zero string hacks, zero text fallbacks, zero best-effort approximations.
    """

    _xslt_transform = None

    @classmethod
    def _get_xslt_transform(cls):
        if cls._xslt_transform is None:
            xsl_path = os.path.join(os.path.dirname(__file__), 'mml2omml.xsl')
            if not os.path.exists(xsl_path):
                raise ConversionError(f"MML2OMML XSLT stylesheet missing at '{xsl_path}'.")
            xslt_tree = ET.parse(xsl_path)
            cls._xslt_transform = ET.XSLT(xslt_tree)
        return cls._xslt_transform

    @classmethod
    def latex_to_mathml(cls, latex_str):
        """
        Stage 3: Converts normalized LaTeX to W3C MathML XML using latex2mathml parser.
        """
        if not latex_str or not latex_str.strip():
            raise ConversionError("Gate 3 Failed: Cannot convert empty LaTeX string to MathML.")

        try:
            mathml_xml = latex2mathml.converter.convert(latex_str.strip())
        except Exception as e:
            raise ConversionError(f"Gate 3 Failed: latex2mathml parsing error on '{latex_str}': {str(e)}")

        cls.validate_mathml(latex_str, mathml_xml)
        return mathml_xml

    @classmethod
    def validate_mathml(cls, latex_str, mathml_xml):
        """
        Gate 3 Validation: Asserts valid MathML XML root element.
        """
        if not mathml_xml or not isinstance(mathml_xml, str):
            raise ConversionError(f"Gate 3 Failed: MathML output is empty for '{latex_str}'.")
        try:
            root = ET.fromstring(mathml_xml.encode('utf-8'))
            if not root.tag.endswith('math'):
                raise ConversionError(f"Gate 3 Failed: Root element '{root.tag}' is not a MathML <math> node.")
        except ET.ParseError as e:
            raise ConversionError(f"Gate 3 Failed: Generated MathML is invalid XML: {str(e)}")

    @classmethod
    def mathml_to_omml(cls, mathml_xml, is_display=False, eq_id=None):
        """
        Stage 4: Transforms MathML XML to native OMML XML using canonical XSLT engine.
        """
        if not mathml_xml:
            raise ConversionError("Gate 4 Failed: Cannot convert empty MathML string to OMML.")

        try:
            xslt = cls._get_xslt_transform()
            mathml_tree = ET.fromstring(mathml_xml.encode('utf-8'))
            omml_tree = xslt(mathml_tree)
            omml_str = bytes(omml_tree).decode('utf-8')
        except Exception as e:
            raise ConversionError(f"Gate 4 Failed: MathML to OMML XSLT transformation failed: {str(e)}")

        if is_display:
            omml_str = f'<m:oMathPara xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">{omml_str}</m:oMathPara>'

        cls.validate_omml(omml_str, is_display=is_display)
        return parse_xml(omml_str)

    @classmethod
    def validate_omml(cls, omml_str, is_display=False):
        """
        Gate 4 Validation: Asserts valid OMML XML structure.
        """
        if not omml_str or not isinstance(omml_str, str):
            raise ConversionError("Gate 4 Failed: Generated OMML payload is empty.")
        if is_display and '<m:oMathPara' not in omml_str:
            raise ConversionError("Gate 4 Failed: Display equation missing <m:oMathPara> container.")
        if not is_display and '<m:oMath' not in omml_str:
            raise ConversionError("Gate 4 Failed: Inline equation missing <m:oMath> container.")
        try:
            parse_xml(omml_str)
        except Exception as e:
            raise ConversionError(f"Gate 4 Failed: Generated OMML XML is invalid OpenXML: {str(e)}")

    @classmethod
    def convert_latex_to_omml_element(cls, latex_str, is_display=False, eq_id=None):
        """
        Executes Stage 3 & Stage 4 transformation pipeline.
        Returns native python-docx oxml OMML element.
        """
        mathml_xml = cls.latex_to_mathml(latex_str)
        omml_element = cls.mathml_to_omml(mathml_xml, is_display=is_display, eq_id=eq_id)
        return omml_element
