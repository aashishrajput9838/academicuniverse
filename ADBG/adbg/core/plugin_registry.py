"""
ADBG Plugin Registry — Auto-Discovery and Registration of Document Generators
and Degradation Operators.

This module implements the plugin architecture that allows new document types
and degradation techniques to be added without modifying the framework core.

Registration Pattern:
    Plugins register themselves at module import time via class-level calls:

        # In adbg/generators/certificate.py
        class CertificateGenerator(DocumentGenerator):
            ...

        PluginRegistry.register_generator(CertificateGenerator)

    The generators/__init__.py imports all generator modules, triggering
    auto-registration during package initialization.

Extension Guide:
    To add a new document type:
        1. Create adbg/generators/my_document.py
        2. Implement DocumentGenerator ABC
        3. Call PluginRegistry.register_generator(MyDocumentGenerator)
        4. Add `from . import my_document` to generators/__init__.py
    No other files need to change.
"""

from __future__ import annotations

import logging
from typing import TypeVar

from adbg.core.interfaces import DegradationOperator, DocumentGenerator

logger = logging.getLogger(__name__)

T = TypeVar("T")


class PluginRegistry:
    """
    Central registry for document generators and degradation operators.

    This is a class-level (static) registry. All registration and lookup
    methods are classmethods, so no instantiation is needed.

    Thread Safety:
        Registration is expected to happen at import time (module-level).
        After initialization, the registry is read-only and thread-safe.
    """

    # Class-level storage — shared across all uses
    _generators: dict[str, type[DocumentGenerator]] = {}
    _degradation_operators: dict[str, type[DegradationOperator]] = {}

    # -------------------------------------------------------------------
    # Generator Registration
    # -------------------------------------------------------------------

    @classmethod
    def register_generator(cls, generator_class: type[DocumentGenerator]) -> None:
        """
        Register a document generator plugin.

        Args:
            generator_class: A concrete class implementing DocumentGenerator.
                             Must have a no-arg constructor.

        Raises:
            TypeError: If generator_class does not implement DocumentGenerator.
            ValueError: If a generator with the same document_type is already
                        registered.
        """
        if not (isinstance(generator_class, type) and issubclass(generator_class, DocumentGenerator)):
            raise TypeError(
                f"Expected a DocumentGenerator subclass, got {type(generator_class).__name__}."
            )

        # Instantiate temporarily to get the document_type
        instance = generator_class()
        doc_type = instance.document_type()

        if doc_type in cls._generators:
            existing = cls._generators[doc_type].__name__
            raise ValueError(
                f"Document type '{doc_type}' is already registered by {existing}. "
                f"Cannot register {generator_class.__name__}."
            )

        cls._generators[doc_type] = generator_class
        logger.info(
            "Registered document generator: %s -> %s",
            doc_type,
            generator_class.__name__,
        )

    @classmethod
    def get_generator(cls, document_type: str) -> DocumentGenerator:
        """
        Instantiate and return a document generator by document type.

        Raises:
            KeyError: If no generator is registered for the specified type.
        """
        if not cls._generators:
            from adbg.generators import register_all_generators
            register_all_generators()

        if document_type not in cls._generators:
            available = ", ".join(cls.available_document_types())
            raise KeyError(
                f"No generator registered for document type '{document_type}'. "
                f"Available types: {available if available else '(none)'}"
            )
        return cls._generators[document_type]()

    @classmethod
    def available_document_types(cls) -> list[str]:
        """Return sorted list of all registered document type identifiers."""
        return sorted(cls._generators.keys())

    @classmethod
    def is_generator_registered(cls, document_type: str) -> bool:
        """Check if a generator is registered for the given type."""
        return document_type in cls._generators

    # -------------------------------------------------------------------
    # Degradation Operator Registration
    # -------------------------------------------------------------------

    @classmethod
    def is_degradation_registered(cls, name: str) -> bool:
        """Check if a degradation operator is registered by name."""
        return name in cls._degradation_operators

    @classmethod
    def register_degradation(cls, operator_class: type[DegradationOperator]) -> None:
        """
        Register a degradation operator plugin.

        Args:
            operator_class: A concrete class implementing DegradationOperator.

        Raises:
            TypeError: If operator_class does not implement DegradationOperator.
            ValueError: If an operator with the same name is already registered.
        """
        if not (isinstance(operator_class, type) and issubclass(operator_class, DegradationOperator)):
            raise TypeError(
                f"Expected a DegradationOperator subclass, got {type(operator_class).__name__}."
            )

        instance = operator_class()
        op_name = instance.name()

        if op_name in cls._degradation_operators:
            existing = cls._degradation_operators[op_name].__name__
            raise ValueError(
                f"Degradation operator '{op_name}' is already registered by {existing}. "
                f"Cannot register {operator_class.__name__}."
            )

        cls._degradation_operators[op_name] = operator_class
        logger.info(
            "Registered degradation operator: %s -> %s",
            op_name,
            operator_class.__name__,
        )

    @classmethod
    def get_degradation(cls, name: str) -> DegradationOperator:
        """
        Instantiate and return a degradation operator by name.

        Raises:
            KeyError: If no degradation operator is registered with the given name.
        """
        if not cls._degradation_operators:
            from adbg.degradations import register_all_degradations
            register_all_degradations()

        if name not in cls._degradation_operators:
            available = ", ".join(cls.available_degradation_names())
            raise KeyError(
                f"No degradation operator registered for '{name}'. "
                f"Available operators: {available if available else '(none)'}"
            )
        return cls._degradation_operators[name]()

    @classmethod
    def get_all_degradations(cls) -> list[DegradationOperator]:
        """Instantiate and return all registered degradation operators."""
        if not cls._degradation_operators:
            from adbg.degradations import register_all_degradations
            register_all_degradations()
        return [op_cls() for op_cls in cls._degradation_operators.values()]

    @classmethod
    def available_degradation_names(cls) -> list[str]:
        """Return sorted list of all registered degradation operator names."""
        return sorted(cls._degradation_operators.keys())

    # -------------------------------------------------------------------
    # Registry Management
    # -------------------------------------------------------------------

    @classmethod
    def clear(cls) -> None:
        """
        Clear all registrations. Primarily for testing.

        WARNING: This resets the global registry state. Only use in test
        fixtures to ensure test isolation.
        """
        cls._generators.clear()
        cls._degradation_operators.clear()
        logger.warning("Plugin registry cleared — all registrations removed.")

    @classmethod
    def summary(cls) -> dict[str, list[str]]:
        """
        Return a summary of all registered plugins.

        Returns:
            Dict with 'generators' and 'degradations' keys, each containing
            a list of registered identifiers.
        """
        return {
            "generators": cls.available_document_types(),
            "degradations": cls.available_degradation_names(),
        }
