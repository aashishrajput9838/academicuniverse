"""
Tests for ADBG Document Generators plugins (Phase 3).

Verifies:
    - Registration of CertificateGenerator, MarksheetGenerator, and StudentIDGenerator.
    - PluginRegistry retrieval and instantiation.
    - End-to-end PDF generation for each document type.
    - Completeness of generated document metadata (IDs, schema version, generator version).
"""

from __future__ import annotations

import pytest

from adbg.core.plugin_registry import PluginRegistry
from adbg.core.seed_manager import SeedManager
from adbg.data.fabricator import AcademicDataFabricator
from adbg.generators.certificate import CertificateGenerator
from adbg.generators.marksheet import MarksheetGenerator
from adbg.generators.student_id import StudentIDGenerator
from adbg.templates.loader import YamlTemplateLoader


@pytest.fixture(autouse=True)
def register_test_generators():
    """Ensure generator plugins are registered for tests in this module."""
    PluginRegistry.register_generator(CertificateGenerator)
    PluginRegistry.register_generator(MarksheetGenerator)
    PluginRegistry.register_generator(StudentIDGenerator)


class TestDocumentGenerators:

    def test_generators_auto_registration(self) -> None:
        types = PluginRegistry.available_document_types()
        assert "certificate" in types
        assert "marksheet" in types
        assert "student_id" in types

    def test_certificate_generator(self, seed_42: SeedManager) -> None:
        generator = PluginRegistry.get_generator("certificate")
        assert generator.document_type() == "certificate"

        fab = AcademicDataFabricator()
        data = fab.fabricate_document_data(
            seed=seed_42,
            document_type="certificate",
            template_id="certificate_alpha",
        )

        loader = YamlTemplateLoader()
        template = loader.get_template("certificate_alpha")

        doc = generator.generate(data, template)

        assert doc.document_type == "certificate"
        assert doc.document_id == data.document_id
        assert doc.document_uuid == data.document_uuid
        assert doc.schema_version == "1.0.0"
        assert doc.generator_version == "1.0.0"
        assert doc.pdf_bytes.startswith(b"%PDF-")
        assert len(doc.pdf_bytes) > 1000

    def test_marksheet_generator(self, seed_42: SeedManager) -> None:
        generator = PluginRegistry.get_generator("marksheet")
        assert generator.document_type() == "marksheet"

        fab = AcademicDataFabricator()
        data = fab.fabricate_document_data(
            seed=seed_42,
            document_type="marksheet",
            template_id="marksheet_alpha",
        )

        loader = YamlTemplateLoader()
        template = loader.get_template("marksheet_alpha")

        doc = generator.generate(data, template)

        assert doc.document_type == "marksheet"
        assert doc.document_id == data.document_id
        assert doc.document_uuid == data.document_uuid
        assert doc.schema_version == "1.0.0"
        assert doc.generator_version == "1.0.0"
        assert doc.pdf_bytes.startswith(b"%PDF-")
        assert len(doc.pdf_bytes) > 1000

    def test_student_id_generator(self, seed_42: SeedManager) -> None:
        generator = PluginRegistry.get_generator("student_id")
        assert generator.document_type() == "student_id"

        fab = AcademicDataFabricator()
        data = fab.fabricate_document_data(
            seed=seed_42,
            document_type="student_id",
            template_id="student_id_alpha",
        )

        loader = YamlTemplateLoader()
        template = loader.get_template("student_id_alpha")

        doc = generator.generate(data, template)

        assert doc.document_type == "student_id"
        assert doc.document_id == data.document_id
        assert doc.document_uuid == data.document_uuid
        assert doc.schema_version == "1.0.0"
        assert doc.generator_version == "1.0.0"
        assert doc.pdf_bytes.startswith(b"%PDF-")
        assert len(doc.pdf_bytes) > 1000
