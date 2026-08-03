"""
Tests for ADBG Visual Regression, Preview Generation, Contact Sheet, and Paper Figure Export.
"""

from __future__ import annotations

import numpy as np
import pytest

from adbg.core.plugin_registry import PluginRegistry
from adbg.core.seed_manager import SeedManager
from adbg.degradations.blur import DefocusBlurOperator, GaussianBlurOperator, MotionBlurOperator
from adbg.degradations.brightness import BrightnessOperator, ContrastOperator
from adbg.degradations.compression import ColorShiftOperator, JpegCompressionOperator
from adbg.degradations.figures import ResearchPaperFigureGenerator
from adbg.degradations.lens import LensDistortionOperator
from adbg.degradations.noise import (
    GaussianNoiseOperator,
    PoissonNoiseOperator,
    SaltPepperNoiseOperator,
    SpeckleNoiseOperator,
)
from adbg.degradations.perspective import PerspectiveTransformOperator
from adbg.degradations.preview import (
    ContactSheetGenerator,
    DegradationPreviewGenerator,
    compute_image_sha256,
)
from adbg.degradations.reporter import DegradationReporter
from adbg.degradations.rotation import RotationOperator
from adbg.degradations.shadow import GradientShadowOperator


@pytest.fixture(autouse=True)
def register_degradations():
    """Ensure all degradation operators are registered for tests in this module."""
    from adbg.degradations import register_all_degradations
    register_all_degradations()


@pytest.fixture
def sample_image() -> np.ndarray:
    """Create a 150x150 RGB synthetic test image."""
    img = np.full((150, 150, 3), 255, dtype=np.uint8)
    img[30:50, 20:130] = [10, 10, 10]
    img[70:90, 20:130] = [10, 10, 10]
    return img


class TestVisualRegressionAndPreview:

    def test_visual_regression_sha256_stability(self, sample_image: np.ndarray, seed_42: SeedManager) -> None:
        """Verify that the exact same seed produces the exact same SHA-256 image hash."""
        from adbg.degradations.engine import DegradationEngine
        engine = DegradationEngine()

        res1 = engine.apply_degradation(sample_image, "scanner_copy", seed_42)
        res2 = engine.apply_degradation(sample_image, "scanner_copy", SeedManager(seed=42))

        hash1 = compute_image_sha256(res1.image)
        hash2 = compute_image_sha256(res2.image)

        assert hash1 == hash2, "Visual regression test failed! Image hash changed for identical seed."

    def test_step_by_step_preview(self, sample_image: np.ndarray, seed_42: SeedManager) -> None:
        preview_gen = DegradationPreviewGenerator()
        composite, steps_meta = preview_gen.generate_step_by_step_preview(
            sample_image, "mobile_camera", seed_42
        )

        assert isinstance(composite, np.ndarray)
        assert composite.ndim == 3
        assert len(steps_meta) > 1
        assert "sha256" in steps_meta[0]

    def test_contact_sheet_generation(self, sample_image: np.ndarray, seed_42: SeedManager) -> None:
        cs_gen = ContactSheetGenerator()
        sheet, hashes = cs_gen.generate_contact_sheet(sample_image, seed_42)

        assert isinstance(sheet, np.ndarray)
        assert sheet.ndim == 3
        assert "clean_pdf" in hashes
        assert "mobile_camera" in hashes

    def test_degradation_reporter(self) -> None:
        reporter = DegradationReporter()
        params = {"rotation": {"angle_degrees": 1.5}}
        json_rep = reporter.generate_json_report("DOC-1234", "rotated", 42, params, "abc123hash")
        md_rep = reporter.generate_markdown_report("DOC-1234", "rotated", 42, params, "abc123hash")

        assert "DOC-1234" in json_rep
        assert "abc123hash" in json_rep
        assert "DOC-1234" in md_rep
        assert "`rotation`" in md_rep

    def test_publication_figure_generator(self, sample_image: np.ndarray, seed_42: SeedManager) -> None:
        fig_gen = ResearchPaperFigureGenerator()
        figure = fig_gen.generate_publication_figure(sample_image, seed_42)

        assert isinstance(figure, np.ndarray)
        assert figure.ndim == 3
        assert figure.shape[0] > sample_image.shape[0]
