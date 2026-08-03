"""
ADBG Degradation Engine — Orchestrates CV degradation pipelines deterministically.

Applies ordered degradation operators according to QualityProfiles using child SeedManagers.
Returns Degraded images alongside exact applied parameter dicts for auditability and research reproducibility.
"""

from __future__ import annotations

import logging
from collections.abc import Sequence
from typing import Any

import numpy as np

from adbg.core.interfaces import DegradationResult, QualityProfile
from adbg.core.plugin_registry import PluginRegistry
from adbg.core.seed_manager import SeedManager
from adbg.degradations.profiles import QualityProfileRegistry

logger = logging.getLogger(__name__)


class DegradationEngine:
    """
    CV Degradation Pipeline Engine.

    Executes registered DegradationOperators sequentially on image input
    using seed-driven random decision-making.
    """

    def apply_degradation(
        self,
        image: np.ndarray,
        profile_or_name: str | QualityProfile,
        seed: SeedManager,
    ) -> DegradationResult:
        """
        Apply a quality degradation pipeline to a single image.

        Args:
            image: Input NumPy BGR/RGB image uint8 array.
            profile_or_name: QualityProfile object or profile name string.
            seed: Dedicated child SeedManager for this degradation execution.

        Returns:
            DegradationResult with degraded image and exact applied parameters dict.
        """
        if isinstance(profile_or_name, str):
            profile = QualityProfileRegistry.get_profile(profile_or_name)
        else:
            profile = profile_or_name

        current_image = image.copy()
        applied_metadata: dict[str, dict[str, Any]] = {}

        # Child seed for operator execution
        rng = seed.rng

        for op_name, probability, params in profile.operators:
            # Decide whether to apply operator based on seed
            if seed.random_bool(probability):
                try:
                    operator = PluginRegistry.get_degradation(op_name)
                    # Apply operator safely (copy-on-write)
                    op_seed = seed.child()
                    degraded_img, applied_params = operator.apply(
                        current_image, params, op_seed.rng
                    )
                    current_image = degraded_img
                    applied_metadata[op_name] = applied_params
                except Exception as exc:
                    logger.error("Error applying degradation operator '%s': %s", op_name, exc)
                    raise exc

        return DegradationResult(
            image=current_image,
            parameters=applied_metadata,
        )

    def apply_batch(
        self,
        images: Sequence[np.ndarray],
        profiles: Sequence[str | QualityProfile],
        seed: SeedManager,
    ) -> list[DegradationResult]:
        """
        Apply degradation pipeline to a batch of images.

        Prepares architecture for parallel map-reduce execution.

        Args:
            images: List of input images.
            profiles: List of quality profiles corresponding to images.
            seed: Parent SeedManager spawning child seed per image.

        Returns:
            List of DegradationResult objects in identical order.
        """
        if len(images) != len(profiles):
            raise ValueError(f"Images count ({len(images)}) does not match profiles count ({len(profiles)})")

        results: list[DegradationResult] = []
        for img, prof in zip(images, profiles):
            child_seed = seed.child()
            res = self.apply_degradation(img, prof, child_seed)
            results.append(res)

        return results
