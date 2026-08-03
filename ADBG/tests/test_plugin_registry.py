"""
Tests for ADBG PluginRegistry — Generator and degradation operator registration.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pytest

from adbg.core.interfaces import (
    DegradationOperator,
    DocumentData,
    DocumentGenerator,
    GeneratedDocument,
    TemplateDefinition,
)
from adbg.core.plugin_registry import PluginRegistry

# ------------------------------------------------------------------
# Test Fixtures — Mock Plugins
# ------------------------------------------------------------------

class MockCertificateGenerator(DocumentGenerator):
    """Mock generator for testing registration."""

    def document_type(self) -> str:
        return "certificate"

    def generate(self, data: DocumentData, template: TemplateDefinition) -> GeneratedDocument:
        return GeneratedDocument(
            document_id=data.document_id,
            pdf_bytes=b"%PDF-mock",
            document_type="certificate",
            template_id=template.metadata.template_id,
            template_version=template.metadata.template_version,
            university_id=data.university.university_id,
            data=data,
        )

    def build_render_context(self, data: DocumentData) -> dict[str, Any]:
        return {}


class MockMarksheetGenerator(DocumentGenerator):
    """Another mock generator for testing multiple registrations."""

    def document_type(self) -> str:
        return "marksheet"

    def generate(self, data: DocumentData, template: TemplateDefinition) -> GeneratedDocument:
        return GeneratedDocument(
            document_id=data.document_id,
            pdf_bytes=b"%PDF-mock-ms",
            document_type="marksheet",
            template_id=template.metadata.template_id,
            template_version=template.metadata.template_version,
            university_id=data.university.university_id,
            data=data,
        )

    def build_render_context(self, data: DocumentData) -> dict[str, Any]:
        return {}


class MockBlurOperator(DegradationOperator):
    """Mock degradation operator for testing."""

    def name(self) -> str:
        return "gaussian_blur"

    def apply(
        self,
        image: np.ndarray,
        params: dict[str, Any],
        rng: np.random.Generator,
    ) -> tuple[np.ndarray, dict[str, Any]]:
        return image.copy(), {"sigma": 1.0}


class MockNoiseOperator(DegradationOperator):
    """Another mock degradation operator."""

    def name(self) -> str:
        return "gaussian_noise"

    def apply(
        self,
        image: np.ndarray,
        params: dict[str, Any],
        rng: np.random.Generator,
    ) -> tuple[np.ndarray, dict[str, Any]]:
        return image.copy(), {"sigma": 5.0}


# ------------------------------------------------------------------
# Generator Registration Tests
# ------------------------------------------------------------------

class TestGeneratorRegistration:
    """Test document generator registration and retrieval."""

    def test_register_and_retrieve(self) -> None:
        """Registered generator should be retrievable by document type."""
        PluginRegistry.register_generator(MockCertificateGenerator)

        gen = PluginRegistry.get_generator("certificate")
        assert isinstance(gen, MockCertificateGenerator)
        assert gen.document_type() == "certificate"

    def test_register_multiple_generators(self) -> None:
        """Multiple generators with different types should coexist."""
        PluginRegistry.register_generator(MockCertificateGenerator)
        PluginRegistry.register_generator(MockMarksheetGenerator)

        assert PluginRegistry.is_generator_registered("certificate")
        assert PluginRegistry.is_generator_registered("marksheet")
        assert not PluginRegistry.is_generator_registered("student_id")

    def test_duplicate_registration_raises(self) -> None:
        """Registering the same document type twice must raise ValueError."""
        PluginRegistry.register_generator(MockCertificateGenerator)

        with pytest.raises(ValueError, match="already registered"):
            PluginRegistry.register_generator(MockCertificateGenerator)

    def test_get_unregistered_raises(self) -> None:
        """Requesting an unregistered type must raise KeyError."""
        with pytest.raises(KeyError, match="No generator registered"):
            PluginRegistry.get_generator("nonexistent")

    def test_available_types(self) -> None:
        """available_document_types should return sorted registered types."""
        PluginRegistry.register_generator(MockMarksheetGenerator)
        PluginRegistry.register_generator(MockCertificateGenerator)

        types = PluginRegistry.available_document_types()
        assert types == ["certificate", "marksheet"]

    def test_register_non_subclass_raises(self) -> None:
        """Registering a non-DocumentGenerator class must raise TypeError."""
        with pytest.raises(TypeError, match="DocumentGenerator subclass"):
            PluginRegistry.register_generator(str)  # type: ignore


# ------------------------------------------------------------------
# Degradation Operator Registration Tests
# ------------------------------------------------------------------

class TestDegradationRegistration:
    """Test degradation operator registration and retrieval."""

    def test_register_and_retrieve(self) -> None:
        """Registered operator should be retrievable by name."""
        PluginRegistry.register_degradation(MockBlurOperator)

        op = PluginRegistry.get_degradation("gaussian_blur")
        assert isinstance(op, MockBlurOperator)
        assert op.name() == "gaussian_blur"

    def test_register_multiple_operators(self) -> None:
        """Multiple operators with different names should coexist."""
        PluginRegistry.register_degradation(MockBlurOperator)
        PluginRegistry.register_degradation(MockNoiseOperator)

        names = PluginRegistry.available_degradation_names()
        assert "gaussian_blur" in names
        assert "gaussian_noise" in names

    def test_duplicate_operator_raises(self) -> None:
        """Registering the same operator name twice must raise ValueError."""
        PluginRegistry.register_degradation(MockBlurOperator)

        with pytest.raises(ValueError, match="already registered"):
            PluginRegistry.register_degradation(MockBlurOperator)

    def test_get_all_degradations(self) -> None:
        """get_all_degradations should return instances of all operators."""
        PluginRegistry.register_degradation(MockBlurOperator)
        PluginRegistry.register_degradation(MockNoiseOperator)

        operators = PluginRegistry.get_all_degradations()
        assert len(operators) == 2
        names = {op.name() for op in operators}
        assert names == {"gaussian_blur", "gaussian_noise"}


# ------------------------------------------------------------------
# Registry Management Tests
# ------------------------------------------------------------------

class TestRegistryManagement:
    """Test registry clear and summary operations."""

    def test_clear_removes_all(self) -> None:
        """clear() should remove all registrations."""
        PluginRegistry.register_generator(MockCertificateGenerator)
        PluginRegistry.register_degradation(MockBlurOperator)

        PluginRegistry.clear()

        assert PluginRegistry.available_document_types() == []
        assert PluginRegistry.available_degradation_names() == []

    def test_summary(self) -> None:
        """summary() should return current registration state."""
        PluginRegistry.register_generator(MockCertificateGenerator)
        PluginRegistry.register_degradation(MockBlurOperator)

        summary = PluginRegistry.summary()
        assert summary["generators"] == ["certificate"]
        assert summary["degradations"] == ["gaussian_blur"]

    def test_re_register_after_clear(self) -> None:
        """After clear(), the same plugins should be re-registerable."""
        PluginRegistry.register_generator(MockCertificateGenerator)
        PluginRegistry.clear()
        PluginRegistry.register_generator(MockCertificateGenerator)

        assert PluginRegistry.is_generator_registered("certificate")
