"""
ADBG Certificate Generator Plugin.

Concrete implementation of DocumentGenerator for degree certificates.
Renders clean PDFs using the data-driven ReportLabTemplateRenderer.
Auto-registers with PluginRegistry at module import time.
"""

from __future__ import annotations

from typing import Any

from adbg.core.interfaces import (
    DocumentData,
    DocumentGenerator,
    GeneratedDocument,
    TemplateDefinition,
)
from adbg.core.plugin_registry import PluginRegistry
from adbg.templates.renderer import ReportLabTemplateRenderer


class CertificateGenerator(DocumentGenerator):
    """
    Document generator plugin for degree certificates.
    """

    def __init__(self) -> None:
        self._renderer = ReportLabTemplateRenderer()

    def document_type(self) -> str:
        return "certificate"

    def build_render_context(self, data: DocumentData) -> dict[str, Any]:
        """
        Build template binding context from DocumentData.
        """
        return {
            "university": data.university,
            "student": data.student,
            "issue_date": data.issue_date,
            "cgpa": f"{data.cgpa:.2f}",
            "schema_version": data.schema_version,
            "generator_version": data.generator_version,
            "benchmark_version": data.benchmark_version,
            "dataset_version": data.dataset_version,
            "experiment_id": data.experiment_id,
            "locale": data.locale,
        }

    def generate(
        self, data: DocumentData, template: TemplateDefinition
    ) -> GeneratedDocument:
        """
        Render certificate document to PDF bytes.
        """
        context = self.build_render_context(data)
        pdf_bytes = self._renderer.render_pdf(template, context)

        return GeneratedDocument(
            document_id=data.document_id,
            document_uuid=data.document_uuid,
            pdf_bytes=pdf_bytes,
            document_type=self.document_type(),
            template_id=template.metadata.template_id,
            template_version=template.metadata.template_version,
            university_id=data.university.university_id,
            schema_version=data.schema_version,
            generator_version=data.generator_version,
            data=data,
        )


# Register with PluginRegistry at import time
PluginRegistry.register_generator(CertificateGenerator)
