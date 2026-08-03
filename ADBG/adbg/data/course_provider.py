"""
ADBG Course Provider — Subject library access for document generation.

Loads course pools from the subjects YAML catalog and provides
deterministic course selection per branch.
"""

from __future__ import annotations

import logging
from pathlib import Path

import yaml

from adbg.core.interfaces import CourseInfo
from adbg.core.seed_manager import SeedManager
from adbg.data.providers import ICourseProvider

logger = logging.getLogger(__name__)

_DEFAULT_SUBJECTS = Path(__file__).parent / "catalogs" / "subjects.yaml"


class YamlCourseProvider(ICourseProvider):
    """
    Course provider backed by a YAML subject library.

    Each branch maps to a pool of courses. When a branch is requested
    that doesn't exist in the library, the provider falls back to the
    COMMON branch for foundation courses.
    """

    def __init__(self, catalog_path: str | Path | None = None) -> None:
        self._catalog_path = Path(catalog_path) if catalog_path else _DEFAULT_SUBJECTS
        self._courses: dict[str, list[CourseInfo]] = {}
        self._seed: SeedManager | None = None

    def initialize(self, seed: SeedManager) -> None:
        self._seed = seed
        self._load_catalog()

    def _load_catalog(self) -> None:
        if not self._catalog_path.exists():
            raise FileNotFoundError(
                f"Subject library not found: {self._catalog_path}"
            )

        with self._catalog_path.open("r", encoding="utf-8") as f:
            raw = yaml.safe_load(f)

        branches = raw.get("branches", {})
        for branch_code, branch_data in branches.items():
            courses = [
                CourseInfo(
                    course_code=c["code"],
                    course_name=c["name"],
                    credits=int(c["credits"]),
                    branch_code=branch_code,
                )
                for c in branch_data.get("courses", [])
            ]
            self._courses[branch_code] = courses

        total = sum(len(c) for c in self._courses.values())
        logger.info(
            "Loaded %d courses across %d branches from %s",
            total,
            len(self._courses),
            self._catalog_path.name,
        )

    def _require_seed(self) -> SeedManager:
        if self._seed is None:
            raise RuntimeError("CourseProvider not initialized.")
        return self._seed

    def get_courses(self, branch_code: str, count: int) -> list[CourseInfo]:
        """
        Select courses for a branch, with fallback to COMMON courses.

        If the branch has fewer courses than requested, common courses
        are mixed in to fill the remaining slots.
        """
        sm = self._require_seed()

        branch_courses = list(self._courses.get(branch_code, []))
        common_courses = list(self._courses.get("COMMON", []))

        available = branch_courses + common_courses

        if not available:
            raise ValueError(
                f"No courses available for branch '{branch_code}' "
                f"and no COMMON courses found."
            )

        # If we need more than available, allow some repeats
        if count > len(available):
            count = len(available)

        return sm.pick_multiple(available, count)

    def list_branches(self) -> list[str]:
        return sorted(self._courses.keys())
