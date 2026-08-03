"""
ADBG Roll Number Provider — Configurable pattern-based roll number generation.

Evaluates formatting strings like "{year}{branch_code}{sequence:06d}"
or "{year_short}BT{branch_code}{sequence:04d}".
"""

from __future__ import annotations

import re

from adbg.core.seed_manager import SeedManager
from adbg.data.providers import IRollNumberProvider


class PatternRollNumberProvider(IRollNumberProvider):
    """
    Roll number provider using pattern strings.

    Supports python format syntax for sequence zero-padding.
    Example patterns:
        - "{year}{branch_code}{sequence:06d}" -> "2024CSE000123"
        - "{year_short}BT{branch_code}{sequence:04d}" -> "24BTCSE0123"
        - "NIES{year_short}{branch_code}{sequence:04d}" -> "NIES24CSE0123"
    """

    def __init__(self) -> None:
        self._seed: SeedManager | None = None

    def initialize(self, seed: SeedManager) -> None:
        self._seed = seed

    def generate(
        self,
        pattern: str,
        year: int,
        branch_code: str,
        sequence: int,
    ) -> str:
        year_short = str(year)[-2:]

        # Replace python formatting syntax if present in template
        # e.g., {sequence:06d} -> format sequence with 6 digits
        format_kwargs = {
            "year": year,
            "year_short": year_short,
            "branch_code": branch_code,
            "sequence": sequence,
        }

        try:
            return pattern.format(**format_kwargs)
        except (KeyError, ValueError):
            # Fallback simple replacement if pattern contains unescaped braces
            res = pattern.replace("{year}", str(year))
            res = res.replace("{year_short}", year_short)
            res = res.replace("{branch_code}", branch_code)
            res = re.sub(r"\{sequence(?::\d+d)?\}", f"{sequence:04d}", res)
            return res

    def generate_enrollment(
        self,
        pattern: str,
        year: int,
        sequence: int,
    ) -> str:
        year_short = str(year)[-2:]
        format_kwargs = {
            "year": year,
            "year_short": year_short,
            "sequence": sequence,
        }
        try:
            return pattern.format(**format_kwargs)
        except (KeyError, ValueError):
            res = pattern.replace("{year}", str(year))
            res = res.replace("{year_short}", year_short)
            res = re.sub(r"\{sequence(?::\d+d)?\}", f"{sequence:05d}", res)
            return res
