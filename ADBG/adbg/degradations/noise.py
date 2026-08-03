"""
ADBG Gaussian, Salt & Pepper, Poisson, and Speckle Noise Operators.
"""

from __future__ import annotations

from typing import Any

import numpy as np

from adbg.core.interfaces import DegradationOperator
from adbg.core.plugin_registry import PluginRegistry


class GaussianNoiseOperator(DegradationOperator):
    """Adds additive Gaussian noise."""

    def name(self) -> str:
        return "gaussian_noise"

    def apply(
        self,
        image: np.ndarray,
        params: dict[str, Any],
        rng: np.random.Generator,
    ) -> tuple[np.ndarray, dict[str, Any]]:
        max_sigma = float(params.get("max_sigma", 15.0))
        sigma = float(rng.uniform(3.0, max_sigma))

        noise = rng.normal(0, sigma, image.shape).astype(np.float32)
        noisy = (image.astype(np.float32) + noise).clip(0, 255).astype(np.uint8)

        return noisy, {"sigma": round(sigma, 3)}


class SaltPepperNoiseOperator(DegradationOperator):
    """Adds impulse salt & pepper noise."""

    def name(self) -> str:
        return "salt_pepper_noise"

    def apply(
        self,
        image: np.ndarray,
        params: dict[str, Any],
        rng: np.random.Generator,
    ) -> tuple[np.ndarray, dict[str, Any]]:
        max_prob = float(params.get("max_probability", 0.02))
        prob = float(rng.uniform(0.002, max_prob))

        result = image.copy()
        mask = rng.random(image.shape[:2])

        # Salt (white pixels)
        result[mask < (prob / 2.0)] = 255
        # Pepper (black pixels)
        result[(mask >= (prob / 2.0)) & (mask < prob)] = 0

        return result, {"probability": round(prob, 4)}


class PoissonNoiseOperator(DegradationOperator):
    """Simulates photon shot noise (Poisson noise)."""

    def name(self) -> str:
        return "poisson_noise"

    def apply(
        self,
        image: np.ndarray,
        params: dict[str, Any],
        rng: np.random.Generator,
    ) -> tuple[np.ndarray, dict[str, Any]]:
        scale = float(params.get("scale", 1.0))

        img_float = image.astype(np.float32) / 255.0
        vals = len(np.unique(img_float))
        vals = 2 ** np.ceil(np.log2(vals))

        noisy = rng.poisson(img_float * vals * scale) / float(vals * scale)
        result = (noisy * 255.0).clip(0, 255).astype(np.uint8)

        return result, {"scale": scale}


class SpeckleNoiseOperator(DegradationOperator):
    """Adds multiplicative speckle noise."""

    def name(self) -> str:
        return "speckle_noise"

    def apply(
        self,
        image: np.ndarray,
        params: dict[str, Any],
        rng: np.random.Generator,
    ) -> tuple[np.ndarray, dict[str, Any]]:
        variance = float(params.get("variance", 0.05))
        var = float(rng.uniform(0.01, variance))

        noise = rng.normal(0, np.sqrt(var), image.shape).astype(np.float32)
        noisy = (image.astype(np.float32) + image.astype(np.float32) * noise).clip(0, 255).astype(np.uint8)

        return noisy, {"variance": round(var, 4)}


PluginRegistry.register_degradation(GaussianNoiseOperator)
PluginRegistry.register_degradation(SaltPepperNoiseOperator)
PluginRegistry.register_degradation(PoissonNoiseOperator)
PluginRegistry.register_degradation(SpeckleNoiseOperator)
