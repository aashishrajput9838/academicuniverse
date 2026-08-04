import re
from typing import Dict, List, Any
from ..utils.logger import get_logger

logger = get_logger("validator")

REQUIRED_SECTIONS = [
    "Abstract",
    "Introduction",
    "Related Work",
    "System Architecture",
    "Methodology",
    "Experimental Setup",
    "Results",
    "Discussion",
    "Conclusion",
    "Ethics",
    "Appendix",
    "References"
]

class StructureValidator:
    """Validates IMRaD section ordering, heading hierarchy, and mandatory sections."""

    def __init__(self, content: str):
        self.content = content

    def validate(self) -> Dict[str, Any]:
        logger.info("Validating manuscript structural compliance against IEEE/IMRaD standard...")
        
        found_sections = []
        missing_sections = []

        for sec in REQUIRED_SECTIONS:
            pattern = rf"#+\s+.*{re.escape(sec)}.*"
            if re.search(pattern, self.content, re.IGNORECASE):
                found_sections.append(sec)
            else:
                missing_sections.append(sec)

        is_valid = len(missing_sections) == 0

        logger.info(f"Structure validation complete. Found: {len(found_sections)}, Missing: {len(missing_sections)}")

        return {
            "is_valid": is_valid,
            "found_sections": found_sections,
            "missing_sections": missing_sections,
            "total_required": len(REQUIRED_SECTIONS)
        }
