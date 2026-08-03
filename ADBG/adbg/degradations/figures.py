"""
ADBG Research Paper Figure Generator.

Generates publication-quality benchmark comparison figures suitable for
direct inclusion in IEEE/ACM/Scopus research papers.
"""

from __future__ import annotations

import cv2
import numpy as np

from adbg.core.seed_manager import SeedManager
from adbg.degradations.preview import ContactSheetGenerator


class ResearchPaperFigureGenerator:
    """
    Generates high-resolution multi-column benchmark figures for research publications.
    """

    def generate_publication_figure(
        self,
        image: np.ndarray,
        seed: SeedManager,
        caption: str = "Figure 1: Visual comparison of synthetic academic documents under diverse CV degradation profiles.",
    ) -> np.ndarray:
        """
        Generate publication-ready 300 DPI composite figure image with title,
        quality profile labels, and figure caption bar.

        Returns:
            High-res BGR image array.
        """
        cs_gen = ContactSheetGenerator()
        contact_sheet, _ = cs_gen.generate_contact_sheet(image, seed)

        h, w = contact_sheet.shape[:2]

        # Top title banner
        top_banner = np.full((50, w, 3), 255, dtype=np.uint8)
        cv2.putText(
            top_banner,
            "ADBG v1.0 — Benchmark Visual Degradation Profiles",
            (20, 32),
            cv2.FONT_HERSHEY_DUPLEX,
            0.75,
            (26, 46, 90),
            2,
            cv2.LINE_AA,
        )

        # Bottom caption bar
        bottom_banner = np.full((60, w, 3), 250, dtype=np.uint8)
        cv2.putText(
            bottom_banner,
            caption,
            (20, 35),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (50, 50, 50),
            1,
            cv2.LINE_AA,
        )

        # Outer border
        figure = np.vstack([top_banner, contact_sheet, bottom_banner])
        cv2.rectangle(figure, (0, 0), (figure.shape[1] - 1, figure.shape[0] - 1), (200, 200, 200), 2)

        return figure
