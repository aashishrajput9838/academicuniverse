"""
ADBG Statistics Engine — Computes dataset statistics and metrics.
"""

from __future__ import annotations

import json
from collections import Counter
from collections.abc import Sequence
from dataclasses import asdict
from pathlib import Path

import numpy as np

from adbg.core.interfaces import DatasetStatistics, SampleMetadata
from adbg.utils.hashing import sha256_string


class StatisticsEngine:
    """
    Computes statistical metrics for a generated dataset.
    """

    def compute_statistics(
        self,
        samples: Sequence[SampleMetadata],
        generation_duration_seconds: float,
        manifest_sha256: str = "",
    ) -> DatasetStatistics:
        """
        Compute dataset statistics from a sequence of SampleMetadata objects.
        """
        if not samples:
            return DatasetStatistics(
                total_documents=0,
                documents_by_type={},
                documents_by_template={},
                documents_by_quality={},
                file_size_min_bytes=0,
                file_size_max_bytes=0,
                file_size_mean_bytes=0.0,
                file_size_median_bytes=0.0,
                file_size_std_bytes=0.0,
                generation_duration_seconds=generation_duration_seconds,
                manifest_sha256=manifest_sha256,
            )

        type_counts = Counter(s.category for s in samples)
        template_counts = Counter(s.template_id for s in samples)
        quality_counts = Counter(s.quality_profile for s in samples)

        sizes = np.array([s.file_size_bytes for s in samples if s.file_size_bytes > 0], dtype=np.float64)

        if len(sizes) > 0:
            min_size = int(np.min(sizes))
            max_size = int(np.max(sizes))
            mean_size = float(np.mean(sizes))
            median_size = float(np.median(sizes))
            std_size = float(np.std(sizes))
        else:
            min_size = max_size = 0
            mean_size = median_size = std_size = 0.0

        return DatasetStatistics(
            total_documents=len(samples),
            documents_by_type=dict(type_counts),
            documents_by_template=dict(template_counts),
            documents_by_quality=dict(quality_counts),
            file_size_min_bytes=min_size,
            file_size_max_bytes=max_size,
            file_size_mean_bytes=mean_size,
            file_size_median_bytes=median_size,
            file_size_std_bytes=std_size,
            generation_duration_seconds=round(generation_duration_seconds, 3),
            manifest_sha256=manifest_sha256,
        )

    def save_statistics(
        self,
        output_path: str | Path,
        stats: DatasetStatistics,
    ) -> str:
        """Save statistics to JSON file."""
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        content = json.dumps(asdict(stats), indent=2, ensure_ascii=False)
        path.write_text(content, encoding="utf-8")
        return sha256_string(content)
