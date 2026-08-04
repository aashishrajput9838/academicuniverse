import re
from typing import Dict, List, Any
from ..utils.logger import get_logger

logger = get_logger("citation")

class IEEECitationProcessor:
    """Formats bibliography citations into standard IEEE numbered style ([1], [2], ...)."""

    def __init__(self):
        pass

    def process_references(self, content: str) -> Dict[str, Any]:
        logger.info("Processing bibliography references to IEEE numbered format...")
        
        ref_section = re.search(r'## References\s*\n(.*?)(?=\n## |\Z)', content, re.DOTALL)
        references = []
        if ref_section:
            ref_text = ref_section.group(1).strip()
            lines = [l.strip()[2:] for l in ref_text.splitlines() if l.strip().startswith('- ')]
            for idx, line in enumerate(lines, start=1):
                references.append(f"[{idx}] {line}")

        return {
            "total_references": len(references),
            "formatted_references": references
        }
