"""
ADBG Rotation Operator.
"""

from __future__ import annotations

from typing import Any

import cv2
import numpy as np

from adbg.core.interfaces import DegradationOperator
from adbg.core.plugin_registry import PluginRegistry


class RotationOperator(DegradationOperator):
    """Rotates page by exact 90-degree increments (default 90° clockwise), preserving full page content."""

    def name(self) -> str:
        return "rotation"

    def apply(
        self,
        image: np.ndarray,
        params: dict[str, Any],
        rng: np.random.Generator,
    ) -> tuple[np.ndarray, dict[str, Any]]:
        degrees = int(params.get("degrees", 90))

        if degrees == 90:
            rotated = cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
        elif degrees == 180:
            rotated = cv2.rotate(image, cv2.ROTATE_180)
        elif degrees == 270:
            rotated = cv2.rotate(image, cv2.ROTATE_90_COUNTERCLOCKWISE)
        else:
            rotated = cv2.rotate(image, cv2.ROTATE_90_CLOCKWISE)
            degrees = 90

        return rotated, {"angle_degrees": degrees, "mode": "90_degree_page_rotation"}


class SkewOperator(DegradationOperator):
    """Applies a small-angle skew (±1° to ±5°) to simulate scanner/camera misalignment."""

    def name(self) -> str:
        return "skew"

    def apply(
        self,
        image: np.ndarray,
        params: dict[str, Any],
        rng: np.random.Generator,
    ) -> tuple[np.ndarray, dict[str, Any]]:
        h, w = image.shape[:2]
        max_angle = float(params.get("max_degrees", 3.0))
        angle = float(rng.uniform(-max_angle, max_angle))

        center = (w / 2.0, h / 2.0)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        skewed = cv2.warpAffine(
            image, M, (w, h), borderMode=cv2.BORDER_CONSTANT, borderValue=(255, 255, 255)
        )

        return skewed, {"skew_degrees": round(angle, 3)}


PluginRegistry.register_degradation(RotationOperator)
PluginRegistry.register_degradation(SkewOperator)

