"""
ADBG JPEG Compression & Color Shift Operators.
"""

from __future__ import annotations

from typing import Any

import cv2
import numpy as np

from adbg.core.interfaces import DegradationOperator
from adbg.core.plugin_registry import PluginRegistry


class JpegCompressionOperator(DegradationOperator):
    """Simulates JPEG compression artifacts."""

    def name(self) -> str:
        return "jpeg_compression"

    def apply(
        self,
        image: np.ndarray,
        params: dict[str, Any],
        rng: np.random.Generator,
    ) -> tuple[np.ndarray, dict[str, Any]]:
        min_quality = int(params.get("min_quality", 40))
        quality = int(rng.integers(min_quality, 95))

        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
        success, encimg = cv2.imencode(".jpg", image, encode_param)
        if not success or encimg is None:
            return image.copy(), {"quality": quality}
        decimg = cv2.imdecode(encimg, cv2.IMREAD_COLOR)
        if decimg is None:
            return image.copy(), {"quality": quality}

        return decimg, {"quality": quality}


class ColorShiftOperator(DegradationOperator):
    """Simulates color temperature / White Balance shifts."""

    def name(self) -> str:
        return "color_shift"

    def apply(
        self,
        image: np.ndarray,
        params: dict[str, Any],
        rng: np.random.Generator,
    ) -> tuple[np.ndarray, dict[str, Any]]:
        max_delta = int(params.get("max_delta", 20))
        delta_b = int(rng.integers(-max_delta, max_delta))
        delta_g = int(rng.integers(-max_delta, max_delta))
        delta_r = int(rng.integers(-max_delta, max_delta))

        result = image.astype(np.int16)
        result[:, :, 0] += delta_b  # B
        result[:, :, 1] += delta_g  # G
        result[:, :, 2] += delta_r  # R

        result = np.clip(result, 0, 255).astype(np.uint8)

        return result, {"delta_b": delta_b, "delta_g": delta_g, "delta_r": delta_r}


PluginRegistry.register_degradation(JpegCompressionOperator)
PluginRegistry.register_degradation(ColorShiftOperator)
