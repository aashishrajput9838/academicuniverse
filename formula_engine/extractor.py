import re

class ExtractionValidationError(Exception):
    """Raised when formula extraction or normalization validation fails at Gate 1 or Gate 2."""
    pass

class FormulaExtractor:
    """
    Stage 1 & Stage 2 Pipeline Component:
    Extracts mathematical expressions from Markdown text and applies mathematical syntax normalization.
    """

    # Regexp patterns for display and inline equations
    DISPLAY_MATH_PATTERN = re.compile(r'\$\$(.*?)\$\$', re.DOTALL)
    INLINE_MATH_PATTERN = re.compile(r'(?<!\$)\$([^$\n]+)\$(?!\$)')

    @classmethod
    def extract_formulas(cls, markdown_text):
        """
        Stage 1: Extract formulas from Markdown.
        Returns list of dicts: {'type': 'display'|'inline', 'raw': str, 'line_no': int}
        """
        if not isinstance(markdown_text, str):
            raise ExtractionValidationError("Gate 1 Failed: Markdown input must be a non-empty string.")

        formulas = []
        lines = markdown_text.splitlines()

        for idx, line in enumerate(lines, 1):
            # Find display equations
            for match in cls.DISPLAY_MATH_PATTERN.finditer(line):
                raw = match.group(1).strip()
                if raw:
                    formulas.append({'type': 'display', 'raw': raw, 'line_no': idx})

            # Find inline equations
            for match in cls.INLINE_MATH_PATTERN.finditer(line):
                raw = match.group(1).strip()
                if raw and not raw.startswith('$'):
                    formulas.append({'type': 'inline', 'raw': raw, 'line_no': idx})

        # Stage 1 Validation Gate
        cls.validate_extraction(formulas)
        return formulas

    @classmethod
    def validate_extraction(cls, formulas):
        """
        Gate 1 Validation: Verify extraction output format and non-empty formula payloads.
        """
        if not isinstance(formulas, list):
            raise ExtractionValidationError("Gate 1 Failed: Extracted formulas payload is invalid.")
        for item in formulas:
            if 'type' not in item or 'raw' not in item:
                raise ExtractionValidationError("Gate 1 Failed: Extracted formula item missing required schema keys.")
            if not item['raw'].strip():
                raise ExtractionValidationError(f"Gate 1 Failed: Empty formula payload detected at line {item.get('line_no')}.")

    @classmethod
    def normalize_latex(cls, latex_str):
        """
        Stage 2: Normalize LaTeX mathematical expressions before conversion.
        Handles spacing, custom tags, and math symbol standardization.
        """
        if not latex_str:
            return ""

        text = latex_str.strip()

        # Clean equation label tags
        text = re.sub(r'\\text\{\[Eq\. (\d+)\]\}', r'', text)
        text = re.sub(r'\[Eq\. (\d+)\]', r'', text)

        # Standardize operators and spacing safely with word boundaries
        text = re.sub(r'\b\\ge\b', r'\\geq', text)
        text = re.sub(r'\b\\le\b', r'\\leq', text)
        text = re.sub(r'\b\\ne\b', r'\\neq', text)
        text = text.replace('>=', r'\geq')
        text = text.replace('<=', r'\leq')
        text = text.replace('!=', r'\neq')

        # Clean equation numbering and extra wrappers
        text = text.replace(r'\_', '_')
        text = text.strip()

        # Stage 2 Validation Gate
        cls.validate_normalization(latex_str, text)
        return text

    @classmethod
    def validate_normalization(cls, original, normalized):
        """
        Gate 2 Validation: Ensure normalization preserves mathematical payload integrity without dropping content.
        """
        if normalized is None:
            raise ExtractionValidationError(f"Gate 2 Failed: Normalization output is None for input '{original}'.")
        if original.strip() and not normalized.strip():
            raise ExtractionValidationError(f"Gate 2 Failed: Normalization resulted in an empty string for original '{original}'.")
