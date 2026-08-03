"""
ADBG Gaussian, Motion, and Defocus Blur Operators.
"""

from __future__ import annotations

from typing import Any

import cv2
import numpy as np

from adbg.core.interfaces import DegradationOperator
from adbg.core.plugin_registry import PluginRegistry


class GaussianBlurOperator(DegradationOperator):
    """Applies Gaussian spatial blurring."""

    def name(self) -> str:
        return "gaussian_blur"

    def apply(
        self,
        image: np.ndarray,
        params: dict[str, Any],
        rng: np.random.Generator,
    ) -> tuple[np.ndarray, dict[str, Any]]:
        max_sigma = float(params.get("max_sigma", 2.0))
        sigma = float(rng.uniform(0.5, max_sigma))

        kernel_size = int(round(sigma * 3)) * 2 + 1
        blurred = cv2.GaussianBlur(image, (kernel_size, kernel_size), sigmaX=sigma)

        return blurred, {"sigma": round(sigma, 3), "kernel_size": kernel_size}


class MotionBlurOperator(DegradationOperator):
    """Simulates linear directional motion blur."""

    def name(self) -> str:
        return "motion_blur"

    def apply(
        self,
        image: np.ndarray,
        params: dict[str, Any],
        rng: np.random.Generator,
    ) -> tuple[np.ndarray, dict[str, Any]]:
        max_kernel = int(params.get("max_kernel", 9))
        kernel_size = int(rng.integers(3, max_kernel + 1))
        if kernel_size % 2 == 0:
            kernel_size += 1

        angle = float(rng.uniform(0, 180))
        M = cv2.getRotationMatrix2D((kernel_size / 2.0, kernel_size / 2.0), angle, 1.0)
        kernel_base = np.zeros((kernel_size, kernel_size), dtype=np.float32)
        kernel_base[int((kernel_size - 1) / 2), :] = 1.0
        kernel_rot = cv2.warpAffine(kernel_base, M, (kernel_size, kernel_size))
        kernel_norm = kernel_rot / np.sum(kernel_rot)

        blurred = cv2.filter2D(image, -1, kernel_norm)

        return blurred, {"kernel_size": kernel_size, "angle_degrees": round(angle, 2)}


class DefocusBlurOperator(DegradationOperator):
    """Simulates optical defocus blur using disk kernel."""

    def name(self) -> str:
        return "defocus_blur"

    def apply(
        self,
        image: np.ndarray,
        params: dict[str, Any],
        rng: np.random.Generator,
    ) -> tuple[np.ndarray, dict[str, Any]]:
        max_radius = int(params.get("max_radius", 5))
        radius = int(rng.integers(1, max_radius + 1))
        size = 2 * radius + 1

        y, x = np.ogrid[-radius:radius + 1, -radius:radius + 1]
        mask = x**2 + y**2 <= radius**2
        kernel = np.zeros((size, size), dtype=np.float32)
        kernel[mask] = 1.0
        kernel /= kernel.sum()

        blurred = cv2.filter2D(image, -1, kernel)

        return blurred, {"radius": radius}


PluginRegistry.register_degradation(GaussianBlurOperator)
PluginRegistry.register_degradation(MotionBlurOperator)
PluginRegistry.register_degradation(DefocusBlurOperator)
