"""
ADBG Document Generators — Pluggable document type implementations.

Each module in this package implements a DocumentGenerator for a specific
academic document type. Generators auto-register with the PluginRegistry
at import time.
"""

from adbg.generators import certificate, marksheet, student_id


def register_all_generators() -> None:
    """Explicitly register all standard built-in document generators."""
    from adbg.core.plugin_registry import PluginRegistry

    for cls_item in [
        certificate.CertificateGenerator,
        marksheet.MarksheetGenerator,
        student_id.StudentIDGenerator,
    ]:
        if not PluginRegistry.is_generator_registered(cls_item().document_type()):
            PluginRegistry.register_generator(cls_item)


register_all_generators()

__all__ = [
    "certificate",
    "marksheet",
    "student_id",
    "register_all_generators",
]
