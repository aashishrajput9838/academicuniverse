"""
ADBG Metadata Builder — Constructs per-sample metadata records.
"""

from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path
from typing import Any

from adbg.core.interfaces import DocumentData, SampleMetadata
from adbg.utils.hashing import sha256_file


class SampleMetadataBuilder:
    """
    Constructs per-sample metadata records and writes JSON metadata files.
    """

    def build_metadata(
        self,
        data: DocumentData,
        pdf_path: str,
        png_path: str,
        jpeg_path: str,
        gt_path: str,
        degradation_parameters: dict[str, dict[str, Any]],
        base_dir: str | Path | None = None,
    ) -> SampleMetadata:
        """
        Build SampleMetadata instance for a generated document sample.
        """
        resolved_png = Path(base_dir) / png_path if base_dir else Path(png_path)
        checksum = sha256_file(resolved_png) if resolved_png.exists() else ""
        file_size = resolved_png.stat().st_size if resolved_png.exists() else 0

        return SampleMetadata(
            document_id=data.document_id,
            document_uuid=data.document_uuid,
            category=data.document_type,
            template_id=data.template_id,
            template_version=data.template_version,
            schema_version=data.schema_version,
            generator_version=data.generator_version,
            benchmark_version=data.benchmark_version,
            dataset_version=data.dataset_version,
            experiment_id=data.experiment_id,
            locale=data.locale,
            university=data.university.name,
            student_name=data.student.student_name,
            seed=data.seed,
            quality_profile=data.quality_profile,
            generation_timestamp=data.generation_timestamp,
            degradation_parameters=degradation_parameters,
            ground_truth_path=gt_path,
            pdf_path=pdf_path,
            png_path=png_path,
            jpeg_path=jpeg_path,
            checksum_sha256=checksum,
            file_size_bytes=file_size,
        )

    def save_sample_metadata(
        self,
        output_path: str | Path,
        metadata: SampleMetadata,
    ) -> None:
        """Save sample metadata to JSON file."""
        path = Path(output_path)
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
        except FileExistsError:
            pass
        with path.open("w", encoding="utf-8") as f:
            json.dump(asdict(metadata), f, indent=2, ensure_ascii=False)
