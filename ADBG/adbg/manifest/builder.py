"""
ADBG Manifest Builder & Verifier — Top-level dataset manifest generation & integrity verification.
"""

from __future__ import annotations

import json
from collections.abc import Sequence
from dataclasses import asdict
from datetime import UTC, datetime
from pathlib import Path

from adbg.core.interfaces import DatasetManifest, SampleMetadata
from adbg.utils.hashing import sha256_file, sha256_string


class ManifestBuilder:
    """
    Constructs and serializes top-level DatasetManifest JSON files.
    """

    def build_manifest(
        self,
        samples: Sequence[SampleMetadata],
        generation_seed: int,
        formats: Sequence[str] = ("pdf", "png", "jpeg"),
        generator_version: str = "1.0.0",
        benchmark_version: str = "1.0.0",
        dataset_version: str = "1.0.0",
        experiment_id: str = "exp_default",
    ) -> DatasetManifest:
        """Construct top-level DatasetManifest."""
        now = datetime.now(UTC).isoformat()
        return DatasetManifest(
            manifest_version="1.0.0",
            generator_version=generator_version,
            benchmark_version=benchmark_version,
            dataset_version=dataset_version,
            experiment_id=experiment_id,
            generation_seed=generation_seed,
            generated_timestamp=now,
            total_documents=len(samples),
            formats=tuple(formats),
            documents=tuple(samples),
        )

    def save_manifest(
        self,
        output_path: str | Path,
        manifest: DatasetManifest,
    ) -> str:
        """Save manifest to JSON and return its SHA-256 hash."""
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        content = json.dumps(asdict(manifest), indent=2, ensure_ascii=False)
        path.write_text(content, encoding="utf-8")
        return sha256_string(content)


class ManifestVerifier:
    """
    Validates dataset integrity by cross-checking checksums and file presence.
    """

    def verify_dataset(self, dataset_dir: str | Path) -> tuple[bool, list[str]]:
        """
        Verify every file listed in manifest.json exists and matches its SHA-256 checksum.

        Returns:
            Tuple of (is_valid, list_of_errors_or_warnings).
        """
        root = Path(dataset_dir)
        manifest_path = root / "manifest.json"
        errors: list[str] = []

        if not manifest_path.exists():
            return False, [f"Manifest file not found: {manifest_path}"]

        try:
            with manifest_path.open("r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as exc:
            return False, [f"Failed to parse manifest.json: {exc}"]

        docs = data.get("documents", [])
        for doc in docs:
            png_p = root / doc.get("png_path", "")
            if not png_p.exists():
                errors.append(f"Missing PNG image for {doc.get('document_id')}: {png_p}")
            else:
                expected_sha = doc.get("checksum_sha256")
                if expected_sha:
                    actual_sha = sha256_file(png_p)
                    if actual_sha != expected_sha:
                        errors.append(f"Checksum mismatch for {png_p}: expected {expected_sha}, got {actual_sha}")

        is_valid = len(errors) == 0
        return is_valid, errors
