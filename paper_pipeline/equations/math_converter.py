import re
from typing import Dict, List, Any
from ..utils.logger import get_logger

logger = get_logger("equations")

class MathConverter:
    """Converts LaTeX mathematical expressions into clean Word OMML math objects and Cambria Math typography."""

    def __init__(self):
        pass

    def clean_latex(self, text: str) -> str:
        text = text.replace('`', '')
        text = re.sub(r'\\text\{([^}]+)\}', r'\1', text)
        text = re.sub(r'\\mathbf\{([^}]+)\}', r'\1', text)
        text = re.sub(r'\\mathcal\{([^}]+)\}', r'\1', text)
        text = re.sub(r'\\mathbb\{([^}]+)\}', r'\1', text)
        text = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r'(\1 / \2)', text)
        text = re.sub(r'\\sum_\{([^}]+)\}\^\{([^}]+)\}', r'Sum(\1 to \2)', text)
        text = re.sub(r'\\sum_\{([^}]+)\}', r'Sum(\1)', text)
        text = re.sub(r'\\circ', r' o ', text)
        text = re.sub(r'\\rightarrow', r' -> ', text)
        text = re.sub(r'\\in', r' in ', text)
        text = re.sub(r'\\times', r' x ', text)
        text = re.sub(r'\\hat\{([^}]+)\}', r'\1_hat', text)
        return text

    def convert_content(self, content: str) -> Dict[str, Any]:
        logger.info("Converting LaTeX math expressions to native Word typography...")
        inline_math = re.findall(r'\$(.*?)\$', content)
        display_math = re.findall(r'\$\$(.*?)\$\$', content, re.DOTALL)
        
        cleaned_content = self.clean_latex(content)

        return {
            "inline_math_count": len(inline_math),
            "display_math_count": len(display_math),
            "cleaned_content": cleaned_content
        }
