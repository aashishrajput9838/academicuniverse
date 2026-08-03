"""
End-to-End Tests for ADBG GenerationPipeline, ManifestVerifier, and CLI commands (Phase 5).
"""

from __future__ import annotations

from pathlib import Path

import pytest

from adbg.core.interfaces import GenerationConfig
from adbg.core.pipeline import GenerationPipeline
from adbg.core.plugin_registry import PluginRegistry
from adbg.degradations.blur import DefocusBlurOperator, GaussianBlurOperator, MotionBlurOperator
from adbg.degradations.brightness import BrightnessOperator, ContrastOperator
from adbg.degradations.compression import ColorShiftOperator, JpegCompressionOperator
from adbg.degradations.lens import LensDistortionOperator
from adbg.degradations.noise import (
    GaussianNoiseOperator,
    PoissonNoiseOperator,
    SaltPepperNoiseOperator,
    SpeckleNoiseOperator,
)
from adbg.degradations.perspective import PerspectiveTransformOperator
from adbg.degradations.rotation import RotationOperator
from adbg.degradations.shadow import GradientShadowOperator
from adbg.generators.certificate import CertificateGenerator
from adbg.generators.marksheet import MarksheetGenerator
from adbg.generators.student_id import StudentIDGenerator
from adbg.manifest.builder import ManifestVerifier


@pytest.fixture(autouse=True)
def register_all_plugins():
    """Ensure generators and degradation operators are registered for pipeline integration tests."""
    from adbg.generators import register_all_generators
    from adbg.degradations import register_all_degradations

    register_all_generators()
    register_all_degradations()


class TestGenerationPipeline:

    def test_pipeline_end_to_end(self, tmp_path: Path) -> None:
        out = tmp_path / "test_dataset"
        cfg = GenerationConfig(
            count=3,
            seed=42,
            output_dir=str(out),
        )

        pipeline = GenerationPipeline()
        result = pipeline.run(cfg)

        assert result.total_documents == 3
        assert len(result.document_ids) == 3
        assert result.manifest is not None
        assert result.statistics is not None

        # Verify output filesystem structure
        assert (out / "manifest.json").exists()
        assert (out / "statistics.json").exists()
        assert (out / "pdf").exists()
        assert (out / "images" / "png").exists()
        assert (out / "images" / "jpeg").exists()
        assert (out / "groundtruth").exists()
        assert (out / "metadata").exists()
        assert (out / "reports" / "degradation_audit.md").exists()
        assert (out / "figures" / "figure_1_degradation_grid.png").exists()

        # Check sample counts in subdirectories
        pdfs = list((out / "pdf").glob("*.pdf"))
        pngs = list((out / "images" / "png").glob("*.png"))
        jpegs = list((out / "images" / "jpeg").glob("*.jpeg"))
        gts = list((out / "groundtruth").glob("*.json"))
        metas = list((out / "metadata").glob("*.json"))

        assert len(pdfs) == 3
        assert len(pngs) == 3
        assert len(jpegs) == 3
        assert len(gts) == 3
        assert len(metas) == 3

    def test_manifest_verifier_success(self, tmp_path: Path) -> None:
        out = tmp_path / "verify_dataset"
        cfg = GenerationConfig(count=2, seed=123, output_dir=str(out))

        pipeline = GenerationPipeline()
        pipeline.run(cfg)

        verifier = ManifestVerifier()
        is_valid, errors = verifier.verify_dataset(out)

        assert is_valid is True
        assert len(errors) == 0

    def test_pipeline_determinism(self, tmp_path: Path) -> None:
        out1 = tmp_path / "run1"
        out2 = tmp_path / "run2"

        cfg1 = GenerationConfig(count=2, seed=99, output_dir=str(out1))
        cfg2 = GenerationConfig(count=2, seed=99, output_dir=str(out2))

        pipeline = GenerationPipeline()
        res1 = pipeline.run(cfg1)
        res2 = pipeline.run(cfg2)

        assert res1.document_ids == res2.document_ids
        assert res1.statistics.documents_by_type == res2.statistics.documents_by_type
