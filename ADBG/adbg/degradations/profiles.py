"""
ADBG Quality Profiles — Predefined and YAML-driven degradation pipelines.

Profiles define an ordered sequence of (operator_name, trigger_probability, params_dict)
simulating physical capture environments:
    - clean_pdf: Zero degradation (identity)
    - scanner_copy: Rotation, contrast, Gaussian blur, Gaussian noise, JPEG compression
    - mobile_camera: Perspective warp, rotation, lens distortion, gradient shadow, motion blur, color shift, JPEG compression
    - rotated: Pure rotation & perspective tilt
"""

from __future__ import annotations

from typing import Any

from adbg.core.interfaces import QualityProfile

_BUILTIN_PROFILES: dict[str, QualityProfile] = {
    "clean": QualityProfile(
        name="clean",
        description="Clean digital PDF with zero degradation.",
        operators=(),
    ),

    "clean_pdf": QualityProfile(
        name="clean_pdf",
        description="Clean digital PDF with zero degradation.",
        operators=(),
    ),

    "scanner_copy": QualityProfile(
        name="scanner_copy",
        description="Simulates document scanner capture with slight skew, contrast change, and compression.",
        operators=(
            ("skew", 0.7, {"max_degrees": 2.0}),
            ("contrast", 0.8, {"range": [0.85, 1.2]}),
            ("gaussian_blur", 0.5, {"max_sigma": 1.2}),
            ("gaussian_noise", 0.6, {"max_sigma": 8.0}),
            ("jpeg_compression", 0.9, {"min_quality": 60}),
        ),
    ),

    "mobile_camera": QualityProfile(
        name="mobile_camera",
        description="Simulates smartphone photo capture with perspective tilt, shadows, motion blur, and lens distortion.",
        operators=(
            ("perspective_warp", 0.85, {"max_shift": 0.06}),
            ("skew", 0.6, {"max_degrees": 4.0}),
            ("lens_distortion", 0.5, {"max_k1": 0.15}),
            ("gradient_shadow", 0.7, {"max_opacity": 0.35}),
            ("brightness", 0.8, {"range": [0.8, 1.2]}),
            ("color_shift", 0.6, {"max_delta": 15}),
            ("motion_blur", 0.4, {"max_kernel": 7}),
            ("jpeg_compression", 0.95, {"min_quality": 45}),
        ),
    ),

    "rotated_90": QualityProfile(
        name="rotated_90",
        description="Exact 90-degree clockwise page rotation for orientation evaluation.",
        operators=(
            ("rotation", 1.0, {"degrees": 90}),
        ),
    ),

    "rotated": QualityProfile(
        name="rotated",
        description="Exact 90-degree clockwise page rotation for orientation evaluation.",
        operators=(
            ("rotation", 1.0, {"degrees": 90}),
        ),
    ),
}


class QualityProfileRegistry:
    """Registry and loader for quality simulation profiles."""

    _profiles: dict[str, QualityProfile] = dict(_BUILTIN_PROFILES)

    @classmethod
    def get_profile(cls, name: str) -> QualityProfile:
        if name not in cls._profiles:
            available = ", ".join(cls.list_profiles())
            raise KeyError(f"Quality profile '{name}' not found. Available: {available}")
        return cls._profiles[name]

    @classmethod
    def list_profiles(cls) -> list[str]:
        return sorted(cls._profiles.keys())

    @classmethod
    def register_profile(cls, profile: QualityProfile) -> None:
        cls._profiles[profile.name] = profile

    @classmethod
    def from_dict(cls, name: str, description: str, raw_ops: list[dict[str, Any]]) -> QualityProfile:
        ops = []
        for item in raw_ops:
            op_name = item["name"]
            prob = float(item.get("probability", 1.0))
            params = item.get("params", {})
            ops.append((op_name, prob, params))

        profile = QualityProfile(name=name, description=description, operators=tuple(ops))
        cls.register_profile(profile)
        return profile
