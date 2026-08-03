"""
ADBG Data Providers — Abstract interfaces for all data generation.

The IDataProvider hierarchy ensures that Faker (or any other data source)
is an implementation detail, not an architectural dependency. Every provider
receives a SeedManager for deterministic output.

Provider Hierarchy:
    IDataProvider (base)
    ├── INameProvider        — Student/parent name generation
    ├── IUniversityProvider  — University catalog access
    ├── ICourseProvider      — Subject library access
    ├── IRollNumberProvider  — Pattern-based roll number generation
    ├── IGradeProvider       — Realistic grade/GPA computation
    └── IDateProvider        — Academic date generation

Future Extension:
    Replace any provider with a real-dataset-backed implementation or
    a locale-specific provider (Hindi, Tamil, etc.) without changing
    the fabricator or any downstream code.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from adbg.core.interfaces import (
    BranchInfo,
    CourseInfo,
    GradeResult,
    GradingScheme,
    SemesterRecord,
    UniversityConfig,
)
from adbg.core.seed_manager import SeedManager


class IDataProvider(ABC):
    """Base interface for all data providers."""

    @abstractmethod
    def initialize(self, seed: SeedManager) -> None:
        """
        Initialize the provider with a deterministic seed.

        Called once before any generation methods are invoked.
        Providers must store the seed and use it for all random decisions.

        Args:
            seed: A SeedManager instance for deterministic randomness.
        """
        ...


class INameProvider(IDataProvider):
    """Generates realistic human names."""

    @abstractmethod
    def generate_first_name(self) -> str:
        """Generate a single first name."""
        ...

    @abstractmethod
    def generate_last_name(self) -> str:
        """Generate a single last name."""
        ...

    @abstractmethod
    def generate_full_name(self) -> str:
        """Generate a full name (first + last)."""
        ...

    @abstractmethod
    def generate_father_name(self, last_name: str) -> str:
        """Generate a father's name with the given surname."""
        ...

    @abstractmethod
    def generate_mother_name(self, last_name: str) -> str:
        """Generate a mother's name with the given surname."""
        ...


class IUniversityProvider(IDataProvider):
    """Provides access to the university catalog."""

    @abstractmethod
    def get_university(self, university_id: str) -> UniversityConfig:
        """Retrieve a specific university by ID."""
        ...

    @abstractmethod
    def get_random_university(self) -> UniversityConfig:
        """Select a random university from the catalog."""
        ...

    @abstractmethod
    def list_university_ids(self) -> list[str]:
        """List all available university IDs."""
        ...

    @abstractmethod
    def get_random_branch(self, university: UniversityConfig) -> BranchInfo:
        """Select a random branch from a university's offerings."""
        ...


class ICourseProvider(IDataProvider):
    """Provides access to the subject library."""

    @abstractmethod
    def get_courses(self, branch_code: str, count: int) -> list[CourseInfo]:
        """
        Select courses for a branch.

        Args:
            branch_code: The branch identifier (e.g., "CSE").
            count: Number of courses to select.

        Returns:
            A list of CourseInfo objects.
        """
        ...

    @abstractmethod
    def list_branches(self) -> list[str]:
        """List all branch codes in the subject library."""
        ...


class IRollNumberProvider(IDataProvider):
    """Generates pattern-based roll numbers."""

    @abstractmethod
    def generate(
        self,
        pattern: str,
        year: int,
        branch_code: str,
        sequence: int,
    ) -> str:
        """
        Generate a roll number from a pattern.

        Pattern placeholders:
            {year}          — 4-digit year (e.g., 2024)
            {year_short}    — 2-digit year (e.g., 24)
            {branch_code}   — Branch code (e.g., CSE)
            {sequence:NNNd} — Zero-padded sequence number

        Args:
            pattern: The roll number pattern string.
            year: Academic year.
            branch_code: Branch code string.
            sequence: Sequence number for this student.

        Returns:
            The formatted roll number string.
        """
        ...

    @abstractmethod
    def generate_enrollment(
        self,
        pattern: str,
        year: int,
        sequence: int,
    ) -> str:
        """Generate an enrollment number from a pattern."""
        ...


class IGradeProvider(IDataProvider):
    """Generates realistic academic grades and computes GPAs."""

    @abstractmethod
    def generate_marks(self, min_marks: int, max_marks: int) -> int:
        """Generate a realistic marks value within the range."""
        ...

    @abstractmethod
    def marks_to_grade(self, marks: int, scheme: GradingScheme) -> GradeResult:
        """Convert marks to a grade using the given grading scheme."""
        ...

    @abstractmethod
    def generate_semester_record(
        self,
        courses: list[CourseInfo],
        semester_number: int,
        semester_naming: str,
        scheme: GradingScheme,
    ) -> SemesterRecord:
        """Generate a complete semester record with course marks and SGPA."""
        ...

    @abstractmethod
    def compute_cgpa(self, semester_records: list[SemesterRecord]) -> float:
        """Compute cumulative GPA from multiple semester records."""
        ...


class IDateProvider(IDataProvider):
    """Generates academic dates."""

    @abstractmethod
    def generate_issue_date(self, start_year: int, end_year: int) -> str:
        """Generate a document issue date in ISO 8601 format."""
        ...

    @abstractmethod
    def generate_date_of_birth(self, min_year: int, max_year: int) -> str:
        """Generate a student date of birth in ISO 8601 format."""
        ...
