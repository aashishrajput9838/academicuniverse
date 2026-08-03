"""
ADBG Lens Distortion Operator.
"""

from __future__ import annotations

from typing import Any

import cv2
import numpy as np

from adbg.core.interfaces import DegradationOperator
from adbg.core.plugin_registry import PluginRegistry


class LensDistortionOperator(DegradationOperator):
    """Simulates radial barrel/pincushion camera lens distortion."""

    def name(self) -> str:
        return "lens_distortion"

    def apply(
        self,
        image: np.ndarray,
        params: dict[str, Any],
        rng: np.random.Generator,
    ) -> tuple[np.ndarray, dict[str, Any]]:
        h, w = image.shape[:2]
        max_k1 = float(params.get("max_k1", 0.2))
        k1 = float(rng.uniform(-max_k1, max_k1))

        camera_matrix = np.array([[w, 0, w / 2.0], [0, h, h / 2.0], [0, 0, 1.0]], dtype=np.float32)
        dist_coeffs = np.array([k1, 0, 0, 0, 0], dtype=np.float32)

        distorted = cv2.undistort(image, camera_matrix, dist_coeffs)

        return distorted, {"k1": round(k1, 4)}


PluginRegistry.register_degradation(LensDistortionOperator)
