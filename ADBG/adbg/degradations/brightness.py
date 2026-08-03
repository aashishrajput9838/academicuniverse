"""
ADBG Brightness & Contrast Operators.
"""

from __future__ import annotations

from typing import Any

import cv2
import numpy as np

from adbg.core.interfaces import DegradationOperator
from adbg.core.plugin_registry import PluginRegistry


class BrightnessOperator(DegradationOperator):
    """Adjusts image brightness."""

    def name(self) -> str:
        return "brightness"

    def apply(
        self,
        image: np.ndarray,
        params: dict[str, Any],
        rng: np.random.Generator,
    ) -> tuple[np.ndarray, dict[str, Any]]:
        range_val = params.get("range", [0.75, 1.25])
        factor = float(rng.uniform(range_val[0], range_val[1]))

        result = cv2.convertScaleAbs(image, alpha=factor, beta=0)
        return result, {"brightness_factor": round(factor, 3)}


class ContrastOperator(DegradationOperator):
    """Adjusts image contrast around mid-gray level."""

    def name(self) -> str:
        return "contrast"

    def apply(
        self,
        image: np.ndarray,
        params: dict[str, Any],
        rng: np.random.Generator,
    ) -> tuple[np.ndarray, dict[str, Any]]:
        range_val = params.get("range", [0.7, 1.3])
        factor = float(rng.uniform(range_val[0], range_val[1]))

        # Contrast formula: output = factor * (input - 128) + 128
        img_float = image.astype(np.float32)
        adjusted = factor * (img_float - 128.0) + 128.0
        result = np.clip(adjusted, 0, 255).astype(np.uint8)

        return result, {"contrast_factor": round(factor, 3)}


PluginRegistry.register_degradation(BrightnessOperator)
PluginRegistry.register_degradation(ContrastOperator)
