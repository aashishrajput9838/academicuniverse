"""
Tests for ADBG Template Engine, TemplateValidator, and ReportLab Renderer.
"""

from __future__ import annotations

import pytest

from adbg.core.seed_manager import SeedManager
from adbg.data.fabricator import AcademicDataFabricator
from adbg.templates.loader import YamlTemplateLoader
from adbg.templates.renderer import ReportLabTemplateRenderer
from adbg.templates.validator import TemplateValidationError, TemplateValidator


class TestTemplateValidator:

    def test_valid_template_passes(self) -> None:
        valid_dict = {
            "metadata": {
                "template_id": "test_tmpl",
                "template_version": "1.0.0",
                "author": "Test Author",
                "description": "Valid template",
                "supported_universities": ["university_alpha"],
                "document_type": "marksheet",
            },
            "page": {"size": "A4", "orientation": "portrait"},
            "elements": [
                {"type": "text", "text": "Hello World"},
                {"type": "rect", "width": 100, "height": 50},
            ],
        }
        # Should not raise
        TemplateValidator.validate(valid_dict)

    def test_invalid_semver_raises(self) -> None:
        invalid_dict = {
            "metadata": {
                "template_id": "test_tmpl",
                "template_version": "v1.0",  # Invalid semver
                "author": "Test Author",
                "description": "Test",
                "supported_universities": ["u1"],
                "document_type": "marksheet",
            },
            "page": {"size": "A4"},
            "elements": [],
        }
        with pytest.raises(TemplateValidationError, match="Must follow Semantic Versioning"):
            TemplateValidator.validate(invalid_dict)

    def test_invalid_element_type_raises(self) -> None:
        invalid_dict = {
            "metadata": {
                "template_id": "test_tmpl",
                "template_version": "1.0.0",
                "author": "Test",
                "description": "Test",
                "supported_universities": ["u1"],
                "document_type": "marksheet",
            },
            "page": {"size": "A4"},
            "elements": [{"type": "invalid_type"}],
        }
        with pytest.raises(TemplateValidationError, match="invalid type"):
            TemplateValidator.validate(invalid_dict)


class TestTemplateLoader:

    def test_load_all_templates(self) -> None:
        loader = YamlTemplateLoader()
        templates = loader.load_all()

        assert "marksheet_alpha" in templates
        assert "certificate_alpha" in templates
        assert "student_id_alpha" in templates

    def test_template_metadata_versioning(self) -> None:
        loader = YamlTemplateLoader()
        t = loader.get_template("marksheet_alpha")

        assert t.metadata.template_id == "marksheet_alpha"
        assert t.metadata.template_version == "1.0.0"
        assert t.metadata.author == "Academic Universe Research Team"
        assert len(t.metadata.supported_universities) >= 4
        assert t.metadata.document_type == "marksheet"


class TestTemplateRenderer:

    def test_render_pdf_marksheet(self, seed_42: SeedManager) -> None:
        fab = AcademicDataFabricator()
        data = fab.fabricate_document_data(
            seed=seed_42,
            document_type="marksheet",
            template_id="marksheet_alpha",
        )

        loader = YamlTemplateLoader()
        template = loader.get_template("marksheet_alpha")

        context = {
            "university": data.university,
            "student": data.student,
            "issue_date": data.issue_date,
            "semester_records": data.semester_records,
            "cgpa": data.cgpa,
        }

        renderer = ReportLabTemplateRenderer()
        pdf_bytes = renderer.render_pdf(template, context)

        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 1000
        assert pdf_bytes.startswith(b"%PDF-")
