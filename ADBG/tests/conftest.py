"""
ADBG Test Fixtures — Shared pytest fixtures for the test suite.

Provides deterministic seeds, temporary directories, and registry
cleanup for all test modules.
"""

from __future__ import annotations

import pytest

from adbg.core.plugin_registry import PluginRegistry
from adbg.core.seed_manager import SeedManager

# ------------------------------------------------------------------
# Seed Fixtures
# ------------------------------------------------------------------

@pytest.fixture
def seed_42() -> SeedManager:
    """Provide a SeedManager initialized with seed=42."""
    return SeedManager(seed=42)


@pytest.fixture
def seed_0() -> SeedManager:
    """Provide a SeedManager initialized with seed=0."""
    return SeedManager(seed=0)


@pytest.fixture
def seed_99999() -> SeedManager:
    """Provide a SeedManager initialized with seed=99999."""
    return SeedManager(seed=99999)


# ------------------------------------------------------------------
# Registry Fixtures
# ------------------------------------------------------------------

@pytest.fixture(autouse=True)
def clean_registry():
    """
    Ensure the plugin registry is clean before and after each test.

    This prevents test pollution from generator/operator registrations.
    """
    PluginRegistry.clear()
    yield
    PluginRegistry.clear()


# ------------------------------------------------------------------
# Output Directory Fixture
# ------------------------------------------------------------------

@pytest.fixture
def output_dir(tmp_path):
    """Provide a temporary output directory for test generation runs."""
    out = tmp_path / "test_output"
    out.mkdir()
    return out
