"""
ADBG Gradient Shadow Operator.
"""

from __future__ import annotations

from typing import Any

import numpy as np

from adbg.core.interfaces import DegradationOperator
from adbg.core.plugin_registry import PluginRegistry


class GradientShadowOperator(DegradationOperator):
    """Simulates realistic linear gradient shadows cast across document photos."""

    def name(self) -> str:
        return "gradient_shadow"

    def apply(
        self,
        image: np.ndarray,
        params: dict[str, Any],
        rng: np.random.Generator,
    ) -> tuple[np.ndarray, dict[str, Any]]:
        h, w = image.shape[:2]
        max_opacity = float(params.get("max_opacity", 0.4))
        opacity = float(rng.uniform(0.1, max_opacity))

        angle = float(rng.uniform(0, 2 * np.pi))
        cos_a, sin_a = np.cos(angle), np.sin(angle)

        y_indices, x_indices = np.indices((h, w))
        projection = (x_indices / w) * cos_a + (y_indices / h) * sin_a
        min_p, max_p = projection.min(), projection.max()
        norm_proj = (projection - min_p) / (max_p - min_p + 1e-6)

        # Gradient map from 1.0 down to (1.0 - opacity)
        shadow_map = 1.0 - (norm_proj * opacity)
        shadow_map = shadow_map[:, :, np.newaxis]

        result = (image.astype(np.float32) * shadow_map).clip(0, 255).astype(np.uint8)

        return result, {"opacity": round(opacity, 3), "angle_rad": round(angle, 3)}


PluginRegistry.register_degradation(GradientShadowOperator)
