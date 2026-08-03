"""
ADBG Ground Truth Builder — Generates exact, publication-grade ground-truth JSON annotations.
"""

from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path
from typing import Any

from adbg.core.interfaces import DocumentData


class GroundTruthBuilder:
    """
    Constructs comprehensive ground-truth JSON structures for generated documents.
    """

    def build_ground_truth_dict(
        self,
        data: DocumentData,
        degradation_parameters: dict[str, dict[str, Any]],
    ) -> dict[str, Any]:
        """
        Build a serializable ground-truth dict for a single document.
        """
        student_dict = asdict(data.student)
        uni_dict = {
            "university_id": data.university.university_id,
            "name": data.university.name,
            "short_code": data.university.short_code,
            "tagline": data.university.tagline,
            "address": data.university.address,
        }

        semester_records_list = []
        for sem in data.semester_records:
            sem_dict = {
                "semester_name": sem.semester_name,
                "sgpa": sem.sgpa,
                "credits_earned": sem.credits_earned,
                "course_marks": [asdict(cm) for cm in sem.course_marks],
            }
            semester_records_list.append(sem_dict)

        return {
            "schema_version": data.schema_version,
            "generator_version": data.generator_version,
            "benchmark_version": data.benchmark_version,
            "dataset_version": data.dataset_version,
            "experiment_id": data.experiment_id,
            "document_id": data.document_id,
            "document_uuid": data.document_uuid,
            "document_type": data.document_type,
            "template_id": data.template_id,
            "template_version": data.template_version,
            "locale": data.locale,
            "seed": data.seed,
            "quality_profile": data.quality_profile,
            "generation_timestamp": data.generation_timestamp,
            "university": uni_dict,
            "student": student_dict,
            "semester_records": semester_records_list,
            "cgpa": data.cgpa,
            "issue_date": data.issue_date,
            "degradation_parameters": degradation_parameters,
        }

    def save_ground_truth(
        self,
        output_path: str | Path,
        gt_dict: dict[str, Any],
    ) -> None:
        """Save ground-truth dictionary to a formatted JSON file."""
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8") as f:
            json.dump(gt_dict, f, indent=2, ensure_ascii=False)
