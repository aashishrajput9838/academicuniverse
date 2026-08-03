"""
ADBG Template Loader — Parses YAML template definitions into TemplateDefinition instances.

Verifies mandatory metadata fields:
    - template_id
    - template_version
    - author
    - description
    - supported_universities
    - document_type
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import yaml

from adbg.core.interfaces import (
    PageConfig,
    TemplateDefinition,
    TemplateMetadata,
)
from adbg.templates.validator import TemplateValidator

logger = logging.getLogger(__name__)

_DEFAULT_TEMPLATES_DIR = Path(__file__).parent / "definitions"


class YamlTemplateLoader:
    """
    Data-driven template loader for YAML template files.
    """

    def __init__(self, templates_dir: str | Path | None = None) -> None:
        self.templates_dir = Path(templates_dir) if templates_dir else _DEFAULT_TEMPLATES_DIR
        self._templates: dict[str, TemplateDefinition] = {}

    def load_all(self) -> dict[str, TemplateDefinition]:
        """Load all YAML template files from the templates directory."""
        if not self.templates_dir.exists():
            logger.warning("Templates directory does not exist: %s", self.templates_dir)
            return self._templates

        for yaml_file in self.templates_dir.glob("*.yaml"):
            template = self.load_file(yaml_file)
            self._templates[template.metadata.template_id] = template

        return self._templates

    def load_file(self, file_path: str | Path) -> TemplateDefinition:
        """Parse a single YAML template definition file."""
        path = Path(file_path)
        with path.open("r", encoding="utf-8") as f:
            raw = yaml.safe_load(f)

        return self._parse_template_dict(raw)

    def get_template(self, template_id: str) -> TemplateDefinition:
        """Retrieve a loaded template by ID, loading if not cached."""
        if template_id not in self._templates:
            filepath = self.templates_dir / f"{template_id}.yaml"
            if filepath.exists():
                self._templates[template_id] = self.load_file(filepath)
            else:
                available = ", ".join(self._templates.keys()) or "(none loaded)"
                raise KeyError(
                    f"Template '{template_id}' not found at {filepath}. Available: {available}"
                )
        return self._templates[template_id]

    @staticmethod
    def _parse_template_dict(raw: dict[str, Any]) -> TemplateDefinition:
        """Validate and parse raw dictionary into TemplateDefinition."""
        # Validate raw dict strictly
        TemplateValidator.validate(raw)

        meta_raw = raw.get("metadata", {})
        metadata = TemplateMetadata(
            template_id=meta_raw["template_id"],
            template_version=str(meta_raw["template_version"]),
            author=meta_raw["author"],
            description=meta_raw["description"],
            supported_universities=tuple(meta_raw["supported_universities"]),
            document_type=meta_raw["document_type"],
        )

        page_raw = raw.get("page", {})
        page = PageConfig(
            size=page_raw.get("size", "A4"),
            orientation=page_raw.get("orientation", "portrait"),
            margins=page_raw.get("margins", {"top": 36, "right": 36, "bottom": 36, "left": 36}),
        )

        elements = tuple(raw.get("elements", []))
        watermark = raw.get("watermark", {})
        disclaimer = raw.get("disclaimer", {})

        return TemplateDefinition(
            metadata=metadata,
            page=page,
            elements=elements,
            watermark=watermark,
            disclaimer=disclaimer,
        )
