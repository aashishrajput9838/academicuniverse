"""
ADBG University Provider — Loads and serves the university catalog from YAML.

The catalog file is loaded once at initialization. University selection
uses the SeedManager for deterministic random access.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import yaml

from adbg.core.interfaces import BranchInfo, GradeBand, GradingScheme, UniversityConfig
from adbg.core.seed_manager import SeedManager
from adbg.data.providers import IUniversityProvider

logger = logging.getLogger(__name__)

# Default catalog path relative to this module
_DEFAULT_CATALOG = Path(__file__).parent / "catalogs" / "universities.yaml"


class YamlUniversityProvider(IUniversityProvider):
    """
    University provider backed by a YAML catalog file.

    Loads all universities at initialization and provides deterministic
    access via SeedManager.
    """

    def __init__(self, catalog_path: str | Path | None = None) -> None:
        self._catalog_path = Path(catalog_path) if catalog_path else _DEFAULT_CATALOG
        self._universities: dict[str, UniversityConfig] = {}
        self._university_ids: list[str] = []
        self._seed: SeedManager | None = None

    def initialize(self, seed: SeedManager) -> None:
        self._seed = seed
        self._load_catalog()

    def _load_catalog(self) -> None:
        """Parse the YAML catalog into UniversityConfig instances."""
        if not self._catalog_path.exists():
            raise FileNotFoundError(
                f"University catalog not found: {self._catalog_path}"
            )

        with self._catalog_path.open("r", encoding="utf-8") as f:
            raw = yaml.safe_load(f)

        universities = raw.get("universities", [])
        if not universities:
            raise ValueError("University catalog is empty or malformed.")

        for entry in universities:
            config = self._parse_university(entry)
            self._universities[config.university_id] = config
            self._university_ids.append(config.university_id)

        logger.info(
            "Loaded %d universities from %s",
            len(self._universities),
            self._catalog_path.name,
        )

    @staticmethod
    def _parse_university(entry: dict[str, Any]) -> UniversityConfig:
        """Parse a single university entry from the YAML catalog."""
        # Parse grading scheme
        gs_raw = entry["grading_scheme"]
        bands = tuple(
            GradeBand(
                min_marks=b["min_marks"],
                grade=b["grade"],
                grade_point=b["grade_point"],
            )
            for b in gs_raw["bands"]
        )
        grading_scheme = GradingScheme(
            scheme_type=gs_raw["type"],
            scale=float(gs_raw["scale"]),
            pass_marks=int(gs_raw["pass_marks"]),
            bands=bands,
        )

        # Parse branches
        branches = tuple(
            BranchInfo(code=b["code"], name=b["name"])
            for b in entry.get("branches", [])
        )

        return UniversityConfig(
            university_id=entry["id"],
            name=entry["name"],
            short_code=entry["short_code"],
            address=entry.get("address", {}),
            tagline=entry.get("tagline", ""),
            colors=entry.get("colors", {}),
            fonts=entry.get("fonts", {}),
            grading_scheme=grading_scheme,
            roll_number_pattern=entry.get("roll_number_pattern", "{year}{branch_code}{sequence:04d}"),
            semester_naming=entry.get("semester_naming", "Semester {number}"),
            branches=branches,
            supported_templates=tuple(entry.get("supported_templates", [])),
            logo_path=entry.get("logo_path", ""),
        )

    def _require_seed(self) -> SeedManager:
        if self._seed is None:
            raise RuntimeError("UniversityProvider not initialized.")
        return self._seed

    def get_university(self, university_id: str) -> UniversityConfig:
        if university_id not in self._universities:
            available = ", ".join(self._university_ids) or "(none)"
            raise KeyError(
                f"University '{university_id}' not found. Available: {available}"
            )
        return self._universities[university_id]

    def get_random_university(self) -> UniversityConfig:
        sm = self._require_seed()
        uid = sm.pick(self._university_ids)
        return self._universities[uid]

    def list_university_ids(self) -> list[str]:
        return list(self._university_ids)

    def get_random_branch(self, university: UniversityConfig) -> BranchInfo:
        sm = self._require_seed()
        return sm.pick(university.branches)
