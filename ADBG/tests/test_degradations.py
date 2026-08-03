"""
Tests for ADBG Computer Vision Degradation Engine (Phase 4).

Verifies:
    - Auto-registration of all 15 degradation operators.
    - Individual operator execution and output contracts.
    - QualityProfileRegistry loading and custom profile building.
    - Determinism of DegradationEngine (identical seed -> identical image output & metadata).
    - Batch degradation execution.
"""

from __future__ import annotations

import numpy as np
import pytest

from adbg.core.plugin_registry import PluginRegistry
from adbg.core.seed_manager import SeedManager
from adbg.degradations.blur import DefocusBlurOperator, GaussianBlurOperator, MotionBlurOperator
from adbg.degradations.brightness import BrightnessOperator, ContrastOperator
from adbg.degradations.compression import ColorShiftOperator, JpegCompressionOperator
from adbg.degradations.engine import DegradationEngine
from adbg.degradations.lens import LensDistortionOperator
from adbg.degradations.noise import (
    GaussianNoiseOperator,
    PoissonNoiseOperator,
    SaltPepperNoiseOperator,
    SpeckleNoiseOperator,
)
from adbg.degradations.perspective import PerspectiveTransformOperator
from adbg.degradations.profiles import QualityProfileRegistry
from adbg.degradations.rotation import RotationOperator, SkewOperator
from adbg.degradations.shadow import GradientShadowOperator


@pytest.fixture(autouse=True)
def register_degradations():
    """Ensure all degradation operators are registered for tests in this module."""
    from adbg.degradations import register_all_degradations
    register_all_degradations()


@pytest.fixture
def sample_image() -> np.ndarray:
    """Create a 200x200 RGB synthetic test image with text-like shapes."""
    img = np.full((200, 200, 3), 255, dtype=np.uint8)
    # Draw some dark blocks simulating text
    img[40:60, 20:180] = [20, 20, 20]
    img[80:100, 20:180] = [20, 20, 20]
    img[120:140, 20:180] = [20, 20, 20]
    return img


class TestOperatorRegistration:

    def test_all_15_operators_registered(self) -> None:
        ops = PluginRegistry.available_degradation_names()
        expected = [
            "brightness",
            "color_shift",
            "contrast",
            "defocus_blur",
            "gaussian_blur",
            "gaussian_noise",
            "gradient_shadow",
            "jpeg_compression",
            "lens_distortion",
            "motion_blur",
            "perspective_warp",
            "poisson_noise",
            "rotation",
            "salt_pepper_noise",
            "speckle_noise",
        ]
        for name in expected:
            assert name in ops, f"Operator '{name}' not registered in PluginRegistry!"


class TestIndividualOperators:

    @pytest.mark.parametrize("op_name", [
        "perspective_warp",
        "rotation",
        "skew",
        "lens_distortion",
        "brightness",
        "contrast",
        "gradient_shadow",
        "gaussian_blur",
        "motion_blur",
        "defocus_blur",
        "gaussian_noise",
        "salt_pepper_noise",
        "poisson_noise",
        "speckle_noise",
        "jpeg_compression",
        "color_shift",
    ])
    def test_operator_execution(self, op_name: str, sample_image: np.ndarray, seed_42: SeedManager) -> None:
        operator = PluginRegistry.get_degradation(op_name)
        degraded, params = operator.apply(sample_image, {}, seed_42.rng)

        assert isinstance(degraded, np.ndarray)
        assert degraded.ndim == sample_image.ndim
        assert degraded.dtype == np.uint8
        assert isinstance(params, dict)


class TestDegradationEngineDeterminism:

    def test_engine_determinism(self, sample_image: np.ndarray, seed_42: SeedManager) -> None:
        engine = DegradationEngine()

        res1 = engine.apply_degradation(sample_image, "mobile_camera", seed_42)
        res2 = engine.apply_degradation(sample_image, "mobile_camera", SeedManager(seed=42))

        # Check identical pixel outputs
        assert np.array_equal(res1.image, res2.image)
        # Check identical parameter dicts
        assert res1.parameters == res2.parameters

    def test_batch_degradation(self, sample_image: np.ndarray, seed_42: SeedManager) -> None:
        engine = DegradationEngine()
        images = [sample_image, sample_image]
        profiles = ["scanner_copy", "mobile_camera"]

        results = engine.apply_batch(images, profiles, seed_42)
        assert len(results) == 2
        assert isinstance(results[0].image, np.ndarray)
        assert isinstance(results[1].image, np.ndarray)


class TestQualityProfiles:

    def test_builtin_profiles(self) -> None:
        profiles = QualityProfileRegistry.list_profiles()
        assert "clean_pdf" in profiles
        assert "scanner_copy" in profiles
        assert "mobile_camera" in profiles
        assert "rotated" in profiles

    def test_custom_profile_registration(self) -> None:
        p = QualityProfileRegistry.from_dict(
            name="custom_test",
            description="Custom test profile",
            raw_ops=[
                {"name": "rotation", "probability": 1.0, "params": {"max_degrees": 5.0}},
            ],
        )
        assert p.name == "custom_test"
        assert QualityProfileRegistry.get_profile("custom_test") == p
