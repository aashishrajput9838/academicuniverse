"""
ADBG Core Interfaces — Abstract Base Classes and Domain Data Structures.

This module defines the contracts that all plugins, generators, degradation
operators, and template definitions must implement. It also defines the
immutable data structures used throughout the pipeline.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum, unique
from typing import Any

import numpy as np

# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

@unique
class DocumentType(Enum):
    """Supported document categories. Extensible via plugin registration."""
    CERTIFICATE = "certificate"
    MARKSHEET = "marksheet"
    STUDENT_ID = "student_id"


@unique
class QualityProfileType(Enum):
    """Built-in quality simulation profiles."""
    CLEAN_PDF = "clean_pdf"
    SCANNER_COPY = "scanner_copy"
    MOBILE_CAMERA = "mobile_camera"
    ROTATED = "rotated"


@unique
class OutputFormat(Enum):
    """Supported output file formats."""
    PDF = "pdf"
    PNG = "png"
    JPEG = "jpeg"


# ---------------------------------------------------------------------------
# Academic Domain — University, Grading, Branches, Courses
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class GradeBand:
    """A single grade boundary within a grading scheme."""
    min_marks: int
    grade: str
    grade_point: float


@dataclass(frozen=True)
class GradingScheme:
    """
    Configurable grading system for a university.
    """
    scheme_type: str  # "grade_point" | "percentage" | "letter"
    scale: float
    pass_marks: int
    bands: tuple[GradeBand, ...]


@dataclass(frozen=True)
class BranchInfo:
    """An academic branch/department within a university."""
    code: str
    name: str


@dataclass(frozen=True)
class CourseInfo:
    """A single course in the subject library."""
    course_code: str
    course_name: str
    credits: int
    branch_code: str


@dataclass(frozen=True)
class GradeResult:
    """Computed grade for a single course."""
    marks_obtained: int
    max_marks: int
    grade: str
    grade_point: float
    percentage: float


@dataclass(frozen=True)
class UniversityConfig:
    """
    Complete university configuration loaded from the catalog.
    """
    university_id: str
    name: str
    short_code: str
    address: dict[str, str]
    tagline: str
    colors: dict[str, str]
    fonts: dict[str, str]
    grading_scheme: GradingScheme
    roll_number_pattern: str
    semester_naming: str
    branches: tuple[BranchInfo, ...]
    supported_templates: tuple[str, ...]
    logo_path: str = ""


# ---------------------------------------------------------------------------
# Template Metadata and Definition
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class TemplateMetadata:
    """
    Versioned identity of a template definition.
    """
    template_id: str
    template_version: str
    author: str
    description: str
    supported_universities: tuple[str, ...]
    document_type: str


@dataclass(frozen=True)
class PageConfig:
    """Page layout configuration."""
    size: str
    orientation: str
    margins: dict[str, float]


@dataclass(frozen=True)
class TemplateDefinition:
    """
    Complete parsed template with metadata, page config, and layout elements.
    """
    metadata: TemplateMetadata
    page: PageConfig
    elements: tuple[dict[str, Any], ...]
    watermark: dict[str, Any]
    disclaimer: dict[str, Any]


@dataclass(frozen=True)
class TemplateConfig:
    """
    Legacy template configuration struct.
    """
    template_id: str
    name: str
    short_code: str
    location: str
    tagline: str
    colors: dict[str, str]
    fonts: dict[str, str]
    layout: dict[str, Any]
    watermark: dict[str, Any]


# ---------------------------------------------------------------------------
# Student and Academic Records
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class CourseMark:
    """A single course grade entry within a semester record."""
    course_code: str
    course_name: str
    credits: int
    grade: str
    grade_point: float
    marks_obtained: int
    max_marks: int


@dataclass(frozen=True)
class SemesterRecord:
    """Academic record for a single semester."""
    semester_name: str
    sgpa: float
    credits_earned: int
    course_marks: tuple[CourseMark, ...]


@dataclass(frozen=True)
class StudentProfile:
    """Complete student identity and demographic profile."""
    student_name: str
    roll_number: str
    enrollment_number: str
    degree_name: str
    branch_name: str
    batch_years: str
    father_name: str
    mother_name: str
    date_of_birth: str
    email: str
    phone: str
    address: str
    blood_group: str


# ---------------------------------------------------------------------------
# Document Data — Pipeline Core Payload
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class DocumentData:
    """
    Complete data payload for a single document generation.

    Includes schema/generator versioning, dual document IDs (id + UUID),
    multilingual locale support, and research benchmark metadata.
    """
    document_id: str
    document_uuid: str
    document_type: str
    template_id: str
    template_version: str
    university: UniversityConfig
    seed: int
    student: StudentProfile
    semester_records: tuple[SemesterRecord, ...]
    cgpa: float
    issue_date: str
    quality_profile: str
    generation_timestamp: str
    schema_version: str = "1.0.0"
    generator_version: str = "1.0.0"
    benchmark_version: str = "1.0.0"
    dataset_version: str = "1.0.0"
    experiment_id: str = "exp_default"
    locale: str = "en_IN"
    custom_data: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class GeneratedDocument:
    """
    Output of a document generator — rendered PDF bytes plus metadata.
    """
    document_id: str
    document_uuid: str
    pdf_bytes: bytes
    document_type: str
    template_id: str
    template_version: str
    university_id: str
    schema_version: str
    generator_version: str
    data: DocumentData


# ---------------------------------------------------------------------------
# Degradation and Quality
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class DegradationResult:
    """
    Output of the degradation engine — the degraded image plus exact parameters.
    """
    image: np.ndarray
    parameters: dict[str, dict[str, Any]]


@dataclass(frozen=True)
class QualityProfile:
    """
    Defines which degradation operators to apply and with what parameters.
    """
    name: str
    description: str
    operators: tuple[tuple[str, float, dict[str, Any]], ...]


# ---------------------------------------------------------------------------
# Per-Sample Metadata and Dataset-Level Structures
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class SampleMetadata:
    """Per-sample metadata written alongside each generated document."""
    document_id: str
    document_uuid: str
    category: str
    template_id: str
    template_version: str
    schema_version: str
    generator_version: str
    benchmark_version: str
    dataset_version: str
    experiment_id: str
    locale: str
    university: str
    student_name: str
    seed: int
    quality_profile: str
    generation_timestamp: str
    degradation_parameters: dict[str, dict[str, Any]]
    ground_truth_path: str
    pdf_path: str
    png_path: str
    jpeg_path: str
    checksum_sha256: str
    file_size_bytes: int


@dataclass(frozen=True)
class DatasetManifest:
    """Top-level manifest describing a complete generated dataset."""
    manifest_version: str
    generator_version: str
    benchmark_version: str
    dataset_version: str
    experiment_id: str
    generation_seed: int
    generated_timestamp: str
    total_documents: int
    formats: tuple[str, ...]
    documents: tuple[SampleMetadata, ...]


@dataclass(frozen=True)
class DatasetStatistics:
    """Computed statistics for a generated dataset."""
    total_documents: int
    documents_by_type: dict[str, int]
    documents_by_template: dict[str, int]
    documents_by_quality: dict[str, int]
    file_size_min_bytes: int
    file_size_max_bytes: int
    file_size_mean_bytes: float
    file_size_median_bytes: float
    file_size_std_bytes: float
    generation_duration_seconds: float
    manifest_sha256: str


@dataclass(frozen=True)
class GenerationConfig:
    """User-facing configuration for a generation run."""
    seed: int = 42
    count: int = 100
    output_dir: str = "./output"
    schema_version: str = "1.0.0"
    generator_version: str = "1.0.0"
    benchmark_version: str = "1.0.0"
    dataset_version: str = "1.0.0"
    experiment_id: str = "exp_default"
    locale: str = "en_IN"
    formats: tuple[str, ...] = ("pdf", "png", "jpeg")
    document_types: tuple[str, ...] = ("certificate", "marksheet", "student_id")
    document_distribution: dict[str, float] = field(default_factory=lambda: {
        "certificate": 0.33,
        "marksheet": 0.34,
        "student_id": 0.33,
    })
    quality_distribution: dict[str, float] = field(default_factory=lambda: {
        "clean_pdf": 0.40,
        "scanner_copy": 0.25,
        "mobile_camera": 0.20,
        "rotated": 0.15,
    })
    degradation_config: dict[str, Any] = field(default_factory=dict)
    template_ids: tuple[str, ...] = ()
    watermark_text: str = "SYNTHETIC RESEARCH DATASET"


@dataclass
class DatasetResult:
    """Return value from a complete pipeline run."""
    output_dir: str
    total_documents: int
    manifest: DatasetManifest | None = None
    statistics: DatasetStatistics | None = None
    document_ids: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    generation_duration_seconds: float = 0.0


# ---------------------------------------------------------------------------
# Abstract Base Classes — Plugin Contracts
# ---------------------------------------------------------------------------

class DocumentGenerator(ABC):
    """
    Plugin interface for document type generators.
    """

    @abstractmethod
    def document_type(self) -> str:
        ...

    @abstractmethod
    def generate(
        self, data: DocumentData, template: TemplateDefinition
    ) -> GeneratedDocument:
        ...

    @abstractmethod
    def build_render_context(self, data: DocumentData) -> dict[str, Any]:
        ...


class DegradationOperator(ABC):
    """
    Plugin interface for individual image degradation operations.
    """

    @abstractmethod
    def name(self) -> str:
        ...

    @abstractmethod
    def apply(
        self,
        image: np.ndarray,
        params: dict[str, Any],
        rng: np.random.Generator,
    ) -> tuple[np.ndarray, dict[str, Any]]:
        ...
