"""
ADBG Perspective Transform Operator.
"""

from __future__ import annotations

from typing import Any

import cv2
import numpy as np

from adbg.core.interfaces import DegradationOperator
from adbg.core.plugin_registry import PluginRegistry


class PerspectiveTransformOperator(DegradationOperator):
    """Applies realistic perspective warping to simulate document photography."""

    def name(self) -> str:
        return "perspective_warp"

    def apply(
        self,
        image: np.ndarray,
        params: dict[str, Any],
        rng: np.random.Generator,
    ) -> tuple[np.ndarray, dict[str, Any]]:
        h, w = image.shape[:2]
        max_shift = float(params.get("max_shift", 0.05))

        # Random corner perturbations
        dx1 = float(rng.uniform(-max_shift, max_shift)) * w
        dy1 = float(rng.uniform(-max_shift, max_shift)) * h
        dx2 = float(rng.uniform(-max_shift, max_shift)) * w
        dy2 = float(rng.uniform(-max_shift, max_shift)) * h
        dx3 = float(rng.uniform(-max_shift, max_shift)) * w
        dy3 = float(rng.uniform(-max_shift, max_shift)) * h
        dx4 = float(rng.uniform(-max_shift, max_shift)) * w
        dy4 = float(rng.uniform(-max_shift, max_shift)) * h

        src_pts = np.array([[0, 0], [w, 0], [w, h], [0, h]], dtype=np.float32)
        dst_pts = np.array([
            [max(0, dx1), max(0, dy1)],
            [min(w, w + dx2), max(0, dy2)],
            [min(w, w + dx3), min(h, h + dy3)],
            [max(0, dx4), min(h, h + dy4)],
        ], dtype=np.float32)

        M = cv2.getPerspectiveTransform(src_pts, dst_pts)
        warped = cv2.warpPerspective(
            image, M, (w, h), borderMode=cv2.BORDER_CONSTANT, borderValue=(255, 255, 255)
        )

        applied_params = {
            "max_shift": max_shift,
            "corners": dst_pts.tolist(),
        }
        return warped, applied_params


PluginRegistry.register_degradation(PerspectiveTransformOperator)
