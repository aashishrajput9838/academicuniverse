"""
ADBG Degradation Engine — CV operators and pipeline orchestrator.

Importing this package registers all 15 degradation operators with PluginRegistry.
"""

from adbg.degradations import (
    blur,
    brightness,
    compression,
    lens,
    noise,
    perspective,
    rotation,
    shadow,
)


def register_all_degradations() -> None:
    """Explicitly register all standard built-in degradation operators."""
    from adbg.core.plugin_registry import PluginRegistry

    for cls_item in [
        perspective.PerspectiveTransformOperator,
        rotation.RotationOperator,
        rotation.SkewOperator,
        lens.LensDistortionOperator,
        brightness.BrightnessOperator,
        brightness.ContrastOperator,
        shadow.GradientShadowOperator,
        blur.GaussianBlurOperator,
        blur.MotionBlurOperator,
        blur.DefocusBlurOperator,
        noise.GaussianNoiseOperator,
        noise.SaltPepperNoiseOperator,
        noise.PoissonNoiseOperator,
        noise.SpeckleNoiseOperator,
        compression.JpegCompressionOperator,
        compression.ColorShiftOperator,
    ]:
        if not PluginRegistry.is_degradation_registered(cls_item().name()):
            PluginRegistry.register_degradation(cls_item)


register_all_degradations()

__all__ = [
    "brightness",
    "blur",
    "compression",
    "lens",
    "noise",
    "perspective",
    "rotation",
    "shadow",
    "register_all_degradations",
]
