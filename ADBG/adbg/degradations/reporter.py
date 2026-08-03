"""
ADBG Degradation Reporter — Structured degradation audit reporting in JSON & Markdown.
"""

from __future__ import annotations

import json
from typing import Any


class DegradationReporter:
    """
    Generates audit reports in JSON and Markdown detailing every applied CV operator.
    """

    def generate_json_report(
        self,
        document_id: str,
        quality_profile: str,
        seed: int,
        parameters: dict[str, dict[str, Any]],
        image_sha256: str,
    ) -> str:
        """Export structured JSON report string."""
        report_dict = {
            "document_id": document_id,
            "quality_profile": quality_profile,
            "seed": seed,
            "image_sha256": image_sha256,
            "applied_operators_count": len(parameters),
            "degradation_parameters": parameters,
        }
        return json.dumps(report_dict, indent=2)

    def generate_markdown_report(
        self,
        document_id: str,
        quality_profile: str,
        seed: int,
        parameters: dict[str, dict[str, Any]],
        image_sha256: str,
    ) -> str:
        """Export human-readable Markdown report string."""
        lines = [
            f"# Degradation Audit Report — {document_id}",
            "",
            f"- **Quality Profile:** `{quality_profile}`",
            f"- **Seed:** `{seed}`",
            f"- **SHA-256 Checksum:** `{image_sha256}`",
            f"- **Applied Operators Count:** `{len(parameters)}`",
            "",
            "## Applied Operations & Parameters",
            "",
        ]

        if not parameters:
            lines.append("_No degradation operators were applied (clean digital document)._")
        else:
            lines.append("| Operator Name | Parameter Key | Applied Value |")
            lines.append("|:---|:---|:---|")
            for op_name, params in parameters.items():
                for k, v in params.items():
                    lines.append(f"| `{op_name}` | `{k}` | `{v}` |")

        return "\n".join(lines)
