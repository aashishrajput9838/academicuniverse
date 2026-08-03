"""
ADBG Date Provider — Deterministic generation of academic dates.
"""

from __future__ import annotations

from adbg.core.seed_manager import SeedManager
from adbg.data.providers import IDateProvider


class StandardDateProvider(IDateProvider):
    """Standard implementation of academic date generation."""

    def __init__(self) -> None:
        self._seed: SeedManager | None = None

    def initialize(self, seed: SeedManager) -> None:
        self._seed = seed

    def _require_seed(self) -> SeedManager:
        if self._seed is None:
            raise RuntimeError("DateProvider not initialized.")
        return self._seed

    def generate_issue_date(self, start_year: int = 2022, end_year: int = 2025) -> str:
        return self._require_seed().random_date(start_year, end_year)

    def generate_date_of_birth(self, min_year: int = 1998, max_year: int = 2005) -> str:
        return self._require_seed().random_date(min_year, max_year)
