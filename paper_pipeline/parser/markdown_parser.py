import re
from typing import Dict, List, Any
from ..utils.logger import get_logger

logger = get_logger("parser")

class MarkdownParser:
    """Parses markdown manuscripts into structured document tokens and section trees."""
    
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.raw_content = ""
        self.headings: List[Dict[str, Any]] = []

    def parse(self) -> Dict[str, Any]:
        with open(self.file_path, "r", encoding="utf-8") as f:
            self.raw_content = f.read()

        logger.info(f"Parsing manuscript: {self.file_path} ({len(self.raw_content)} chars)")
        
        lines = self.raw_content.splitlines()
        for idx, line in enumerate(lines):
            match = re.match(r'^(#{1,6})\s+(.*)$', line)
            if match:
                level = len(match.group(1))
                title = match.group(2).strip()
                self.headings.append({
                    "line": idx + 1,
                    "level": level,
                    "title": title
                })

        return {
            "raw_content": self.raw_content,
            "headings": self.headings,
            "total_lines": len(lines),
            "char_count": len(self.raw_content)
        }
