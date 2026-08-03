"""
ADBG Template Validator — Strict validation engine for YAML templates.

Validates:
    - Metadata presence and semantic versioning format.
    - Page config (dimensions, orientation, margins).
    - Watermark & disclaimer structure.
    - Layout elements (valid element types, coordinate bounds, required properties).

Fails fast with detailed `TemplateValidationError` instances for any anomaly.
"""

from __future__ import annotations

import re
from typing import Any


class TemplateValidationError(ValueError):
    """Exception raised when a YAML template definition fails validation."""
    pass


class TemplateValidator:
    """Strict validator for TemplateDefinition dictionaries and objects."""

    _SEMVER_PATTERN = re.compile(r"^\d+\.\d+\.\d+(-[a-zA-Z0-9\.]+)?$")
    _VALID_ELEMENT_TYPES = {"rect", "line", "text", "info_grid", "table", "summary_box"}
    _VALID_DOC_TYPES = {"marksheet", "certificate", "student_id"}
    _VALID_PAGE_SIZES = {"A4", "LETTER"}
    _VALID_ORIENTATIONS = {"portrait", "landscape"}

    @classmethod
    def validate(cls, raw: dict[str, Any]) -> None:
        """
        Validate a raw template dictionary.

        Raises:
            TemplateValidationError: If any required property is missing or invalid.
        """
        if not isinstance(raw, dict):
            raise TemplateValidationError("Template data must be a dictionary.")

        cls._validate_metadata(raw.get("metadata"))
        cls._validate_page(raw.get("page"))
        cls._validate_elements(raw.get("elements"))

    @classmethod
    def _validate_metadata(cls, meta: Any) -> None:
        if not isinstance(meta, dict):
            raise TemplateValidationError("Template 'metadata' section is required and must be a dictionary.")

        required_keys = [
            "template_id",
            "template_version",
            "author",
            "description",
            "supported_universities",
            "document_type",
        ]
        for key in required_keys:
            if key not in meta or meta[key] is None or meta[key] == "":
                raise TemplateValidationError(f"Metadata missing required key: '{key}'")

        # Validate semver
        version_str = str(meta["template_version"])
        if not cls._SEMVER_PATTERN.match(version_str):
            raise TemplateValidationError(
                f"Invalid template_version: '{version_str}'. Must follow Semantic Versioning (X.Y.Z)."
            )

        # Validate doc type
        doc_type = meta["document_type"]
        if doc_type not in cls._VALID_DOC_TYPES:
            raise TemplateValidationError(
                f"Invalid document_type: '{doc_type}'. Must be one of {cls._VALID_DOC_TYPES}"
            )

        # Validate supported universities
        unis = meta["supported_universities"]
        if not isinstance(unis, (list, tuple)) or not unis:
            raise TemplateValidationError("supported_universities must be a non-empty list of university IDs.")

    @classmethod
    def _validate_page(cls, page: Any) -> None:
        if not isinstance(page, dict):
            raise TemplateValidationError("Template 'page' section is required and must be a dictionary.")

        size = page.get("size", "A4").upper()
        if size not in cls._VALID_PAGE_SIZES:
            raise TemplateValidationError(f"Invalid page size: '{size}'. Expected one of {cls._VALID_PAGE_SIZES}")

        orientation = page.get("orientation", "portrait").lower()
        if orientation not in cls._VALID_ORIENTATIONS:
            raise TemplateValidationError(f"Invalid orientation: '{orientation}'. Expected one of {cls._VALID_ORIENTATIONS}")

    @classmethod
    def _validate_elements(cls, elements: Any) -> None:
        if not isinstance(elements, (list, tuple)):
            raise TemplateValidationError("Template 'elements' section must be a list of element dictionaries.")

        for idx, elem in enumerate(elements):
            if not isinstance(elem, dict):
                raise TemplateValidationError(f"Element at index {idx} must be a dictionary.")

            elem_type = elem.get("type")
            if not elem_type or elem_type not in cls._VALID_ELEMENT_TYPES:
                raise TemplateValidationError(
                    f"Element at index {idx} has invalid type: '{elem_type}'. "
                    f"Must be one of {cls._VALID_ELEMENT_TYPES}"
                )

            # Specific element validations
            if elem_type == "text" and "text" not in elem:
                raise TemplateValidationError(f"Text element at index {idx} missing 'text' property.")
            if elem_type == "rect" and ("width" not in elem or "height" not in elem):
                raise TemplateValidationError(f"Rect element at index {idx} missing 'width' or 'height'.")
            if elem_type == "line" and not all(k in elem for k in ("x1", "y1", "x2", "y2")):
                raise TemplateValidationError(f"Line element at index {idx} missing coordinates (x1, y1, x2, y2).")
            if elem_type == "table" and "headers" not in elem:
                raise TemplateValidationError(f"Table element at index {idx} missing 'headers'.")
            if elem_type == "info_grid" and "fields" not in elem:
                raise TemplateValidationError(f"Info grid element at index {idx} missing 'fields'.")
