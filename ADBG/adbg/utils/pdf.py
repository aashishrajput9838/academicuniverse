"""
ADBG PDF Utilities — Convert rendered PDF bytes to NumPy image arrays.
"""

from __future__ import annotations

import cv2
import numpy as np
import pypdfium2 as pdfium


def pdf_bytes_to_image(pdf_bytes: bytes, page_index: int = 0, dpi: int = 300) -> np.ndarray:
    """
    Rasterize a page from PDF bytes to a NumPy BGR image array (uint8).

    Args:
        pdf_bytes: Raw PDF bytes.
        page_index: 0-based page index. Default 0.
        dpi: Target resolution in dots per inch. Default 300.

    Returns:
        NumPy uint8 array of shape (H, W, 3) in BGR format (OpenCV compatible).
    """
    pdf = pdfium.PdfDocument(pdf_bytes)
    page = pdf[page_index]

    # Render page to bitmap at specified DPI (72 is default scale 1.0)
    scale = dpi / 72.0
    bitmap = page.render(scale=scale)
    pil_image = bitmap.to_pil()

    # Convert PIL RGB image to NumPy BGR image for OpenCV
    rgb_arr = np.array(pil_image)
    if rgb_arr.ndim == 2:  # Grayscale
        bgr_arr = cv2.cvtColor(rgb_arr, cv2.COLOR_GRAY2BGR)
    elif rgb_arr.shape[2] == 4:  # RGBA
        bgr_arr = cv2.cvtColor(rgb_arr, cv2.COLOR_RGBA2BGR)
    else:  # RGB
        bgr_arr = rgb_arr[:, :, ::-1].copy()

    return bgr_arr
