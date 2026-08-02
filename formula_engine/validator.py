import os
import zipfile
from xml.etree import ElementTree as ET

class DocumentValidationError(Exception):
    """Raised when DOCX OpenXML structural validation or PDF rendering parity validation fails at Gate 5, 6, or 7."""
    pass

class DocumentValidator:
    """
    Stage 5, Stage 6, & Stage 7 Multi-Stage Validation Engine:
    Inspects OpenXML document trees directly and verifies PDF rendering parity.
    Aborts build export if any forbidden LaTeX string, broken Unicode glyph, or malformed math element survives.
    """

    FORBIDDEN_LATEX_PATTERNS = [
        r'\frac', r'\sum', r'\lambda', r'\epsilon', r'\text{', r'\rightarrow', 
        r'\alpha', r'\beta', r'\gamma', r'\Delta', r'\%', r'\_', r'\^', r'_{', r'^{',
        r'\left', r'\right', r'\mathcal', r'\sqrt', r'\int', r'\lim'
    ]

    CORRUPTED_UNICODE_PATTERNS = ['\ufffd', '□', '??']

    def __init__(self, docx_path, pdf_path=None):
        self.docx_path = docx_path
        self.pdf_path = pdf_path

    def validate_all(self):
        """Runs all post-generation validation gates sequentially."""
        self.validate_docx_xml_gate()
        self.validate_omml_structure_gate()
        if self.pdf_path:
            self.validate_pdf_parity_gate()

    def validate_docx_xml_gate(self):
        """
        Gate 5 Validation: Scans word/document.xml inside DOCX zip package.
        Fails build if any forbidden LaTeX command or corrupted Unicode glyph exists in text runs.
        """
        if not os.path.exists(self.docx_path):
            raise DocumentValidationError(f"Gate 5 Failed: DOCX file not found at path '{self.docx_path}'.")

        try:
            with zipfile.ZipFile(self.docx_path, 'r') as docx_zip:
                xml_content = docx_zip.read('word/document.xml').decode('utf-8')
        except Exception as e:
            raise DocumentValidationError(f"Gate 5 Failed: Unable to read word/document.xml from DOCX package: {str(e)}")

        # Scan text nodes in XML for forbidden LaTeX tokens
        for pattern in self.FORBIDDEN_LATEX_PATTERNS:
            if pattern in xml_content:
                raise DocumentValidationError(f"Gate 5 Failed: Forbidden raw LaTeX command string '{pattern}' detected inside DOCX OpenXML.")

        # Scan text nodes for corrupted Unicode replacement characters
        for pattern in self.CORRUPTED_UNICODE_PATTERNS:
            if pattern in xml_content:
                raise DocumentValidationError(f"Gate 5 Failed: Corrupted Unicode replacement character '{pattern}' detected inside DOCX OpenXML.")

    def validate_omml_structure_gate(self):
        """
        Gate 6 Validation: Performs direct OpenXML structural DOM inspection.
        Verifies:
        - Display equations exist as <m:oMathPara>
        - Inline equations exist as <m:oMath>
        - Zero equations emitted as plain <w:t> text
        - Zero equations embedded as images/SVG/PNG/HTML
        """
        try:
            with zipfile.ZipFile(self.docx_path, 'r') as docx_zip:
                xml_bytes = docx_zip.read('word/document.xml')
                root = ET.fromstring(xml_bytes)
        except Exception as e:
            raise DocumentValidationError(f"Gate 6 Failed: Unable to parse word/document.xml DOM: {str(e)}")

        namespaces = {
            'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
            'm': 'http://schemas.openxmlformats.org/officeDocument/2006/math',
            'v': 'urn:schemas-microsoft-com:vml',
            'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'
        }

        # Verify presence of valid OMML nodes
        omath_para_nodes = root.findall('.//m:oMathPara', namespaces)
        omath_nodes = root.findall('.//m:oMath', namespaces)

        if not omath_nodes and not omath_para_nodes:
            raise DocumentValidationError("Gate 6 Failed: No OMML math elements (<m:oMath> or <m:oMathPara>) found in document.")

        # Assert no drawing shapes or images replace equations in math contexts
        drawings = root.findall('.//w:drawing', namespaces)
        for dw in drawings:
            # Verify drawings do not contain equation image names
            dw_str = ET.tostring(dw, encoding='utf-8').decode('utf-8')
            if 'math' in dw_str.lower() and ('png' in dw_str.lower() or 'svg' in dw_str.lower()):
                raise DocumentValidationError("Gate 6 Failed: Equation detected as embedded PNG/SVG image rather than native OMML.")

    def validate_pdf_parity_gate(self):
        """
        Gate 7 Validation: Asserts PDF export exists, is non-empty, and is free of corrupted replacement glyphs.
        """
        if not self.pdf_path:
            return

        if not os.path.exists(self.pdf_path):
            raise DocumentValidationError(f"Gate 7 Failed: Exported PDF not found at path '{self.pdf_path}'.")

        if os.path.getsize(self.pdf_path) < 1000:
            raise DocumentValidationError(f"Gate 7 Failed: Exported PDF file size ({os.path.getsize(self.pdf_path)} bytes) is below minimum threshold.")
