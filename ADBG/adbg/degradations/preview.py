"""
ADBG Degradation Preview & Contact Sheet Generator.

Generates step-by-step degradation preview strips and multi-profile contact sheets.
Includes SHA-256 pixel hashing for visual regression tracking.
"""

from __future__ import annotations

import cv2
import numpy as np

from adbg.core.interfaces import QualityProfile
from adbg.core.plugin_registry import PluginRegistry
from adbg.core.seed_manager import SeedManager
from adbg.degradations.profiles import QualityProfileRegistry
from adbg.utils.hashing import sha256_bytes


def compute_image_sha256(image: np.ndarray) -> str:
    """Compute deterministic SHA-256 hash of raw image array bytes."""
    return sha256_bytes(image.tobytes())


class DegradationPreviewGenerator:
    """
    Renders step-by-step degradation visual preview strips showing the effect
    of each operator in a pipeline.
    """

    def generate_step_by_step_preview(
        self,
        image: np.ndarray,
        profile_or_name: str | QualityProfile,
        seed: SeedManager,
    ) -> tuple[np.ndarray, list[dict[str, str]]]:
        """
        Apply operators step by step, returning a horizontal composite preview strip
        and step metadata (step index, operator name, SHA-256 hash).

        Returns:
            Tuple of (composite_preview_image, list_of_step_metadata_dicts).
        """
        if isinstance(profile_or_name, str):
            profile = QualityProfileRegistry.get_profile(profile_or_name)
        else:
            profile = profile_or_name

        steps: list[np.ndarray] = [image.copy()]
        metadata: list[dict[str, str]] = [{
            "step": "0",
            "operator": "original",
            "sha256": compute_image_sha256(image),
        }]

        current = image.copy()
        step_counter = 1

        for op_name, probability, params in profile.operators:
            if seed.random_bool(probability):
                op = PluginRegistry.get_degradation(op_name)
                current, _ = op.apply(current, params, seed.child().rng)
                steps.append(current.copy())
                metadata.append({
                    "step": str(step_counter),
                    "operator": op_name,
                    "sha256": compute_image_sha256(current),
                })
                step_counter += 1

        # Resize steps to thumbnails for horizontal strip
        h, w = image.shape[:2]
        target_h = 300
        target_w = int(w * (target_h / float(h)))

        resized_steps = []
        for idx, img in enumerate(steps):
            thumb = cv2.resize(img, (target_w, target_h), interpolation=cv2.INTER_AREA)
            # Add label bar above image
            header = np.full((30, target_w, 3), 240, dtype=np.uint8)
            label = metadata[idx]["operator"]
            cv2.putText(header, label[:20], (10, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
            framed = np.vstack([header, thumb])
            resized_steps.append(framed)

        # Concatenate horizontally
        composite = np.hstack(resized_steps)
        return composite, metadata


class ContactSheetGenerator:
    """
    Renders multi-panel contact sheets comparing all quality profiles
    side-by-side for a single document specimen.
    """

    def generate_contact_sheet(
        self,
        image: np.ndarray,
        seed: SeedManager,
        profiles: list[str] | None = None,
    ) -> tuple[np.ndarray, dict[str, str]]:
        """
        Generate a multi-panel comparison grid across profiles.

        Returns:
            Tuple of (contact_sheet_image, dict_mapping_profile_to_sha256).
        """
        if profiles is None:
            profiles = QualityProfileRegistry.list_profiles()

        h, w = image.shape[:2]
        target_h = 400
        target_w = int(w * (target_h / float(h)))

        panels = []
        hashes: dict[str, str] = {}

        from adbg.degradations.engine import DegradationEngine
        engine = DegradationEngine()

        for prof_name in profiles:
            res = engine.apply_degradation(image, prof_name, seed.child())
            img_hash = compute_image_sha256(res.image)
            hashes[prof_name] = img_hash

            thumb = cv2.resize(res.image, (target_w, target_h), interpolation=cv2.INTER_AREA)
            header = np.full((35, target_w, 3), 30, dtype=np.uint8)
            cv2.putText(
                header,
                f"Profile: {prof_name}",
                (10, 22),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (255, 255, 255),
                1,
                cv2.LINE_AA,
            )
            panel = np.vstack([header, thumb])
            panels.append(panel)

        # Arrange in 2x2 grid if 4 profiles, or single row
        if len(panels) == 4:
            row1 = np.hstack([panels[0], panels[1]])
            row2 = np.hstack([panels[2], panels[3]])
            grid = np.vstack([row1, row2])
        else:
            grid = np.hstack(panels)

        return grid, hashes
